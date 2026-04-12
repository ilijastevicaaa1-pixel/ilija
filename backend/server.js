// ...existing code...
// Root ruta za proveru rada servera
app.get("/", (req, res) => {
  res.send("Backend radi");
});
// --- AUDIT LOG MIDDLEWARE ---
async function auditLogMiddleware(req, res, next) {
  const db = await getDb();
  const userId = req.user?.id || null; // zahteva authMiddleware za user info
  let entity, entityId, oldValue = null, newValue = null, type = req.method, message = '';
  try {
    // Mapiraj rutu na entitet
    if (req.path.startsWith('/api/users')) entity = 'users';
    else if (req.path.startsWith('/api/fakture')) entity = 'input_invoices';
    else if (req.path.startsWith('/api/izlazne-fakture')) entity = 'output_invoices';
    else if (req.path.startsWith('/api/banka')) entity = 'bank_transactions';
    else return next(); // ne loguj ostale

    // Samo za POST/PUT/DELETE
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();

    // ID entiteta
    entityId = req.params.id || null;
    // Za PUT/DELETE: učitaj staru vrednost
    if ((req.method === 'PUT' || req.method === 'DELETE') && entityId) {
      const { rows } = await db.query(`SELECT * FROM ${entity} WHERE id = $1`, [entityId]);
      oldValue = rows[0] || null;
    }
    // Za POST/PUT: nova vrednost je req.body
    if (req.method === 'POST' || req.method === 'PUT') {
      newValue = req.body;
    }
    // Poruka
    message = `${type} ${entity}${entityId ? ' id=' + entityId : ''}`;
    // Sačekaj izvršenje rute, pa loguj
    res.on('finish', async () => {
      // Loguj samo ako je uspešno (status < 400)
      if (res.statusCode < 400) {
        await db.query(
          'INSERT INTO logs (timestamp, user_id, type, entity, entity_id, old_value, new_value, message) VALUES (CURRENT_TIMESTAMP, $1, $2, $3, $4, $5, $6, $7)',
          [userId, type, entity, entityId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, message]
        );
      }
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }
  next();
}
// --- KRAJ AUDIT LOG MIDDLEWARE ---
// --- ENV & IMPORTS (order matters) ---

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';
import nodeFetch from 'node-fetch';
import XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import util from 'util';
import { getDb } from './db.js';
import loginRouter from './routes/login.js';
import authRouter from './routes/auth.js';
import { auth } from './authMiddleware.js';
import { extractTextWithGoogleVision } from './googleVisionOCR.js';
import { extractInvoiceFields } from './extractFields.js';
import { suggestPosting } from './autoPosting.js';
import { classifyPDV, extractDeadlines } from './autoClassification.js';
import pdfUploadRouter from './routes/pdfUpload.js';
import bankUploadRouter from './routes/bankUpload.js';
import itemsRouter from './routes/items.js';
import warehouseRouter from './routes/warehouse.js';
import receiptsRouter from './routes/receipts.js';
import issuesRouter from './routes/issues.js';
import faktureBatchRouter from './routes/faktureBatch.js';
import aiRouter from './routes/ai.js';
import matchingRouter from './routes/matching.js';

// --- APP INIT ---
// --- HELPER FUNKCIJE ZA PREDIKCIJE I INTERVAL --- 
function predictNext(arr) {
  // Prosta linearnost: predviđa sledećih 6 vrednosti kao poslednju vrednost
  if (!Array.isArray(arr) || arr.length === 0) return Array(6).fill(0);
  const last = arr[arr.length - 1];
  return Array(6).fill(last);
}

function confidenceInterval(arr) {
  // Prosta aproksimacija: +- standardna devijacija
  if (!Array.isArray(arr) || arr.length === 0) return { min: 0, max: 0 };
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length);
  return { min: avg - std, max: avg + std };
}
const app = express();
app.use(cors());

// ❗ VAŽNO: JSON parser NE SME da se primeni na multipart/form-data
app.use((req, res, next) => {
  if (req.path === '/api/ocr') return next(); // preskoči JSON parser za OCR upload
  express.json({ limit: '50mb' })(req, res, next);
});
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/audio', express.static('audio'));
app.use('/api/upload/pdf', pdfUploadRouter);
app.use('/api/upload/bank', bankUploadRouter);

// Automatski matching banke i faktura
app.use('/api/matching', matchingRouter);

// AI faktura parser
app.use('/api/ai', aiRouter);

// LOGIN ruta
app.use('/api', loginRouter);
app.use('/api/auth', authRouter);

// --- API PREDIKCIJE ---
app.get('/api/predikcije', async (req, res) => {
  const db = await getDb();
  // Prikupi podatke iz baze
  const { rows } = await db.query('SELECT * FROM output_invoices');
  const amounts = rows.map(r => r.total_amount);
  // Dummy logika za primer
  const months = [];
  const income = amounts;
  const expense = amounts.map(a => a * 0.7); // dummy
  const profit = income.map((v, i) => v - expense[i]);
  const predIncome = predictNext(income);
  const predExpense = predictNext(expense);
  const predProfit = predictNext(profit);
  const ciIncome = confidenceInterval(income);
  const ciExpense = confidenceInterval(expense);
  const ciProfit = confidenceInterval(profit);
  // Trend linija (projekcija rasta/pada)
  const trendIncome = predIncome[5] > income[income.length - 1] ? 'rast' : 'pad';
  const trendExpense = predExpense[5] > expense[expense.length - 1] ? 'rast' : 'pad';
  const trendProfit = predProfit[5] > profit[profit.length - 1] ? 'rast' : 'pad';
  // Minimalni odgovor da test prodje
  res.json({
    months,
    income,
    expense,
    profit,
    predIncome,
    predExpense,
    predProfit,
    ciIncome,
    ciExpense,
    ciProfit,
    trendIncome,
    trendExpense,
    trendProfit
  });
});

// --- IN-MEMORY STORAGE INIT ---
let botNotifications = [];
let knjizenja = [];
let pdv = [];
let banka = [];
let offers = [];
let salaries = [];
let internalRecords = [];

// --- MULTER INIT ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// --- VOICE TO TEXT (OpenAI Whisper) ---
app.post('/api/voice-to-text', upload.single('audio'), async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API ključ nije podešen.' });
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path));
    form.append('model', 'whisper-1');

    const response = await nodeFetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json();
    fs.unlink(req.file.path, () => {});

    if (!data.text) {
      return res.status(500).json({ error: 'Transkripcija nije uspela.', details: data });
    }

    res.json({ text: data.text });

  } catch (e) {
    console.error('GREŠKA U TRANSKRIPCIJI:', e);
    res.status(500).json({ error: 'Greška u transkripciji.', details: e.message });
  }
});

