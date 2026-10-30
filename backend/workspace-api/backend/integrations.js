import express from 'express';
import multer from 'multer';
import { createDocumentReader } from './document-reader.js';
import { parse } from 'csv-parse/sync';
import { createHash } from 'node:crypto';
import { assistantReply } from './assistant.js';
import { HttpError, asyncRoute, text, number, date, money, id, transaction } from './lib/validation.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 } });
function ensureFile(req) { if (!req.file?.buffer.length) throw new HttpError(400, 'Vyberte súbor.'); return req.file; }
function decimal(value) {
  const raw = String(value ?? '').replace(/[\s\u00a0]/g, '');
  if (raw.includes(',') && raw.includes('.')) return Number(raw.lastIndexOf(',') > raw.lastIndexOf('.') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, ''));
  return Number(raw.replace(',', '.'));
}
function bankDate(value) {
  const raw = String(value || '').trim(), local = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return date(local ? `${local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}` : raw, 'Dátum transakcie', true);
}

export function createIntegrationsRouter(db, { ai, groq, documents } = {}) {
  const router = express.Router();
  const textReader=createDocumentReader();
  router.post('/imports/invoice',upload.single('file'),asyncRoute(async(req,res)=>res.status(202).json(documents.submit(req.user,ensureFile(req)))));
  router.get('/imports/invoice/:jobId',asyncRoute(async(req,res)=>res.json(documents.get(req.user,req.params.jobId))));
  router.delete('/imports/invoice/:jobId',asyncRoute(async(req,res)=>res.json(documents.cancel(req.user,req.params.jobId))));
  const pdfText = async (req, res) => {
    const file = ensureFile(req);
    if (!file.buffer.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new HttpError(400, 'Súbor musí byť platné PDF.');
    let result;
    try { result = await textReader.read(file.buffer,{allowOcr:false}); }
    catch(error) {
      if(error.status===422)throw new HttpError(422,'PDF obsahuje iba obrázky. Otvorte Načítať doklad, kde je dostupné lokálne OCR.');
      throw error;
    }
    res.json({text:result.text,pages:result.pages,pagesRead:result.pagesRead,truncated:result.truncated,warning:result.truncated?result.warnings.join(' '):'',extracted:false,message:'Text bol načítaný. Skontrolujte a doplňte údaje faktúry pred uložením.'});
  };
  router.post('/upload/pdf', upload.single('file'), asyncRoute(pdfText));
  router.post('/ai/parse-faktura', upload.single('file'), asyncRoute(pdfText));
  router.post('/ocr', upload.single('file'), asyncRoute(pdfText));
  router.post('/upload/bank', upload.single('file'), asyncRoute(async (req, res) => {
    const file = ensureFile(req);
    if (!/\.csv$/i.test(file.originalname)) throw new HttpError(400, 'Vyberte výpis vo formáte CSV.');
    const source = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const header = source.split(/\r?\n/)[0] || '', delimiter = header.includes(';') ? ';' : header.includes('\t') ? '\t' : ',';
    let rows;
    try { rows = parse(source, { columns: headers => headers.map(value => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')), delimiter, skip_empty_lines: true, trim: true, bom: true, max_record_size: 20000 }); }
    catch { throw new HttpError(400, 'Neplatné CSV. Použite stĺpce date, amount, description a voliteľne vs.'); }
    if (!rows.length || rows.length > 1000) throw new HttpError(400, 'CSV musí obsahovať 1 až 1000 transakcií.');
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    const records = rows.map((row, index) => {
      try {
        const amount = money(decimal(row.amount ?? row.suma ?? row.iznos), 'Suma', { min: -1e9 });
        if (!amount) throw new Error('zero');
        return { transaction_date: bankDate(row.date ?? row.datum), amount, description: text(row.description ?? row.popis ?? row.opis, 'Popis', { required: true, max: 2000 }), variable_symbol: text(row.vs ?? row.variable_symbol, 'Variabilný symbol', { max: 100 }), currency:text(row.currency??row.mena,'Mena',{max:3}).toUpperCase(), import_ref: fileHash+':'+index };
      } catch { throw new HttpError(400, `Skontrolujte riadok ${index + 2} v CSV. Dátum, suma a popis sú povinné.`); }
    });
    res.json({ records, preview: true });
  }));
  router.post('/bank/import', asyncRoute(async (req, res) => {
    const records = req.body?.records;
    if (!Array.isArray(records) || !records.length || records.length > 1000) throw new HttpError(400, 'Vyberte 1 až 1000 transakcií.');
    const accountId = req.body.account_id ? id(req.body.account_id) : null;
    const result = await transaction(db, async client => {
      await client.query('SELECT pg_advisory_xact_lock(61002,$1::integer)', [req.user.companyId]);
      const account = accountId ? (await client.query('SELECT currency FROM bank_accounts WHERE id=$1 AND company_id=$2', [accountId,req.user.companyId])).rows[0] : null;
      if (accountId && !account) throw new HttpError(404, 'Účet neexistuje.');
      let saved = 0, skipped = 0;
      for (const raw of records) {
        if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new HttpError(400,'Neplatný riadok importu.');
        const day = date(raw.transaction_date, 'Dátum', true), amount = money(raw.amount, 'Suma', { min: -1e9 });
        if (!amount) throw new HttpError(400, 'Suma musí byť odlišná od nuly.');
        const description = text(raw.description, 'Popis', { required: true, max: 2000 }), symbol = text(raw.variable_symbol, 'VS', { max: 100 });
        if(raw.currency&&raw.currency!==(account?.currency||'EUR'))throw new HttpError(400,'Mena v CSV nesúhlasí s vybraným účtom. Vyberte účet so správnou menou.');
        const importRef=text(raw.import_ref,'Odkaz importu',{required:true,max:80});
        if(!/^[a-f0-9]{64}:\d{1,4}$/.test(importRef))throw new HttpError(400,'Najprv načítajte náhľad CSV súboru.');
        const duplicate = await client.query(`SELECT id FROM bank_transactions WHERE company_id=$1 AND account_id IS NOT DISTINCT FROM $2 AND import_ref=$3`, [req.user.companyId, accountId, importRef]);
        if (duplicate.rowCount) { skipped++; continue; }
        await client.query(`INSERT INTO bank_transactions(company_id,account_id,transaction_date,amount,description,variable_symbol,currency,import_ref) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [req.user.companyId,accountId,day,amount,description,symbol,account?.currency || 'EUR',importRef]);
        saved++;
      }
      return { saved, skipped };
    });
    res.status(201).json(result);
  }));
  router.post('/ai/invoice-draft',asyncRoute(async(req,res)=>{
    if(!['groq','openai'].includes(req.body.provider))throw new HttpError(400,'Vyberte AI službu pre prípravu faktúry.');
    const service=req.body.provider==='groq'?groq:ai;
    res.set('Cache-Control','no-store').json(await service.invoiceDraft(req.user,{message:req.body.message}));
  }));
  router.post('/ai/command', asyncRoute(async (req, res) => {
    const message=text(req.body?.message ?? req.body?.command ?? req.body?.text, 'Správa', { required: true, max: 4000 });
    if(['openai','groq'].includes(req.body?.mode))return res.json(await (req.body.mode==='groq'?groq:ai).chat(req.user,{...req.body,message}));
    res.json(assistantReply(message,req.body?.context));
  }));
  for(const [name,service]of Object.entries({openai:ai,groq})){
    router.get('/settings/'+name,asyncRoute(async(req,res)=>res.json(await service.status(req.user))));
    router.put('/settings/'+name,asyncRoute(async(req,res)=>res.json(await service.configure(req.user,req.body?.apiKey))));
    router.delete('/settings/'+name,asyncRoute(async(req,res)=>res.json(await service.remove(req.user))));
  }
  router.post('/voice-to-text', (req, res) => res.status(503).json({ error: 'Hlasový prepis zatiaľ nie je pripojený. Použite textové zadávanie.' }));
  return router;
}
