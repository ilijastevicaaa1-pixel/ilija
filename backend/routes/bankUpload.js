// bankUpload.js
import express, { Router } from 'express';
const router = Router();
import multer from 'multer';
import path from 'path';
import { parseBankCsv, parseBankExcel } from '../utils/bankCsvParser.js';

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    let transactions = [];
    if (ext === '.csv') {
      transactions = await parseBankCsv(req.file.path);
    } else if (ext === '.xls' || ext === '.xlsx') {
      transactions = await parseBankExcel(req.file.path);
    } else {
      return res.status(400).json({ error: 'Nepodržan format fajla.' });
    }
    // Napredna validacija: označi neprepoznata polja
    const requiredFields = ['date', 'description', 'amount', 'account', 'type'];
    const unrecognized = transactions.map(tx => {
      return requiredFields.filter(f => !tx[f] || tx[f] === '');
    });
    res.json({ transactions, unrecognized });
  } catch (err) {
    res.status(500).json({ error: 'Greška pri parsiranju fajla', details: err.message });
  }
});

export default router;