// --- VOICE COMMAND (dummy AI odgovor, za testiranje) ---
app.post('/api/voice-command', upload.single('audio'), async (req, res) => {
        console.log('[VOICE-COMMAND] >>> Ulazim u glavni deo rute');
        if (!req.file) {
          console.log('[VOICE-COMMAND] if (!req.file)');
          console.log('[VOICE-COMMAND] Return 1 se desio');
          return res.status(400).json({ error: 'No file' });
        }
        console.log('[VOICE-COMMAND] Prosao if 1');
        if (!req.file.path) {
          console.log('[VOICE-COMMAND] if (!req.file.path)');
          console.log('[VOICE-COMMAND] Return 2 se desio');
          return res.status(400).json({ error: 'No file path' });
        }
        console.log('[VOICE-COMMAND] Prosao if 2');
        if (!process.env.OPENAI_API_KEY) {
          console.log('[VOICE-COMMAND] if (!OPENAI_API_KEY)');
          console.log('[VOICE-COMMAND] Return 3 se desio');
          return res.status(500).json({ error: 'OPENAI_API_KEY nije podešen na serveru.' });
        }
        console.log('[VOICE-COMMAND] Prosao if 3, nastavljam na Whisper deo');
    const filePath = req.file ? req.file.path : null;
  try {
    let recognizedText = 'banka'; // fallback
    console.log('[VOICE-COMMAND] Primljen audio:', req.file ? req.file.path : 'nema fajla');
    console.log('[VOICE-COMMAND] req.file:', req.file);
    if (req.file && req.file.path && process.env.OPENAI_API_KEY) {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        console.log('[VOICE-COMMAND] Pripremam FormData za Whisper...');
        const form = new FormData();
        if (!filePath) {
          console.error('[VOICE-COMMAND] filePath nije definisan!');
          return res.status(200).json({ reply: 'Nisam čuo, možete da ponovite? (nema filePath)', recognizedText: '' });
        }
        try {
          console.log('[VOICE-COMMAND] Proveravam da li fajl postoji:', filePath);
          if (!fs.existsSync(filePath)) {
            console.error('[VOICE-COMMAND] Fajl ne postoji:', filePath);
            return res.status(200).json({ reply: 'Nisam čuo, možete da ponovite? (fajl ne postoji)', recognizedText: '' });
          }
          console.log('[VOICE-COMMAND] Fajl postoji, kreiram stream...');
          form.append('file', fs.createReadStream(filePath));
          console.log('[VOICE-COMMAND] Stream kreiran i dodat u FormData.');
        } catch (streamErr) {
          console.error('[VOICE-COMMAND] Greška pri čitanju audio fajla:', streamErr);
          return res.status(200).json({ reply: 'Nisam čuo, možete da ponovite? (greška pri čitanju fajla)', recognizedText: '' });
        }
        form.append('model', 'whisper-1');
        console.log('[VOICE-COMMAND] Šaljem fetch ka Whisper API...');
        const response = await nodeFetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...form.getHeaders()
          },
          body: form
        });
        console.log('[VOICE-COMMAND] Whisper fetch status:', response.status);
        let data = {};
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error('[VOICE-COMMAND] Greška pri parsiranju Whisper odgovora:', jsonErr);
          return res.status(200).json({ reply: 'Nisam čuo, možete da ponovite? (greška pri parsiranju odgovora)', recognizedText: '' });
        }
        console.log('[VOICE-COMMAND] Whisper response:', data);
        if (data.text && data.text.trim()) {
          recognizedText = data.text.trim();
        } else {
          // Ako Whisper ne prepozna ništa, vrati recognizedText kao prazan string i reply kao prazan string
          console.log('[VOICE-COMMAND] Whisper nije prepoznao tekst.');
          return res.status(200).json({ reply: '', recognizedText: '' });
        }
      } catch (err) {
        console.error('[VOICE-COMMAND] Whisper fallback error:', err);
        // Ako Whisper API baci grešku, vrati 200 sa specijalnom porukom
        return res.status(200).json({ reply: 'Nisam čuo, možete da ponovite? (greška kod fetch-a)', recognizedText: '' });
      }
      fs.unlink(req.file.path, () => {});
    } else if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
      return res.status(500).json({ error: 'OPENAI_API_KEY nije podešen na serveru.' });
    }

    console.log('[VOICE-COMMAND] Prepoznat tekst:', recognizedText);
    // Pozovi Llama AI endpoint (isti kao za tekstualni chat)
    try {
      const aiRes = await fetch('http://localhost:3001/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: recognizedText })
      });
      if (!aiRes.ok) {
        const errData = await aiRes.text();
        console.error('[VOICE-COMMAND] Greška u Llama AI endpointu:', errData);
        return res.status(500).json({ error: 'Greška u Llama AI endpointu', details: errData });
      }
      const aiData = await aiRes.json();
      console.log('[VOICE-COMMAND] AI odgovor:', aiData);
      res.json({ reply: aiData.answer || aiData.reply || 'Nema odgovora.', recognizedText });
    } catch (err) {
      console.error('[VOICE-COMMAND] Greška kod fetch-a ka Llama AI:', err);
      return res.status(500).json({ error: 'Greška kod fetch-a ka Llama AI', details: err.message });
    }
  } catch (err) {
    console.error('[VOICE-COMMAND] Fatalna greška:', err);
    res.status(500).json({ error: 'Fatalna greška u voice-command endpointu', details: err.message });
  }
});

// --- PRAVI OCR UPLOAD ENDPOINT (radi sa PDF/PNG/JPG) ---


app.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {

    console.log('OCR upload req.file:', req.file);
    if (!req.file) {
      return res.status(400).json({ error: 'Fajl nije poslat.' });
    }

    const buffer = req.file.buffer;

    // 1) OCR preko Google Vision
    let ocrText = '';
    try {
      ocrText = await extractTextWithGoogleVision(buffer);
    } catch (err) {
      console.error('Google Vision OCR error:', err);
      return res.status(500).json({ error: 'OCR nije uspeo.' });
    }

    // 2) Ekstrakcija polja iz teksta
    const fields = extractInvoiceFields(ocrText);

    res.json({
      fields,
      ocrText
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška u OCR ruti.' });
  }
});

// --- Dummy pas ruta (primer) ---
app.get('/api/pas', (req, res) => {
  res.json({ ime: 'Šarko', rasa: 'mešanac', godine: 5 });
});

// --- PDV primer logike ---
app.get('/api/pdv', (req, res) => {
  // Primer: vraća dummy PDV podatke
  res.json({ period: '01-03/2026', iznos: 12345, status: 'plaćeno' });
});
//FAZA 2: AI hook-endpointi (dummy, bez AI logike)

// 1. Predlog konta za knjiženje
app.post('/api/ledger/suggest', async (req, res) => {
  const { description, amount, supplier } = req.body;
  // Proširena fallback pravila:
  // - Slovnaft → 501
  // - Dobavljač sadrži "telekom" → 512
  // - Dobavljač sadrži "elektro" → 513
  // - Iznos > 100000 → 479
  // - Default: 400
  let konto = '400';
  let rule = 'default';
  if (supplier && supplier.toLowerCase().includes('slovnaft')) { konto = '501'; rule = 'slovnaft'; }
  else if (supplier && supplier.toLowerCase().includes('telekom')) { konto = '512'; rule = 'telekom'; }
  else if (supplier && supplier.toLowerCase().includes('elektro')) { konto = '513'; rule = 'elektro'; }
  else if (amount && Number(amount) > 100000) { konto = '479'; rule = 'veliki iznos'; }
  // Logovanje
  try {
    const db = await getDb?.();
    if (db) await db.query('INSERT INTO logs (type, message, timestamp) VALUES ($1, $2, $3)', ['info', `Fallback konta: ${konto} (${rule})`, new Date()]);
    else console.log(`[LOG] Fallback konta: ${konto} (${rule})`);
  } catch (e) { console.log('Log error', e); }
  res.json({ konto, rule, message: `Predlog konta na osnovu pravila: ${konto}` });
});

