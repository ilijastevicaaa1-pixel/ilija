import express from 'express';
import { normalizeState } from './lib/state-validation.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { invoicePdf } from './lib/invoice-pdf.js';
import { invoiceBillingInput } from './lib/company-profile.js';
import { HttpError, text, number, money, date, id, asyncRoute, transaction, invoiceInput } from './lib/validation.js';

const tables = { input: 'input_invoices', output: 'output_invoices' };
const docKinds = ['contracts', 'internal-records', 'offers', 'travel-orders', 'salaries'];
const secret = () => process.env.JWT_SECRET || process.env.dev_secret_key;
const tableFor = type => { if (!tables[type]) throw new HttpError(404, 'Neznámy druh faktúry.'); return tables[type]; };
const accountData = user => ({ id: user.id, email: user.email, role: user.role, tenantId: user.company_id });
const session = user => {
  if (!secret()) throw new HttpError(503, 'Prihlásenie nie je nastavené na serveri.');
  const account = accountData(user);
  return { ...account, user: account, token: jwt.sign(account, secret(), { expiresIn: '7d' }) };
};

export function createAuth(db) {
  return asyncRoute(async (req, res, next) => {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ') || !secret()) throw new HttpError(401, 'Prihláste sa do aplikácie.');
    let decoded;
    try { decoded = jwt.verify(header.slice(7), secret(), { algorithms: ['HS256'] }); }
    catch { throw new HttpError(401, 'Prihlásenie vypršalo. Prihláste sa znova.'); }
    if (!Number.isSafeInteger(Number(decoded.id)) || Number(decoded.id) < 1) throw new HttpError(401, 'Neplatné prihlásenie.');
    const { rows } = await db.query('SELECT id,email,role,company_id FROM users WHERE id=$1', [decoded.id]);
    if (!rows[0]) throw new HttpError(401, 'Prihláste sa znova.');
    // Scope comes from the current account, never from caller-supplied company IDs.
    req.user = { ...accountData(rows[0]), companyId: rows[0].company_id };
    next();
  });
}

