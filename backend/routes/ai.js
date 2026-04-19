// AI faktura parser endpoint
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodeFetch from 'node-fetch';
import { parseFakturaAI } from '../ocr.js';

const router = express.Router();
const upload = multer({ dest: path.resolve('uploads/') });

// POST /api/ai/parse-faktura
router.post('/parse-faktura', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nema fajla.' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      return res.status(400).json({ error: 'AI ne podržava slike. Koristi PDF format.' });
    }
    if (!['.pdf'].includes(ext)) {
      return res.status(400).json({ error: 'Nepodržan format. Koristi PDF.' });
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

// POST /api/ai/command
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/command', async (req, res) => {
  try {
    const { text, image } = req.body;
    console.log('[AI /command] Request received:', { hasText: !!text, hasImage: !!image, imageType: typeof image });
    if (image) {
      console.log('[AI /command] Image received but blocked');
      return res.status(400).json({ reply: 'AI asistent trenutno ne podržava slike. Koristi tekstualni opis fakture.' });
    }
    if (!text) {
      return res.status(400).json({ error: 'Nema teksta.' });
    }
    const apiKey = GROQ_API_KEY || OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI ključ nije konfigurisan.' });
    }
    const body = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Ti si knjigovodstveni AI asistent. Odgovaraš kratko i precizno na srpskom jeziku.' },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      max_tokens: 512
    };
    const url = GROQ_API_KEY
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    const aiRes = await nodeFetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const aiData = await aiRes.json();
    console.log('[AI /command] Response:', aiData);
    if (aiData.error) {
      return res.status(400).json({ reply: aiData.error.message || 'Greška u AI.' });
    }
    const reply = aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content;
    res.json({ reply: reply || 'AI odgovor nije dostupan.' });
  } catch (e) {
    console.error('AI command error:', e);
    res.status(500).json({ error: e.message || 'Greška u AI.' });
  }
});

export default router;