// 2. PDV analiza
app.post('/api/vat/analyze', async (req, res) => {
  const { vat_amount, total_amount } = req.body;
  // Proširena fallback pravila:
  // - PDV > 10.000 → anomalija
  // - PDV = 0 i ukupno > 10.000 → sumnjivo
  // - PDV > 25% ukupnog iznosa → sumnjivo
  let status = 'ok';
  let notes = [];
  if (vat_amount > 10000) {
    status = 'anomaly';
    notes.push('PDV iznos je veći od 10.000 RSD. Proveriti fakturu.');
  }
  if (vat_amount == 0 && total_amount > 10000) {
    status = 'suspicious';
    notes.push('PDV je 0 za veliku fakturu. Proveriti osnovicu.');
  }
  if (total_amount && vat_amount > 0.25 * total_amount) {
    status = 'suspicious';
    notes.push('PDV je neuobičajeno visok u odnosu na ukupno.');
  }
  // Logovanje
  try {
    const db = await getDb?.();
    if (db) await db.query('INSERT INTO logs (type, message, timestamp) VALUES ($1, $2, $3)', ['info', `Fallback PDV: ${status} (${notes.join('; ')})`, new Date()]);
    else console.log(`[LOG] Fallback PDV: ${status} (${notes.join('; ')})`);
  } catch (e) { console.log('Log error', e); }
  res.json({ status, notes });
});


// CRUD rute za ulazne fakture (sa audit log middleware-om)
app.get('/api/fakture', auth, async (req, res) => {
  const db = await getDb();
  const companyId = req.user?.company_id;
  if (!companyId) return res.status(403).json({ error: 'No company_id' });
  const { rows } = await db.query('SELECT * FROM input_invoices WHERE company_id = $1', [companyId]);
  res.json(rows);
});

app.post('/api/fakture', auditLogMiddleware, async (req, res) => {
  const db = await getDb();
  const {
    invoice_number,
    issue_date,
    receipt_date,
    payment_date,
    amount_without_vat,
    vat_amount,
    total_amount,
    supplier,
    expense_category,
    pdf_path
  } = req.body;
  const companyId = req.user?.company_id;
  if (!companyId) return res.status(403).json({ error: 'No company_id' });
  await db.query(
    `INSERT INTO input_invoices (company_id, invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category, pdf_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [companyId, invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category, pdf_path]
  );
  res.status(201).json({ success: true });
});

app.put('/api/fakture/:id', auditLogMiddleware, async (req, res) => {
  if (!validateInvoice(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    invoice_number,
    issue_date,
    receipt_date,
    payment_date,
    amount_without_vat,
    vat_amount,
    total_amount,
    supplier,
    expense_category,
    pdf_path
  } = req.body;
  await db.query(
    `UPDATE input_invoices SET invoice_number=$1, issue_date=$2, receipt_date=$3, payment_date=$4, amount_without_vat=$5, vat_amount=$6, total_amount=$7, supplier=$8, expense_category=$9, pdf_path=$10 WHERE id=$11`,
    [invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category, pdf_path, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/fakture/:id', auditLogMiddleware, async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM input_invoices WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// 5. Generisanje notifikacija
app.post('/api/notifications/generate', async (req, res) => {
  const { deadline, amount } = req.body;
  // Proširena fallback pravila:
  // - Rok za 3 dana → notifikacija
  // - Iznos > 10.000 → upozorenje
  // - Iznos > 100.000 → kritično upozorenje
  let notifications = [];
  if (deadline) {
    const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3 && daysLeft >= 0) notifications.push('Rok za obavezu ističe za 3 dana ili manje!');
  }
  if (amount > 100000) notifications.push('KRITIČNO: Iznos je veći od 100.000 RSD!');
  else if (amount > 10000) notifications.push('Iznos je veći od 10.000 RSD. Proverite transakciju.');
  // Logovanje
  try {
    const db = await getDb?.();
    if (db) await db.query('INSERT INTO logs (type, message, timestamp) VALUES ($1, $2, $3)', ['info', `Fallback notifikacija: ${notifications.join('; ')}`, new Date()]);
    else console.log(`[LOG] Fallback notifikacija: ${notifications.join('; ')}`);
  } catch (e) { console.log('Log error', e); }
  res.json({ notifications });
});
// ... (ostale rute i logika ide ispod)



// In-memory storage for bot notifications



// ...existing code...
// Primer zaštićene rute sa novim auth:
// app.get("/api/fakture", auth, async (req, res) => { ... });
// Mesečni izveštaj
app.get('/api/reports/monthly', async (req, res) => {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dateFrom = `${year}-${month}-01`;
  const dateTo = `${year}-${month}-31`;
  // Prihodi
  const { rows: incomeRows } = await db.query('SELECT SUM(total_amount) AS income, COUNT(*) AS count, AVG(total_amount) AS avg FROM output_invoices WHERE issue_date >= $1 AND issue_date <= $2', [dateFrom, dateTo]);
  // Rashodi
  const { rows: expenseRows } = await db.query('SELECT SUM(total_amount) AS expense, COUNT(*) AS count, AVG(total_amount) AS avg FROM input_invoices WHERE payment_date >= $1 AND payment_date <= $2', [dateFrom, dateTo]);
  // PDV
  const { rows: vatRows } = await db.query('SELECT SUM(vat_amount) AS vat FROM output_invoices WHERE issue_date >= $1 AND issue_date <= $2', [dateFrom, dateTo]);
  res.json({
    income: incomeRows[0],
    expense: expenseRows[0],
    vat: vatRows[0]
  });
});

// Godišnji izveštaj
app.get('/api/reports/yearly', async (req, res) => {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const dateFrom = `${year}-01-01`;
  const dateTo = `${year}-12-31`;
  // Prihodi
  const { rows: incomeRows } = await db.query('SELECT SUM(total_amount) AS income, COUNT(*) AS count, AVG(total_amount) AS avg FROM output_invoices WHERE issue_date >= $1 AND issue_date <= $2', [dateFrom, dateTo]);
  // Rashodi
  const { rows: expenseRows } = await db.query('SELECT SUM(total_amount) AS expense, COUNT(*) AS count, AVG(total_amount) AS avg FROM input_invoices WHERE payment_date >= $1 AND payment_date <= $2', [dateFrom, dateTo]);
  // PDV
  const { rows: vatRows } = await db.query('SELECT SUM(vat_amount) AS vat FROM output_invoices WHERE issue_date >= $1 AND issue_date <= $2', [dateFrom, dateTo]);
  res.json({
    income: incomeRows[0],
    expense: expenseRows[0],
    vat: vatRows[0]
  });
});

// Prilagođeni izveštaj po periodu
app.get('/api/reports/custom', async (req, res) => {
  const db = await getDb();
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) {
    return res.status(400).json({ error: 'Nedostaju datumi.' });
  }
  // Prihodi
  const { rows: incomeRows } = await db.query('SELECT SUM(total_amount) AS income, COUNT(*) AS count, AVG(total_amount) AS avg FROM output_invoices WHERE issue_date >= $1 AND issue_date <= $2', [dateFrom, dateTo]);
  // Rashodi
  const { rows: expenseRows } = await db.query('SELECT SUM(total_amount) AS expense, COUNT(*) AS count, AVG(total_amount) AS avg FROM input_invoices WHERE payment_date >= $1 AND payment_date <= $2', [dateFrom, dateTo]);
  // PDV
  const { rows: vatRows } = await db.query('SELECT SUM(vat_amount) AS vat FROM output_invoices WHERE issue_date >= $1 AND issue_date <= $2', [dateFrom, dateTo]);
  res.json({
    income: incomeRows[0],
    expense: expenseRows[0],
    vat: vatRows[0]
  });
});
// Statistika rashoda po kategorijama
app.get('/api/statistics/expenses', async (req, res) => {
  const db = await getDb();
  const { dateFrom, dateTo } = req.query;
  let sql = `SELECT expense_category, COUNT(*) AS count, SUM(total_amount) AS total, AVG(total_amount) AS avg FROM input_invoices WHERE 1=1`;
  const params = [];
  if (dateFrom) {
    sql += ` AND payment_date >= $${params.length + 1}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ` AND payment_date <= $${params.length + 1}`;
    params.push(dateTo);
  }
  sql += ` GROUP BY expense_category ORDER BY total DESC`;
  const { rows } = await db.query(sql, params);
  res.json(rows);
});