export async function moveStock(client, companyId, value, invoice = {}) {
  const itemId = id(value.item_id);
  if (!['in', 'out'].includes(value.direction)) throw new HttpError(400, 'Vyberte príjem alebo výdaj.');
  const quantity = number(value.quantity, 'Množstvo', { min: 0.001, max: 1e6 });
  if (Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.00001) throw new HttpError(400, 'Množstvo môže mať najviac tri desatinné miesta.');
  const movementDate = date(value.movement_date, 'Dátum pohybu', true);
  const result = await client.query('SELECT * FROM stock_items WHERE id=$1 AND company_id=$2 FOR UPDATE', [itemId, companyId]);
  const item = result.rows[0];
  if (!item) throw new HttpError(404, 'Skladová položka neexistuje.');
  const delta = value.direction === 'in' ? quantity : -quantity;
  const updated = await client.query('UPDATE stock_items SET quantity=quantity+$1 WHERE id=$2 AND company_id=$3 AND quantity+$1>=0 RETURNING *', [delta, itemId, companyId]);
  if (!updated.rowCount) throw new HttpError(409, `Nedostatok na sklade: ${item.name}. K dispozícii: ${item.quantity} ${item.unit}.`);
  const price = money(value.unit_price ?? item.price, 'Cena');
  const movement = await client.query(`INSERT INTO stock_movements(company_id,item_id,direction,quantity,unit_price,movement_date,note,invoice_id,invoice_type,balance_after)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
  [companyId, itemId, value.direction, quantity, price, movementDate, text(value.note, 'Poznámka', { max: 2000 }), invoice.id || null, invoice.type || null, updated.rows[0].quantity]);
  return movement.rows[0];
}

export async function saveInvoice(client, companyId, type, raw) {
  const table = tableFor(type), value = invoiceInput(raw, type);
  if(value.items.some(item=>item.stock_item_id) && (value.currency!=='EUR'||value.status==='draft')) throw new HttpError(400,'Pohyb skladu je dostupný pre uložené faktúry v EUR bez stavu koncept.');
  // Serialize number checks within a workspace, including concurrent batch requests.
  await client.query('SELECT pg_advisory_xact_lock(61001,$1::integer)', [companyId]);
  const duplicate = await client.query(`SELECT id FROM ${table} WHERE company_id=$1 AND invoice_number=$2${type==='input'?' AND LOWER(COALESCE(supplier,supplier_name))=LOWER($3)':''}`, type==='input'?[companyId,value.invoice_number,value.party]:[companyId,value.invoice_number]);
  if (duplicate.rowCount) throw new HttpError(409, 'Faktúra s týmto číslom už existuje.');
  const partyColumns = type === 'input' ? 'supplier,supplier_name' : 'customer,customer_name';
  const result = await client.query(`INSERT INTO ${table}
    (company_id,invoice_number,issue_date,due_date,payment_date,${partyColumns},amount_without_vat,net_amount,vat_amount,vat,total_amount,amount,currency,status,description,items,billing_details)
    VALUES($1,$2,$3,$4,$5,$6,$6,$7,$7,$8,$8,$9,$9,$10,$11,$12,$13,$14) RETURNING *`,
  [companyId, value.invoice_number, value.issue_date, value.due_date, value.payment_date, value.party, value.amount_without_vat,
    value.vat_amount, value.total_amount, value.currency, value.status, value.description, JSON.stringify(value.items),JSON.stringify(invoiceBillingInput(raw,type))]);
  // Lock in a stable order to avoid deadlocks when two invoices contain the same stock items.
  for (const item of [...value.items].filter(item => item.stock_item_id).sort((a, b) => a.stock_item_id - b.stock_item_id)) {
    await moveStock(client, companyId, { item_id: item.stock_item_id, direction: type === 'input' ? 'in' : 'out', quantity: item.qty, unit_price: item.price, movement_date: value.issue_date, note: value.invoice_number }, { id: result.rows[0].id, type });
  }
  return result.rows[0];
}

export function invoiceSelect(type) {
  const party = type === 'input' ? 'COALESCE(supplier,supplier_name)' : 'COALESCE(customer,customer_name)';
  const issueDate = type === 'output' ? 'COALESCE(issue_date,date)' : 'issue_date';
  return `id,invoice_number,${party} AS party,${issueDate} AS issue_date,due_date,payment_date,
    COALESCE(amount_without_vat,net_amount) AS amount_without_vat,
    COALESCE(vat_amount,vat) AS vat_amount,COALESCE(total_amount,amount) AS total_amount,
    COALESCE(currency,'EUR') AS currency,COALESCE(status,'unpaid') AS status,description,items,billing_details`;
}

export function createCoreRouter(db, { ai, groq } = {}) {
  const router = express.Router();
  const attempts = new Map();
  const throttle = (req, res, next) => {
    const now = Date.now(), key = req.ip;
    if (attempts.size > 10000) for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    let entry = attempts.get(key);
    if (!entry || entry.until < now) { entry = { count: 0, until: now + 60000 }; attempts.set(key, entry); }
    if (++entry.count > 30) return res.status(429).json({ error: 'Priveľa pokusov. Skúste to o minútu.' });
    next();
  };
  router.post('/login', throttle, asyncRoute(async (req, res) => {
    const login = text(req.body?.email ?? req.body?.username, 'E-mail', { required: true, max: 255 });
    const password = req.body?.password;
    if (typeof password !== 'string' || !password || password.length > 1000) throw new HttpError(400, 'Vyplňte heslo.');
    const { rows } = await db.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1) OR username=$1 LIMIT 1', [login]);
    const user = rows[0];
    if (!user || !await bcrypt.compare(password, user.password_hash || '')) throw new HttpError(401, 'Nesprávny e-mail alebo heslo.');
    res.json(session(user));
  }));
  router.post('/register', throttle, asyncRoute(async (req, res) => {
    const company = text(req.body?.company, 'Názov firmy', { required: true, max: 200 });
    const email = text(req.body?.email, 'E-mail', { required: true, max: 255 }).toLowerCase();
    const password = req.body?.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Neplatná e-mailová adresa.');
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) throw new HttpError(400, 'Nové heslo musí mať 8 až 72 bajtov.');
    if (!secret()) throw new HttpError(503, 'Prihlásenie nie je nastavené na serveri.');
    const hash = await bcrypt.hash(password, 12);
    const user = await transaction(db, async client => {
      if ((await client.query('SELECT id FROM users WHERE LOWER(email)=$1', [email])).rowCount) throw new HttpError(409, 'Účet s touto adresou už existuje.');
      const companyResult = await client.query('INSERT INTO app_companies(name) VALUES($1) RETURNING id', [company]);
      const result = await client.query('INSERT INTO users(username,email,password_hash,role,company_id) VALUES($1,$1,$2,$3,$4) RETURNING *', [email, hash, 'admin', companyResult.rows[0].id]);
      return result.rows[0];
    });
    res.status(201).json(session(user));
  }));
  router.use(createAuth(db));
  router.get('/me', (req, res) => res.json(req.user));
  router.get('/status', asyncRoute(async (req, res) => res.json({ database: true, ai: Boolean((ai && (await ai.status(req.user)).configured)||(groq && (await groq.status(req.user)).configured)), voice: false, bankConnection: false })));

  const listInvoices = async (req, res) => {
    const type = req.params.type, table = tableFor(type);
    res.json((await db.query(`SELECT ${invoiceSelect(type)} FROM ${table} WHERE company_id=$1 ORDER BY issue_date DESC NULLS LAST,id DESC`, [req.user.companyId])).rows);
  };
  router.get('/invoices/:type', asyncRoute(listInvoices));
  router.get('/invoices/:type/:id/pdf',asyncRoute(async(req,res)=>{
    const type=req.params.type,table=tableFor(type),recordId=id(req.params.id);
    const invoice=(await db.query(`SELECT ${invoiceSelect(type)} FROM ${table} WHERE company_id=$1 AND id=$2`,[req.user.companyId,recordId])).rows[0];
    if(!invoice)throw new HttpError(404,'Faktúra neexistuje.');
    const company=(await db.query('SELECT name FROM app_companies WHERE id=$1',[req.user.companyId])).rows[0];
    const buffer=await invoicePdf(invoice,{type,companyName:company?.name});
    res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="prehlad-faktury-'+type+'-'+recordId+'.pdf"','Cache-Control':'no-store'}).send(buffer);
  }));
  router.post('/invoices/:type', asyncRoute(async (req, res) => res.status(201).json(await transaction(db, client => saveInvoice(client, req.user.companyId, req.params.type, req.body)))));
  router.patch('/invoices/:type/:id', asyncRoute(async (req, res) => {
    const table = tableFor(req.params.type), status = req.body?.status;
    if (!['paid', 'unpaid'].includes(status)) throw new HttpError(400, 'Vyberte stav úhrady.');
    const paymentDate = status === 'paid' ? date(req.body.payment_date, 'Dátum úhrady', true) : null;
    const result=await transaction(db,async client=>{
      await client.query('SELECT pg_advisory_xact_lock(61003,$1::integer)',[req.user.companyId]);
      const result = await client.query(`UPDATE ${table} SET status=$1,payment_date=$2 WHERE id=$3 AND company_id=$4 RETURNING *`, [status, paymentDate, id(req.params.id), req.user.companyId]);
      if (!result.rowCount) throw new HttpError(404, 'Faktúra neexistuje.');
      if(status==='unpaid')await client.query('UPDATE bank_transactions SET invoice_id=NULL,invoice_type=NULL WHERE company_id=$1 AND invoice_id=$2 AND invoice_type=$3',[req.user.companyId,id(req.params.id),req.params.type]);
      return result.rows[0];
    });
    res.json(result);
  }));
  for (const type of ['input', 'output']) {
    router.get(`/${type}-invoices`, (req, res, next) => { req.params.type = type; return asyncRoute(listInvoices)(req, res, next); });
  }
  router.post('/fakture/batch', asyncRoute(async (req, res) => {
    const values = req.body?.invoices ?? req.body?.fakture;
    if (!Array.isArray(values) || !values.length || values.length > 50) throw new HttpError(400, 'Vyberte 1 až 50 faktúr.');
    const invoices = await transaction(db, async client => {
      const result = [];
      for (const value of values) result.push(await saveInvoice(client, req.user.companyId, value?.type || req.body.type || 'input', value));
      return result;
    });
    res.status(201).json({ invoices, saved: invoices.length });
  }));

  router.get('/warehouse/items', asyncRoute(async (req, res) => res.json((await db.query('SELECT * FROM stock_items WHERE company_id=$1 ORDER BY name,id', [req.user.companyId])).rows)));
  router.post('/warehouse/items', asyncRoute(async (req, res) => {
    const value = req.body;
    const result = await db.query('INSERT INTO stock_items(company_id,code,name,unit,price) VALUES($1,$2,$3,$4,$5) RETURNING *', [req.user.companyId,
      text(value.code, 'Kód', { required: true, max: 100 }), text(value.name, 'Názov', { required: true, max: 250 }), text(value.unit || 'ks', 'Jednotka', { max: 20 }), money(value.price ?? 0, 'Cena')]);
    res.status(201).json(result.rows[0]);
  }));
  router.get('/warehouse/movements', asyncRoute(async (req, res) => res.json((await db.query(`SELECT m.*,i.name,i.code,i.unit FROM stock_movements m JOIN stock_items i ON i.id=m.item_id WHERE m.company_id=$1 ORDER BY m.id DESC`, [req.user.companyId])).rows)));
  router.post('/warehouse/movements', asyncRoute(async (req, res) => res.status(201).json(await transaction(db, client => moveStock(client, req.user.companyId, req.body)))));
  router.get('/warehouse/card/:id', asyncRoute(async (req, res) => {
    const itemId = id(req.params.id), companyId = req.user.companyId;
    const item = (await db.query('SELECT * FROM stock_items WHERE company_id=$1 AND id=$2', [companyId, itemId])).rows[0];
    if (!item) throw new HttpError(404, 'Položka neexistuje.');
    const history = (await db.query('SELECT * FROM stock_movements WHERE company_id=$1 AND item_id=$2 ORDER BY id', [companyId, itemId])).rows;
    res.json({ item, history });
  }));

  router.get('/bank/accounts', asyncRoute(async (req, res) => res.json((await db.query('SELECT * FROM bank_accounts WHERE company_id=$1 ORDER BY name,id', [req.user.companyId])).rows)));
  router.post('/bank/accounts', asyncRoute(async (req, res) => {
    const value = req.body;
    const iban = text(value.iban, 'IBAN', { required: true, max: 40 }).replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) throw new HttpError(400, 'Neplatný formát IBAN.');
    const expanded = (iban.slice(4) + iban.slice(0,4)).replace(/[A-Z]/g, char => String(char.charCodeAt(0)-55));
    let remainder = 0; for (const digit of expanded) remainder = (remainder*10+Number(digit))%97;
    if (remainder !== 1) throw new HttpError(400, 'Kontrolný súčet IBAN nesúhlasí.');
    const currency = text(value.currency || 'EUR', 'Mena', { max: 3 }).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, 'Neplatná mena.');
    const result = await db.query('INSERT INTO bank_accounts(company_id,name,iban,bic,currency) VALUES($1,$2,$3,$4,$5) RETURNING *', [req.user.companyId, text(value.name, 'Názov účtu', { required: true, max: 200 }), iban, text(value.bic, 'BIC', { max: 20 }), currency]);
    res.status(201).json(result.rows[0]);
  }));
  const saveBankTransaction = async (companyId, value) => {
    const accountId = value.account_id ? id(value.account_id) : null;
    const account = accountId ? (await db.query('SELECT * FROM bank_accounts WHERE id=$1 AND company_id=$2', [accountId, companyId])).rows[0] : null;
    if (accountId && !account) throw new HttpError(404, 'Bankový účet neexistuje.');
    const amount = money(value.amount, 'Suma', { min: -1e9 });
    if (!amount) throw new HttpError(400, 'Suma musí byť odlišná od nuly.');
    const result = await db.query(`INSERT INTO bank_transactions(company_id,account_id,transaction_date,amount,description,variable_symbol,currency)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [companyId, accountId, date(value.transaction_date ?? value.date, 'Dátum', true), amount,
      text(value.description, 'Popis', { required: true, max: 2000 }), text(value.variable_symbol ?? value.vs, 'Variabilný symbol', { max: 100 }), account?.currency || 'EUR']);
    return result.rows[0];
  };
  router.get('/bank/transactions', asyncRoute(async (req, res) => res.json((await db.query('SELECT * FROM bank_transactions WHERE company_id=$1 ORDER BY transaction_date DESC NULLS LAST,id DESC', [req.user.companyId])).rows)));
  router.post('/bank/transactions', asyncRoute(async (req, res) => res.status(201).json(await saveBankTransaction(req.user.companyId, req.body))));
  router.get('/bank/matches', asyncRoute(async (req,res)=>{
    const transactions=(await db.query('SELECT * FROM bank_transactions WHERE company_id=$1 AND invoice_id IS NULL ORDER BY transaction_date DESC NULLS LAST,id DESC',[req.user.companyId])).rows;
    const candidates=[];
    for(const type of ['input','output']){
      const invoices=(await db.query(`SELECT ${invoiceSelect(type)} FROM ${tables[type]} WHERE company_id=$1 AND COALESCE(status,'unpaid')='unpaid'`,[req.user.companyId])).rows;
      for(const entry of transactions){
        if((type==='input'&&Number(entry.amount)>=0)||(type==='output'&&Number(entry.amount)<=0))continue;
        for(const invoice of invoices){
          if(invoice.total_amount!=null&&Math.abs(Math.abs(Number(entry.amount))-Number(invoice.total_amount))<0.001&&(entry.currency||'EUR')===invoice.currency){
            candidates.push({transaction:entry,invoice,type,referenceMatches:Boolean(String(entry.variable_symbol||'').replace(/\D/g,''))&&String(entry.variable_symbol).replace(/\D/g,'')===String(invoice.billing_details?.variable_symbol||invoice.invoice_number||'').replace(/\D/g,'')});
          }
        }
      }
    }
    res.json(candidates.sort((a,b)=>Number(b.referenceMatches)-Number(a.referenceMatches)));
  }));
  router.post('/bank/matches',asyncRoute(async(req,res)=>{
    const table=tableFor(req.body.type),companyId=req.user.companyId;
    const result=await transaction(db,async client=>{
      await client.query('SELECT pg_advisory_xact_lock(61003,$1::integer)',[companyId]);
      const entry=(await client.query('SELECT * FROM bank_transactions WHERE company_id=$1 AND id=$2 FOR UPDATE',[companyId,id(req.body.transaction_id)])).rows[0];
      const invoice=(await client.query(`SELECT ${invoiceSelect(req.body.type)} FROM ${table} WHERE company_id=$1 AND id=$2 FOR UPDATE`,[companyId,id(req.body.invoice_id)])).rows[0];
      if(!entry||!invoice)throw new HttpError(404,'Transakcia alebo faktúra neexistuje.');
      if(entry.invoice_id||invoice.status!=='unpaid')throw new HttpError(409,'Transakcia alebo faktúra už bola spárovaná alebo uhradená.');
      const sign=req.body.type==='input'?-1:1;
      if(!entry.transaction_date||invoice.total_amount==null||Number(entry.amount)*sign<=0||Math.abs(Number(entry.amount)*sign-Number(invoice.total_amount))>0.001||(entry.currency||'EUR')!==invoice.currency)throw new HttpError(400,'Smer platby, suma alebo mena nesúhlasí s faktúrou.');
      await client.query('UPDATE bank_transactions SET invoice_id=$1,invoice_type=$2 WHERE company_id=$3 AND id=$4',[invoice.id,req.body.type,companyId,entry.id]);
      await client.query(`UPDATE ${table} SET status='paid',payment_date=$1 WHERE company_id=$2 AND id=$3`,[entry.transaction_date,companyId,invoice.id]);
      return{matched:true};
    });
    res.json(result);
  }));
  router.post('/manual-entry/banka', asyncRoute(async (req, res) => {
    const value = req.body;
    if (!['prihod', 'rashod'].includes(value.tip)) throw new HttpError(400, 'Vyberte príjem alebo výdavok.');
    const amount = money(value.iznos, 'Suma', { min: 0.01 }) * (value.tip === 'rashod' ? -1 : 1);
    const entry = await saveBankTransaction(req.user.companyId, { transaction_date: value.datum, description: value.opis, amount });
    res.status(201).json({ transakcija: { ...entry, opis: entry.description }, message: 'Transakcia bola uložená.' });
  }));
  router.post('/manual-entry', asyncRoute(async (req, res) => {
    if (req.body.category !== 'fakturacia') throw new HttpError(400, 'Použite príslušný formulár v ponuke Ručné zadávanie.');
    const invoice = await transaction(db, client => saveInvoice(client, req.user.companyId, req.body.type || 'output', req.body.data));
    res.status(201).json({ message: 'Faktúra bola uložená.', invoice });
  }));

  router.get('/documents/:kind', asyncRoute(async (req, res) => {
    if (!docKinds.includes(req.params.kind)) throw new HttpError(404, 'Neznámy typ dokumentu.');
    res.json((await db.query('SELECT * FROM app_documents WHERE company_id=$1 AND kind=$2 ORDER BY document_date DESC,id DESC', [req.user.companyId, req.params.kind])).rows);
  }));
  router.post('/documents/:kind', asyncRoute(async (req, res) => {
    const value = req.body;
    if (!docKinds.includes(req.params.kind)) throw new HttpError(404, 'Neznámy typ dokumentu.');
    const result = await db.query(`INSERT INTO app_documents(company_id,kind,title,document_date,partner,amount,currency,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.companyId, req.params.kind, text(value.title, 'Názov', { required: true, max: 250 }), date(value.document_date, 'Dátum', true), text(value.partner, 'Partner', { max: 250 }), value.amount === '' || value.amount == null ? null : money(value.amount, 'Suma'), 'EUR', text(value.note, 'Obsah', { max: 20000 })]);
    res.status(201).json(result.rows[0]);
  }));
  router.delete('/documents/:kind/:id', asyncRoute(async (req, res) => {
    if (!docKinds.includes(req.params.kind)) throw new HttpError(404, 'Neznámy typ dokumentu.');
    const result = await db.query('DELETE FROM app_documents WHERE company_id=$1 AND kind=$2 AND id=$3 RETURNING id', [req.user.companyId, req.params.kind, id(req.params.id)]);
    if (!result.rowCount) throw new HttpError(404, 'Dokument neexistuje.');
    res.json({ deleted: true });
  }));

  const stateKey = key => { if (!['budget', 'deadlines'].includes(key)) throw new HttpError(404, 'Neznámy typ údajov.'); return key; };
  router.get('/state/:key', asyncRoute(async (req, res) => {
    const result = await db.query('SELECT value,version FROM app_state WHERE company_id=$1 AND user_id=$2 AND key=$3', [req.user.companyId, req.user.id, stateKey(req.params.key)]);
    res.json(result.rows[0] || { value: null, version: 0 });
  }));
  router.put('/state/:key', asyncRoute(async (req, res) => {
    const key = stateKey(req.params.key), value = normalizeState(key,req.body?.value), version = number(req.body?.version, 'Verzia', { max: 2147483646 });
    if (!Number.isInteger(version)) throw new HttpError(400, 'Neplatná verzia údajov.');
    const result = version === 0
      ? await db.query(`INSERT INTO app_state(company_id,user_id,key,value) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING value,version`, [req.user.companyId, req.user.id, key, JSON.stringify(value)])
      : await db.query(`UPDATE app_state SET value=$1,version=version+1,updated_at=now() WHERE company_id=$2 AND user_id=$3 AND key=$4 AND version=$5 RETURNING value,version`, [JSON.stringify(value), req.user.companyId, req.user.id, key, version]);
    if (!result.rowCount) throw new HttpError(409, 'Údaje sa zmenili v inom okne. Obnovte stránku pred ďalším uložením.');
    res.json(result.rows[0]);
  }));

  router.get('/reports', asyncRoute(async (req, res) => {
    const year = number(req.query.year, 'Rok', { min: 1970, max: 2200 });
    const month = req.query.month ? number(req.query.month, 'Mesiac', { min: 1, max: 12 }) : null;
    if (!Number.isInteger(year) || (month && !Number.isInteger(month))) throw new HttpError(400, 'Neplatné obdobie.');
    const rows = [];
    for (const type of ['input', 'output']) {
      const result = await db.query(`SELECT ${invoiceSelect(type)} FROM ${tables[type]} WHERE company_id=$1 AND EXTRACT(YEAR FROM ${type === 'output' ? 'COALESCE(issue_date,date)' : 'issue_date'})=$2`, [req.user.companyId, year]);
      rows.push(...result.rows.map(row => ({ ...row, type })));
    }
    const selected = month ? rows.filter(row => Number((row.issue_date instanceof Date ? row.issue_date.toISOString() : String(row.issue_date)).slice(5,7)) === month) : rows;
    const currencies = [...new Set(selected.map(row => row.currency))].sort();
    const totals = currencies.map(currency => {
      const relevant = selected.filter(row => row.currency === currency), sum = (type, field) => relevant.filter(row => row.type === type && row.status !== 'draft').reduce((total, row) => total + Math.round(Number(row[field] || 0)*100), 0)/100;
      return { currency, income: sum('output','total_amount'), expenses: sum('input','total_amount'), outputVat: sum('output','vat_amount'), inputVat: sum('input','vat_amount'), incomplete: relevant.filter(row => row.total_amount == null || row.vat_amount == null || row.amount_without_vat == null).length };
    });
    res.json({ year, month, totals, invoices: selected });
  }));
  return router;
}
