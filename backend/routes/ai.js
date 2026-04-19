// AI faktura parser endpoint
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseFakturaAI } from '../ocr.js';

const router = express.Router();
const upload = multer({ dest: path.resolve('uploads/') });

// POST /api/ai/parse-faktura
router.post('/parse-faktura', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nema fajla.' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) {
      return res.status(400).json({ error: 'Nepodržan format. Dozvoljeni: PDF, PNG, JPG.' });
    }
    // Pozovi AI OCR logiku
    const result = await parseFakturaAI(req.file.path);
    // Očisti upload
    fs.unlink(req.file.path, () => {});
    if (result.error && result.error.includes('model does not support image')) {
      return res.status(400).json({ error: 'AI model ne podržava slike. Koristi PDF format.' });
    }
    res.json({ items: result });
  } catch (e) {
    console.error('AI parse error:', e);
    res.status(500).json({ error: e.message || 'Greška u AI parsiranju.' });
  }
});

export default router;