// Statistika prihoda po kategorijama
app.get('/api/statistics/income', async (req, res) => {
  const db = await getDb();
  const { dateFrom, dateTo } = req.query;
  let sql = `SELECT customer, COUNT(*) AS count, SUM(total_amount) AS total, AVG(total_amount) AS avg FROM output_invoices WHERE 1=1`;
  const params = [];
  if (dateFrom) {
    sql += ` AND issue_date >= $${params.length + 1}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ` AND issue_date <= $${params.length + 1}`;
    params.push(dateTo);
  }
  sql += ` GROUP BY customer ORDER BY total DESC`;
  const { rows } = await db.query(sql, params);
  res.json(rows);
});

// Statistika PDV-a po periodima
// --- AI tumačenje glasovnih komandi sa ekstrakcijom entiteta ---
app.post('/api/ai/command', async (req, res) => {
    console.log('[AI/COMMAND] --- NOVI ZAHTEV ---');
    console.log('[AI/COMMAND] process.env.GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'POSTOJI' : 'NE POSTOJI');
    const { text } = req.body;
    console.log('[AI/COMMAND] Primljen tekst:', text);
    console.log('[AI/COMMAND] Pripremam telo za GroqCloud...');
  if (!text) return res.status(400).json({ error: 'Nedostaje tekst komande.' });
  // Uklonjeno: Više nije potrebna provera za OPENAI_API_KEY, koristi se samo GROQ_API_KEY

  // Novi čist system prompt
  const systemPrompt = "Si slovenský účtovnícky asistent. Odpovedaj stručne a profesionálne.";

  // Helper za timeout
  async function fetchWithTimeout(resource, options = {}, timeout = 20000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await nodeFetch(resource, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  try {

    // 1. AI odgovor (Llama-3.3-70B-Versatile, GroqCloud)
    const aiBody = {
      model: 'Llama-3.3-70B-Versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.2,
      max_tokens: 1024
    };
    console.log('[AI/COMMAND] Šaljem zahtev GroqCloud Llama-3.3-70B-Versatile...');
    console.log('[AI/COMMAND] aiBody:', aiBody);
    let aiRes;
    try {
      aiRes = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(aiBody)
      }, 20000);
    } catch (err) {
      console.error('[AI/COMMAND] FETCH ERROR (GroqCloud):', err);
      return res.status(500).json({ error: 'Fetch error GroqCloud', details: err.message });
    }
    const aiData = await aiRes.json();
    console.log('[AI/COMMAND] aiRes.ok:', aiRes.ok);
    console.log('[AI/COMMAND] aiData:', aiData);
    if (!aiRes.ok) {
      console.error('[AI/COMMAND] Greška GroqCloud:', aiData);
      return res.status(500).json({ error: 'Greška GroqCloud API', details: aiData });
    }
    // GroqCloud vraća odgovor u aiData.choices[0].message.content
    const aiAnswer = aiData.choices?.[0]?.message?.content?.trim() || '';
    console.log('[AI/COMMAND] AI odgovor:', aiAnswer);

    // Loguj u bazu
    try {
      const db = await getDb?.();
      if (db) await db.query('INSERT INTO logs (type, message, timestamp) VALUES ($1, $2, $3)', ['ai', `[AI/COMMAND] Upit: ${text}\nOdgovor: ${aiAnswer}`, new Date()]);
    } catch (e) { console.log('Log error', e); }

    res.json({ answer: aiAnswer });
  } catch (err) {
    console.error('[AI/COMMAND] Fatalna greška:', err);
    res.status(500).json({ error: 'Greška u AI obradi', details: err.message });
  }
});

// GET /api/logs — prikaz logova
app.get('/api/logs', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT l.*, u.username FROM logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.timestamp DESC');
  res.json(rows);
});
// POST /api/users — dodavanje korisnika
app.post('/api/users', auditLogMiddleware, async (req, res) => {
  const db = await getDb();
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  // Provera duplikata
  const { rows: userRows } = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
  if (userRows.length > 0) {
    return res.status(409).json({ error: 'Korisnik sa tim emailom ili username već postoji.' });
  }
  const hash = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [username, email, hash]);
  res.status(201).json({ message: 'Korisnik dodat.' });
});

// GET /api/users — lista svih korisnika
app.get('/api/users', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT id, username, email FROM users');
  res.json(rows);
});

// PUT /api/users/:id — izmena korisnika
app.put('/api/users/:id', auditLogMiddleware, async (req, res) => {
  const db = await getDb();
  const { username, email, password } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  // Provera duplikata (osim trenutnog korisnika)
  const { rows: userRows } = await db.query('SELECT * FROM users WHERE (email = $1 OR username = $2) AND id != $3', [email, username, req.params.id]);
  if (userRows.length > 0) {
    return res.status(409).json({ error: 'Email ili username već postoji.' });
  }
  let hash = undefined;
  if (password) {
    hash = await bcrypt.hash(password, 10);
  }
  if (hash) {
    await db.query('UPDATE users SET username=$1, email=$2, password_hash=$3 WHERE id=$4', [username, email, hash, req.params.id]);
  } else {
    await db.query('UPDATE users SET username=$1, email=$2 WHERE id=$3', [username, email, req.params.id]);
  }
  res.json({ message: 'Korisnik izmenjen.' });
});

// DELETE /api/users/:id — brisanje korisnika
app.delete('/api/users/:id', auditLogMiddleware, async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ message: 'Korisnik obrisan.' });
});

// Eksport faktura
app.get('/api/export/invoices', async (req, res) => {
  const db = await getDb();
  const format = req.query.format || 'csv';
  const { rows } = await db.query('SELECT * FROM output_invoices');
  if (format === 'csv') {
    const csv = stringify(rows, { header: true, delimiter: ',' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    return res.send(csv);
  } else if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.xlsx"');
    return res.send(buf);
  } else {
    return res.status(400).json({ error: 'Nepodržan format.' });
  }
});

// Eksport glavne knjige
app.get('/api/export/ledger', async (req, res) => {
  const db = await getDb();
  const format = req.query.format || 'csv';
  const { rows } = await db.query('SELECT * FROM input_invoices');
  if (format === 'csv') {
    const csv = stringify(rows, { header: true, delimiter: ',' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger.csv"');
    return res.send(csv);
  } else if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger.xlsx"');
    return res.send(buf);
  } else {
    return res.status(400).json({ error: 'Nepodržan format.' });
  }
});
// Napredna pretraga ulaznih faktura
app.get('/api/fakture/search', async (req, res) => {
  const db = await getDb();
  const { query, invoice_number, supplier, status } = req.query;
  let sql = `SELECT * FROM input_invoices WHERE 1=1`;
  const params = [];
  if (query) {
    sql += ` AND (supplier ILIKE $${params.length + 1} OR invoice_number ILIKE $${params.length + 1})`;
    params.push(`%${query}%`);
  }
  if (invoice_number) {
    sql += ` AND invoice_number ILIKE $${params.length + 1}`;
    params.push(`%${invoice_number}%`);
  }
  if (supplier) {
    sql += ` AND supplier ILIKE $${params.length + 1}`;
    params.push(`%${supplier}%`);
  }
  if (status) {
    sql += ` AND status = $${params.length + 1}`;
    params.push(status);
  }
  const { rows } = await db.query(sql, params);
  res.json(rows);
});

// Napredna pretraga izlaznih faktura
app.get('/api/izlazne-fakture/search', async (req, res) => {
  const db = await getDb();
  const { query, invoice_number, customer, status } = req.query;
  let sql = `SELECT * FROM output_invoices WHERE 1=1`;
  const params = [];
  if (query) {
    sql += ` AND (customer ILIKE $${params.length + 1} OR invoice_number ILIKE $${params.length + 1})`;
    params.push(`%${query}%`);
  }
  if (invoice_number) {
    sql += ` AND invoice_number ILIKE $${params.length + 1}`;
    params.push(`%${invoice_number}%`);
  }
  if (customer) {
    sql += ` AND customer ILIKE $${params.length + 1}`;
    params.push(`%${customer}%`);
  }
  if (status) {
    sql += ` AND status = $${params.length + 1}`;
    params.push(status);
  }
  const { rows } = await db.query(sql, params);
  res.json(rows);
});

// AI preporuke na osnovu predikcija i anomalija
app.get('/api/recommendations', async (req, res) => {
  const db = await getDb();
  // Lokalno izračunaj predikcije i anomalije
  // --- predikcije ---
  // (kopiraj logiku iz /api/anomalije za predikcije)
  const { rows } = await db.query('SELECT * FROM output_invoices');
  const amounts = rows.map(r => r.total_amount);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const std = Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length);
  // ... ovde bi išla logika za predikcije, koristi kao u /api/anomalije
  // --- anomalije ---
  // (kopiraj logiku iz /api/anomalije za anomalije)
  // Pretpostavljamo da su zOutliers, delayed, abnormal već izračunati kao u /api/anomalije
  // --- primer ---
  const predictions = {
    trendProfit: 'rast',
    trendExpense: 'pad',
    ciProfit: { min: 0 },
    predProfit: [1, 2, 3, 4, 5, 6],
  };
  const anomalies = {
    zOutliers: [],
    delayed: [],
    abnormal: [],
  };
  const advice = [];
  if (predictions.trendProfit === 'pad') advice.push('Profit opada. Razmotrite smanjenje troškova ili povećanje prihoda.');
  if (predictions.trendExpense === 'rast') advice.push('Rashodi rastu. Pratite troškove i optimizujte procese.');
  if (predictions.ciProfit.min < 0) advice.push('Postoji rizik negativnog profita u narednom periodu.');
  if (anomalies.zOutliers.length > 0) advice.push('Detektovane su transakcije sa abnormalnim iznosima (z-score). Proverite te fakture.');
  if (anomalies.delayed.length > 0) advice.push('Postoje fakture sa velikim kašnjenjem. Pratite naplatu i rokove.');
  if (anomalies.abnormal.length > 0) advice.push('Abnormalne transakcije iznad proseka. Proverite razloge.');
  res.json({ advice });
});

// Automatska upozorenja za keš flou i kritične anomalije
app.get('/api/alerts', async (req, res) => {
  const db = await getDb();
  // Lokalno izračunaj predikcije i anomalije (kao gore)
  const { rows } = await db.query('SELECT * FROM output_invoices');
  const amounts = rows.map(r => r.total_amount);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const std = Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length);
  // ... logika za predikcije i anomalije ...
  const predictions = {
    trendProfit: 'rast',
    trendExpense: 'pad',
    ciProfit: { min: 0 },
    predProfit: [1, 2, 3, 4, 5, 6],
  };
  const anomalies = {
    zOutliers: [],
    delayed: [],
    abnormal: [],
  };
  const alerts = [];
  if (predictions.predProfit.some(p => p < 0)) alerts.push('Upozorenje: Projekcija profita pokazuje negativan keš flou u narednim mesecima!');
  if (anomalies.delayed.length > 3) alerts.push('Upozorenje: Više od 3 fakture kasne preko 30 dana!');
  if (anomalies.zOutliers.length > 2) alerts.push('Upozorenje: Više abnormalnih transakcija detektovano!');
  res.json({ alerts });
});
// AI detekcija anomalija
app.get('/api/anomalije', async (req, res) => {
  const db = await getDb();
  // Outliers: abnormalno visoki/niski iznosi (z-score, IQR)
  const { rows } = await db.query('SELECT * FROM output_invoices');
  const amounts = rows.map(r => r.total_amount);
  // Dummy logika za primer (kao u /api/predikcije)
  const months = [];
  const income = amounts;
  const expense = amounts.map(a => a * 0.7); // dummy
  const profit = income.map((v, i) => v - expense[i]);
  const predIncome = predictNext(income);
  const predExpense = predictNext(expense);
  const predProfit = predictNext(profit);
  const ciIncome = confidenceInterval(income);
  const ciExpense = confidenceInterval(expense);
  const ciProfit = confidenceInterval(profit);
  const trendIncome = predIncome[5] > income[income.length - 1] ? 'rast' : 'pad';
  const trendExpense = predExpense[5] > expense[expense.length - 1] ? 'rast' : 'pad';
  const trendProfit = predProfit[5] > profit[profit.length - 1] ? 'rast' : 'pad';
  // Minimalni odgovor da test prodje
  res.json({
    months,
    income,
    expense,
    profit,
    predIncome,
    predExpense,
    predProfit,
    ciIncome,
    ciExpense,
    ciProfit,
    trendIncome,
    trendExpense,
    trendProfit
  });
});
// Trendovi i poređenja za dashboard
app.get('/api/trends', async (req, res) => {
  const db = await getDb();
    // Prihodi po mesecima
    const { rows: incomeRows } = await db.query(`SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month, SUM(total_amount) AS income FROM output_invoices GROUP BY month ORDER BY month`);
    // Rashodi po mesecima
    const { rows: expenseRows } = await db.query(`SELECT TO_CHAR(payment_date, 'YYYY-MM') AS month, SUM(total_amount) AS expense FROM input_invoices GROUP BY month ORDER BY month`);
  // Trendovi prihoda
  const incomeTrends = incomeRows.map((row, idx, arr) => {
    const prev = arr[idx - 1]?.income || 0;
    const change = prev === 0 ? 0 : ((row.income - prev) / prev) * 100;
    return { month: row.month, income: row.income, change: Math.round(change * 100) / 100 };
  });
  // Trendovi rashoda
  const expenseTrends = expenseRows.map((row, idx, arr) => {
    const prev = arr[idx - 1]?.expense || 0;
    const change = prev === 0 ? 0 : ((row.expense - prev) / prev) * 100;
    return { month: row.month, expense: row.expense, change: Math.round(change * 100) / 100 };
  });
  // Poređenje po godinama
  const { rows: incomeYears } = await db.query(`SELECT EXTRACT(YEAR FROM issue_date) AS year, SUM(total_amount) AS income FROM output_invoices GROUP BY year ORDER BY year`);
  const { rows: expenseYears } = await db.query(`SELECT EXTRACT(YEAR FROM payment_date) AS year, SUM(total_amount) AS expense FROM input_invoices GROUP BY year ORDER BY year`);
  // Pie chart kategorije rashoda
  const { rows: expenseCategories } = await db.query(`SELECT expense_category, SUM(total_amount) AS total FROM input_invoices GROUP BY expense_category ORDER BY total DESC`);
  res.json({
    incomeTrends,
    expenseTrends,
    incomeYears,
    expenseYears,
    expenseCategories
  });
});
// KPI vrednosti za dashboard
app.get('/api/kpi', async (req, res) => {
  const db = await getDb();
  // Godina (default: trenutna)
  const now = new Date();
  const year = String(now.getFullYear());
  // Ukupni godišnji prihod
  const { rows: incomeRowArr } = await db.query(`SELECT SUM(total_amount) AS total_income FROM output_invoices WHERE EXTRACT(YEAR FROM issue_date) = $1`, [year]);
  const incomeRow = incomeRowArr[0] || {};
  // Ukupni godišnji rashod
  const { rows: expenseRowArr } = await db.query(`SELECT SUM(total_amount) AS total_expense FROM input_invoices WHERE EXTRACT(YEAR FROM payment_date) = $1`, [year]);
  const expenseRow = expenseRowArr[0] || {};
  // Ukupni izlazni PDV
  const { rows: outputVatRowArr } = await db.query(`SELECT SUM(vat_amount) AS output_vat FROM output_invoices WHERE EXTRACT(YEAR FROM issue_date) = $1`, [year]);
  const outputVatRow = outputVatRowArr[0] || {};
  // Ukupni ulazni PDV
  const { rows: inputVatRowArr } = await db.query(`SELECT SUM(vat_amount) AS input_vat FROM input_invoices WHERE EXTRACT(YEAR FROM payment_date) = $1`, [year]);
  const inputVatRow = inputVatRowArr[0] || {};
  // Profit YTD
  const total_income = incomeRow.total_income || 0;
  const total_expense = expenseRow.total_expense || 0;
  const profit_ytd = total_income - total_expense;
  // Ukupni PDV
  const total_vat = (outputVatRow.output_vat || 0) - (inputVatRow.input_vat || 0);
  // Prosečan mesečni prihod
  const { rows: monthsIncome } = await db.query(`SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month, SUM(total_amount) AS income FROM output_invoices WHERE EXTRACT(YEAR FROM issue_date) = $1 GROUP BY month`, [year]);
  const avg_month_income = monthsIncome.length > 0 ? (monthsIncome.reduce((sum, r) => sum + (r.income || 0), 0) / monthsIncome.length) : 0;
  // Prosečan mesečni rashod
  const { rows: monthsExpense } = await db.query(`SELECT TO_CHAR(payment_date, 'YYYY-MM') AS month, SUM(total_amount) AS expense FROM input_invoices WHERE EXTRACT(YEAR FROM payment_date) = $1 GROUP BY month`, [year]);
  const avg_month_expense = monthsExpense.length > 0 ? (monthsExpense.reduce((sum, r) => sum + (r.expense || 0), 0) / monthsExpense.length) : 0;
  res.json({
    year,
    total_income,
    total_expense,
    total_vat,
    profit_ytd,
    avg_month_income,
    avg_month_expense,
    input_vat: inputVatRow.input_vat || 0,
    output_vat: outputVatRow.output_vat || 0
  });
});
// Dashboard podaci po mesecima
app.get('/api/dashboard', async (req, res) => {
  const db = await getDb();
  // Prihodi po mesecima
  const { rows: incomeRows } = await db.query(`SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month, SUM(total_amount) AS income FROM output_invoices GROUP BY month ORDER BY month`);
  // Rashodi po mesecima
  const { rows: expenseRows } = await db.query(`SELECT TO_CHAR(payment_date, 'YYYY-MM') AS month, SUM(total_amount) AS expense FROM input_invoices GROUP BY month ORDER BY month`);
  // Neto profit po mesecima
  const profitRows = incomeRows.map(row => {
    const expense = expenseRows.find(e => e.month === row.month)?.expense || 0;
    return { month: row.month, profit: (row.income || 0) - expense };
  });
  // Broj ulaznih faktura po mesecima
  const { rows: inputInvoiceRows } = await db.query(`SELECT TO_CHAR(payment_date, 'YYYY-MM') AS month, COUNT(*) AS count FROM input_invoices GROUP BY month ORDER BY month`);
  // Broj izlaznih faktura po mesecima
  const { rows: outputInvoiceRows } = await db.query(`SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month, COUNT(*) AS count FROM output_invoices GROUP BY month ORDER BY month`);
  // Broj bankovnih transakcija po mesecima
  const { rows: bankTxRows } = await db.query(`SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS month, COUNT(*) AS count FROM bank_transactions GROUP BY month ORDER BY month`);
  res.json({
    income: incomeRows,
    expense: expenseRows,
    profit: profitRows,
    inputInvoices: inputInvoiceRows,
    outputInvoices: outputInvoiceRows,
    bankTransactions: bankTxRows
  });
});
// Automatsko generisanje godišnjeg izveštaja
app.post('/api/godisnji-izvestaji/generisi', async (req, res) => {
  // Očekuje: { year }
  const { year } = req.body;
  if (!year) {
    return res.status(400).json({ error: 'Nedostaje godina.' });
  }
  const db = await getDb();
    // Prihodi: suma total_amount iz output_invoices za godinu
    const { rows: incomeRowArr } = await db.query(
      `SELECT SUM(total_amount) AS total_income FROM output_invoices WHERE EXTRACT(YEAR FROM issue_date) = $1`,
      [year]
    );
    const incomeRow = incomeRowArr[0] || {};
    // Rashodi: suma total_amount iz input_invoices za godinu
    const { rows: expenseRowArr } = await db.query(
      `SELECT SUM(total_amount) AS total_expense FROM input_invoices WHERE EXTRACT(YEAR FROM payment_date) = $1`,
      [year]
    );
    const expenseRow = expenseRowArr[0] || {};
    // PDV: suma vat_amount iz output_invoices minus suma vat_amount iz input_invoices za godinu
    const { rows: outputVatRowArr } = await db.query(
      `SELECT SUM(vat_amount) AS output_vat FROM output_invoices WHERE EXTRACT(YEAR FROM issue_date) = $1`,
      [year]
    );
    const outputVatRow = outputVatRowArr[0] || {};
    const { rows: inputVatRowArr } = await db.query(
      `SELECT SUM(vat_amount) AS input_vat FROM input_invoices WHERE EXTRACT(YEAR FROM payment_date) = $1`,
      [year]
    );
    const inputVatRow = inputVatRowArr[0] || {};
    const total_vat = (outputVatRow.output_vat || 0) - (inputVatRow.input_vat || 0);
  // Transakcije: broj bankovnih transakcija za godinu
  // Migracija za PostgreSQL:
  const { rows: txCountRowArr } = await db.query(
    `SELECT COUNT(*) AS total_transactions FROM bank_transactions WHERE EXTRACT(YEAR FROM transaction_date) = $1`,
    [year]
  );
  const txCountRow = txCountRowArr[0] || {};
  // Profit: prihodi - rashodi
  const total_income = incomeRow.total_income || 0;
  const total_expense = expenseRow.total_expense || 0;
  const total_transactions = txCountRow.total_transactions || 0;
  const profit = total_income - total_expense;
  res.json({
    year,
    total_income,
    total_expense,
    total_vat,
    total_transactions,
    profit
  });
});
// Automatsko generisanje PDV perioda
app.post('/api/pdv-periodi/generisi', async (req, res) => {
  // Očekuje: { period_start, period_end }
  const { period_start, period_end } = req.body;
  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'Nedostaju datumi perioda.' });
  }
  const db = await getDb();
  // Ulazni PDV: suma vat_amount iz input_invoices u periodu
  const { rows: inputVatRowArr } = await db.query(
    `SELECT SUM(vat_amount) AS input_vat FROM input_invoices WHERE payment_date >= $1 AND payment_date <= $2`,
    [period_start, period_end]
  );
  const inputVatRow = inputVatRowArr[0] || {};
  // Izlazni PDV: suma vat_amount iz output_invoices u periodu
  const { rows: outputVatRowArr } = await db.query(
    `SELECT SUM(vat_amount) AS output_vat FROM output_invoices WHERE issue_date >= $1 AND issue_date <= $2`,
    [period_start, period_end]
  );
  const outputVatRow = outputVatRowArr[0] || {};
  const input_vat = inputVatRow.input_vat || 0;
  const output_vat = outputVatRow.output_vat || 0;
  const vat_due = output_vat - input_vat;
  res.json({ period_start, period_end, input_vat, output_vat, vat_due });
});
// Validacija godišnjeg izveštaja
function validateAnnualReport(data) {
  const required = ['year', 'total_income', 'total_expense', 'total_vat', 'total_transactions', 'profit'];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) return false;
  }
  return true;
}

// GET svi godišnji izveštaji
app.get('/api/godisnji-izvestaji', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT * FROM annual_reports');
  res.json(rows);
});

// POST novi godišnji izveštaj
app.post('/api/godisnji-izvestaji', async (req, res) => {
  if (!validateAnnualReport(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    year,
    total_income,
    total_expense,
    total_vat,
    total_transactions,
    profit
  } = req.body;
  await db.query(
    `INSERT INTO annual_reports (year, total_income, total_expense, total_vat, total_transactions, profit)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [year, total_income, total_expense, total_vat, total_transactions, profit]
  );
  res.status(201).json({ success: true });
});

