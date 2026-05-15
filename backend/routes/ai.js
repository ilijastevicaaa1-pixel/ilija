// AI faktura parser endpoint
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodeFetch from 'node-fetch';
import { parseFakturaAI } from '../ocr.js';

const router = express.Router();
const upload = multer({ dest: path.resolve('uploads/') });

// ===============================
//  OCR FAKTURA PARSER
// ===============================
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

    const result = await parseFakturaAI(req.file.path);
    fs.unlink(req.file.path, () => { });

    if (result.error && result.error.includes('model does not support image')) {
      return res.status(400).json({ error: 'AI model ne podržava slike. Koristi PDF format.' });
    }

    res.json({ items: result });
  } catch (e) {
    console.error('AI parse error:', e);
    res.status(500).json({ error: e.message || 'Greška u AI parsiranju.' });
  }
});

// ===============================
//  AI COMMAND — GLAVNI ASISTENT
// ===============================
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/command', async (req, res) => {
  try {
    const { text, context } = req.body;

    console.log('[AI /command] FULL REQUEST BODY:', req.body);

    console.log('[AI /command] text/context presence:', {
      hasText: typeof text === 'string' && text.trim().length > 0,
      hasContext: !!context
    });

    if (!text) {
      return res.status(400).json({ error: 'Nema teksta.' });
    }

    const apiKey = GROQ_API_KEY || OPENAI_API_KEY;
    console.log('[AI /command] apiKey config:', {
      GROQ_API_KEY_set: !!GROQ_API_KEY,
      OPENAI_API_KEY_set: !!OPENAI_API_KEY,
      usingGroq: !!GROQ_API_KEY
    });

    if (!apiKey) {
      return res.status(500).json({ error: 'AI ključ nije konfigurisan.' });
    }


    // ===============================
    //  PRIPREMA PORUKA SA KONTEKSTOM
    // ===============================
    const messages = [
      {
        role: 'system',
        content:
          'Si účtovný AI asistent. Odpovedáš stručne, presne, držíš sa kontextu a nikdy ho neignoruješ.'
      }
    ];

    if (context) {
      messages.push({
        role: 'assistant',
        content: `Aktuálny kontext: ${context}`
      });
    }

    messages.push({ role: 'user', content: text });

    // ===============================
    //  SLANJE AI MODELU
    // ===============================
    const body = {
      model: 'llama-3.1-8b-instant',
      messages,
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

    console.log('[AI] Sending to AI:', {
      url,
      model: body.model,
      preview: text.substring(0, 100) + '...'
    });

    let aiData;

    const aiRes = await nodeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    // Loguj raw telo da vidimo da li je response JSON i da li ima choices
    const rawText = await aiRes.text();

    try {
      aiData = rawText ? JSON.parse(rawText) : {};
    } catch {
      aiData = { raw: rawText };
    }

    console.log('[AI /command] HTTP STATUS:', aiRes.status);
    console.log('[AI /command] RAW RESPONSE:', rawText);
    console.log('[AI /command] Parsed JSON:', aiData);

    if (!aiData || !aiData.choices) {
      console.error('[AI /command] choices missing. Full parsed response:', aiData);
    }

    if (aiRes && !aiRes.ok) {
      console.error('[AI /command] Non-OK response status:', aiRes.status, 'body:', rawText);
    }



    if (aiData.error) {
      return res.status(400).json({ reply: aiData.error.message || 'Greška u AI.' });
    }

    const reply =
      aiData.choices?.[0]?.message?.content || 'AI odpoveď nie je dostupná.';

    // ===============================
    //  EKSTRAKCIJA NOVOG KONTEKSTA
    // ===============================
    const newContext = extractContext(reply, context);

    console.log('=== FINAL AI RESPONSE ===');
    console.log('reply:', reply);
    console.log('context:', newContext);

    res.json({ reply, context: newContext });
  } catch (e) {
    console.error('AI command error:', e);
    res.status(500).json({ error: e.message || 'Greška u AI.' });
  }
});

// ===============================
//  HELPER: PREPOZNAVANJE KONTEKSTA
// ===============================
function extractContext(reply, oldContext) {
  const r = reply.toLowerCase();

  if (r.includes('fakturácia') || r.includes('fakturacia')) return 'fakturacia';
  if (r.includes('vytvaranie faktur')) return 'fakturacia.vytvaranie';
  if (r.includes('ocr')) return 'fakturacia.ocr';
  if (r.includes('dph')) return 'dph';
  if (r.includes('bankové') || r.includes('bankove')) return 'banka';

  return oldContext || null;
}

export default router;


