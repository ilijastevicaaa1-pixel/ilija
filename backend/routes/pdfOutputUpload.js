// pdfOutputUpload.js
import express, { Router } from 'express';
const router = Router();
import multer from 'multer';
import path from 'path';
import { parsePdfOutputInvoice } from '../../src/utils/pdfOutputInvoiceParser.js';

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    const pdfPath = path.resolve(req.file.path);
    const invoice = await parsePdfOutputInvoice(pdfPath);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Greška pri parsiranju PDF-a', details: err.message });
  }
});

export default router;