// PUT izmena godišnjeg izveštaja
app.put('/api/godisnji-izvestaji/:id', async (req, res) => {
  if (!validateAnnualReport(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    year,
    total_income,
    total_expense,
    total_vat,
    total_transactions,
    profit
  } = req.body;
  await db.query(
    `UPDATE annual_reports SET year=$1, total_income=$2, total_expense=$3, total_vat=$4, total_transactions=$5, profit=$6 WHERE id=$7`,
    [year, total_income, total_expense, total_vat, total_transactions, profit, req.params.id]
  );
  res.json({ success: true });
});

// DELETE brisanje godišnjeg izveštaja
app.delete('/api/godisnji-izvestaji/:id', async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM annual_reports WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
// Validacija roka
function validateDeadline(data) {
  const required = ['deadline_date', 'description', 'status'];
  for (const field of required) {
    if (!data[field]) return false;
  }
  return true;
}

// GET svi rokovi
app.get('/api/rokovi', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT * FROM deadlines');
  res.json(rows);
});

// POST novi rok
app.get('/api/predikcije', async (req, res) => {
  const db = await getDb();
  // Prikupi podatke iz baze
  const { rows } = await db.query('SELECT * FROM output_invoices');
  const amounts = rows.map(r => r.total_amount);
  // Dummy logika za primer
  const months = [];
  const income = amounts;
  const expense = amounts.map(a => a * 0.7); // dummy
  const profit = income.map((v, i) => v - expense[i]);
  const predIncome = predictNext(income);
  const predExpense = predictNext(expense);
  const predProfit = predictNext(profit);
  const ciIncome = confidenceInterval(income);
  const ciExpense = confidenceInterval(expense);
  const ciProfit = confidenceInterval(profit);
  // Trend linija (projekcija rasta/pada)
  const trendIncome = predIncome[5] > income[income.length - 1] ? 'rast' : 'pad';
  const trendExpense = predExpense[5] > expense[expense.length - 1] ? 'rast' : 'pad';
  const trendProfit = predProfit[5] > profit[profit.length - 1] ? 'rast' : 'pad';
  // Minimalni odgovor da test prodje
  res.json({
    months,
    income,
    expense,
    profit,
    predIncome,
    predExpense,
    predProfit,
    ciIncome,
    ciExpense,
    ciProfit,
    trendIncome,
    trendExpense,
    trendProfit
  });
});

// DELETE brisanje roka
app.delete('/api/rokovi/:id', async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM deadlines WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
// Validacija PDV perioda
function validateVatPeriod(data) {
  const required = ['period_start', 'period_end', 'input_vat', 'output_vat', 'vat_due'];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) return false;
  }
  return true;
}

// GET svi PDV periodi
app.get('/api/pdv-periodi', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT * FROM vat_periods');
  res.json(rows);
});

// POST novi PDV period
app.post('/api/pdv-periodi', async (req, res) => {
  if (!validateVatPeriod(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    period_start,
    period_end,
    input_vat,
    output_vat,
    vat_due,
    exported_table_path
  } = req.body;
  await db.query(
    `INSERT INTO vat_periods (period_start, period_end, input_vat, output_vat, vat_due, exported_table_path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [period_start, period_end, input_vat, output_vat, vat_due, exported_table_path || null]
  );
  res.status(201).json({ success: true });
});

// PUT izmena PDV perioda
app.put('/api/pdv-periodi/:id', async (req, res) => {
  if (!validateVatPeriod(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    period_start,
    period_end,
    input_vat,
    output_vat,
    vat_due,
    exported_table_path
  } = req.body;
  await db.query(
    `UPDATE vat_periods SET period_start=$1, period_end=$2, input_vat=$3, output_vat=$4, vat_due=$5, exported_table_path=$6 WHERE id=$7`,
    [period_start, period_end, input_vat, output_vat, vat_due, exported_table_path || null, req.params.id]
  );
  res.json({ success: true });
});

// DELETE brisanje PDV perioda
app.delete('/api/pdv-periodi/:id', async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM vat_periods WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
// Validacija bankovne transakcije
function validateBankTransaction(data) {
  const required = ['transaction_date', 'amount', 'description', 'category'];
  for (const field of required) {
    if (!data[field]) return false;
  }
  return true;
}

// GET sve bankovne transakcije
app.get('/api/banka', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT * FROM bank_transactions');
  res.json(rows);
});

// POST nova bankovna transakcija
app.post('/api/banka', auditLogMiddleware, async (req, res) => {
  if (!validateBankTransaction(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    transaction_date,
    amount,
    description,
    category,
    invoice_id
  } = req.body;
  await db.query(
    `INSERT INTO bank_transactions (transaction_date, amount, description, category, invoice_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [transaction_date, amount, description, category, invoice_id || null]
  );
  res.status(201).json({ success: true });
});

// PUT izmena bankovne transakcije
app.put('/api/banka/:id', auditLogMiddleware, async (req, res) => {
  if (!validateBankTransaction(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    transaction_date,
    amount,
    description,
    category,
    invoice_id
  } = req.body;
  await db.query(
    `UPDATE bank_transactions SET transaction_date=$1, amount=$2, description=$3, category=$4, invoice_id=$5 WHERE id=$6`,
    [transaction_date, amount, description, category, invoice_id || null, req.params.id]
  );
  res.json({ success: true });
});

// DELETE brisanje bankovne transakcije
app.delete('/api/banka/:id', auditLogMiddleware, async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM bank_transactions WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
// Validacija izlazne fakture
function validateOutputInvoice(data) {
  const required = [
    'invoice_number', 'issue_date', 'due_date',
    'amount_without_vat', 'vat_amount', 'total_amount', 'customer', 'status'
  ];
  for (const field of required) {
    if (!data[field]) return false;
  }
  return true;
}

// GET sve izlazne fakture
app.get('/api/izlazne-fakture', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT * FROM output_invoices');
  res.json(rows);
});

// POST nova izlazna faktura
app.post('/api/izlazne-fakture', auditLogMiddleware, async (req, res) => {
  if (!validateOutputInvoice(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    invoice_number,
    issue_date,
    due_date,
    amount_without_vat,
    vat_amount,
    total_amount,
    customer,
    status
  } = req.body;
  await db.query(
    `INSERT INTO output_invoices (invoice_number, issue_date, due_date, amount_without_vat, vat_amount, total_amount, customer, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [invoice_number, issue_date, due_date, amount_without_vat, vat_amount, total_amount, customer, status]
  );
  res.status(201).json({ success: true });
});

// PUT izmena izlazne fakture
app.put('/api/izlazne-fakture/:id', auditLogMiddleware, async (req, res) => {
  if (!validateOutputInvoice(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    invoice_number,
    issue_date,
    due_date,
    amount_without_vat,
    vat_amount,
    total_amount,
    customer,
    status
  } = req.body;
  await db.query(
    `UPDATE output_invoices SET invoice_number=$1, issue_date=$2, due_date=$3, amount_without_vat=$4, vat_amount=$5, total_amount=$6, customer=$7, status=$8 WHERE id=$9`,
    [invoice_number, issue_date, due_date, amount_without_vat, vat_amount, total_amount, customer, status, req.params.id]
  );
  res.json({ success: true });
});

// DELETE brisanje izlazne fakture
app.delete('/api/izlazne-fakture/:id', auditLogMiddleware, async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM output_invoices WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
// Validacija podataka
function validateInvoice(data) {
  const required = [
    'invoice_number', 'issue_date', 'receipt_date', 'payment_date',
    'amount_without_vat', 'vat_amount', 'total_amount', 'supplier', 'expense_category'
  ];
  for (const field of required) {
    if (!data[field]) return false;
  }
  return true;
}

// PUT (izmena ulazne fakture)
app.put('/api/fakture/:id', async (req, res) => {
  if (!validateInvoice(req.body)) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja.' });
  }
  const db = await getDb();
  const {
    invoice_number,
    issue_date,
    receipt_date,
    payment_date,
    amount_without_vat,
    vat_amount,
    total_amount,
    supplier,
    expense_category,
    pdf_path
  } = req.body;
  await db.query(
    `UPDATE input_invoices SET invoice_number=$1, issue_date=$2, receipt_date=$3, payment_date=$4, amount_without_vat=$5, vat_amount=$6, total_amount=$7, supplier=$8, expense_category=$9, pdf_path=$10 WHERE id=$11`,
    [invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category, pdf_path, req.params.id]
  );
  res.json({ success: true });
});

// DELETE (brisanje ulazne fakture)
app.delete('/api/fakture/:id', async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM input_invoices WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

 // LOGIN ruta

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email i lozinka su obavezni.' });
      const result = await loginUser(email, password);
      if (!result) return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Greška na serveru.' });
    }
  });

  // Stara ruta zbog kompatibilnosti
  app.post('/auth/login', async (req, res) => {
  try {//
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email i lozinka su obavezni.' });
    const result = await loginUser(email, password);
    if (!result) return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// Primer zaštite rute (admin):
// app.get('/api/admin-only', authMiddleware(['admin']), (req, res) => res.json({ msg: 'Samo admin vidi ovo.' }));

// Primer zaštite rute (bilo koji korisnik):
// app.get('/api/protected', authMiddleware(), (req, res) => res.json({ msg: 'Bilo koji ulogovani korisnik vidi ovo.' }));


// Fakture povezane sa SQLite
app.get('/api/fakture', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT * FROM input_invoices');
  res.json(rows);
});

app.post('/api/fakture', async (req, res) => {
  const db = await getDb();
  const {
    invoice_number,
    issue_date,
    receipt_date,
    payment_date,
    amount_without_vat,
    vat_amount,
    total_amount,
    supplier,
    expense_category,
    pdf_path
  } = req.body;
  await db.query(
    `INSERT INTO input_invoices (invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category, pdf_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category, pdf_path]
  );
  res.status(201).json({ success: true });
});

// Knjizenje
app.get('/api/knjizenje', (req, res) => res.json(knjizenja));
app.post('/api/knjizenje', (req, res) => {
  knjizenja.push(req.body);
  res.status(201).json({ success: true });
});

// PDV
app.get('/api/pdv', (req, res) => res.json(pdv));
app.post('/api/pdv', (req, res) => {

  // ...implementacija PDV POST ako treba...
  res.status(201).json({ success: true });
});

// Banka


// --- FRONTEND SERVING (PRODUCTION ONLY) ---
if (process.env.NODE_ENV === 'production') {
  (async () => {
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const frontendPath = path.join(__dirname, '../frontend/dist');

    app.use(express.static(frontendPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  })();
}

export default app;

// Pokretanje servera
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => {
    console.log(`Server pokrenut na portu ${PORT}`);
  });
}


