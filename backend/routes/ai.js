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
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;
const LLAMA_URL = process.env.LLAMA_URL;


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

    const apiKey = GROQ_API_KEY || OPENAI_API_KEY || LLAMA_API_KEY;
    const usingGroq = !!GROQ_API_KEY;
    console.log('[AI /command] apiKey config:', {
      GROQ_API_KEY_set: !!GROQ_API_KEY,
      OPENAI_API_KEY_set: !!OPENAI_API_KEY,
      LLAMA_API_KEY_set: !!LLAMA_API_KEY,
      usingGroq
    });


    if (!apiKey) {
      // Ne blokiraj "pozdrav" i sitne poruke kad AI nije podešen.
      // Ovo sprečava 500 na frontu (npr. "ahoj").
      const t = String(text).toLowerCase();
      if (
        t.includes('ahoj') ||
        t.includes('hello') ||
        t.includes('dobry den') ||
        t.includes('dobrý deň') ||
        t.includes('zdrav') ||
        t.includes('nazdrav') ||
        t.includes('pozdrav')
      ) {
        return res.json({ reply: 'Dobrý deň! Vyberte prosím číslo z menu.' });
      }

      return res.status(500).json({ error: 'AI ključ nije konfigurisan.' });
    }


    // --- ACTION PARSER ---
    function tryParseJSON(str) {
      if (!str || typeof str !== 'string') return null;
      const trimmed = str.trim();
      // skini ```json ... ``` ako model to doda
      const cleaned = trimmed.replace(/^```json/i, '').replace(/```$/i, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }

    async function executeAction(action, params = {}) {
      const BASE_URL = process.env.AI_INTERNAL_BASE_URL || 'http://localhost:10000';

      switch (action) {
        case 'LIST_INVOICES':
          return await nodeFetch(`${BASE_URL}/api/fakture`).then(r => r.json());

        case 'ANALYZE_VAT':
          return await nodeFetch(`${BASE_URL}/api/vat/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          }).then(r => r.json());

        case 'SUGGEST_LEDGER':
          return await nodeFetch(`${BASE_URL}/api/ledger/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          }).then(r => r.json());

        case 'MONTHLY_REPORT':
          return { message: 'MONTHLY_REPORT još nije implementiran na backendu.' };

        case 'YEARLY_REPORT':
          return { message: 'YEARLY_REPORT još nije implementiran na backendu.' };

        case 'CUSTOM_REPORT':
          return {
            message: 'CUSTOM_REPORT još nije implementiran na backendu.',
            params
          };

        case 'MATCH_BANK':
          return { message: 'MATCH_BANK još nije implementiran na backendu.' };

        default:
          return { message: 'Neznáma akcia.' };
      }
    }

    // ===============================
    //  PRIPREMA PORUKA SA KONTEKSTOM
    // ===============================
    const messages = [
      {
        role: 'system',
        content:
          'Si účtovný AI asistent. Odpovedáš stručne, presne, držíš sa kontextu a nikdy ho neignoruješ. ' +
          'Ak vieš, odpovedaj v ČISTOM JSON formáte bez komentárov, bez vysvetlení, bez textu okolo. ' +
          'Formát: {"action":"...","params":{...},"context":{...}}. Ak nevieš akciu, odpovedz obyčajným textom.'
      }
    ];

    if (context) {
      messages.push({
        role: 'assistant',
        content: `Aktuálny kontext: ${JSON.stringify(context)}`
      });
    }

    messages.push({ role: 'user', content: text });

    // ===============================
    //  SLANJE AI MODELU
    // ===============================
    const body = {
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.4,
      max_tokens: 512
    };

    const url = GROQ_API_KEY
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : (LLAMA_URL || 'https://api.openai.com/v1/chat/completions');


    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    };

    console.log('[AI] Sending to AI:', {
      url,
      model: body.model,
      preview: text.substring(0, 100) + '...'
    });

    const aiRes = await nodeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const rawText = await aiRes.text();
    console.log('[AI] LLAMA/raw diagnostics:', {
      status: aiRes.status,
      contentType: aiRes.headers.get('content-type'),
      textHead: rawText ? rawText.slice(0, 2000) : ''
    });
    let aiData;

    try {
      aiData = rawText ? JSON.parse(rawText) : {};
    } catch {
      aiData = { raw: rawText };
    }

    console.log('[AI /command] HTTP STATUS:', aiRes.status);
    console.log('[AI /command] RAW RESPONSE:', rawText);
    console.log('[AI /command] Parsed JSON:', aiData);

    if (aiData.error) {
      return res.status(400).json({ reply: aiData.error.message || 'Greška u AI.' });
    }

    // Robust extractor (OpenAI/Groq style + possible LLAMA variants)
    const reply =
      aiData?.choices?.[0]?.message?.content ||
      aiData?.choices?.[0]?.text ||
      aiData?.output ||
      aiData?.response ||
      aiData?.message ||
      (rawText ? rawText.slice(0, 1200) : null) ||
      'AI odpoveď nie je dostupná.';


    // Pokušaj da parsiraš JSON akciju
    const parsed = tryParseJSON(reply);

    // If model returns JSON but we can't run any known action,
    // return the model's message/context instead of falling back to "Neznáma akcia."
    if (parsed && typeof parsed === 'object' && parsed.action) {
      const result = await executeAction(parsed.action, parsed.params || {});
      const resultJson = result && typeof result === 'object' ? result : { message: String(result) };

      // Keep content if action isn't implemented
      if (resultJson && resultJson.message && resultJson.message !== 'Neznáma akcia.') {
        return res.json({
          answer: JSON.stringify(resultJson, null, 2),
          context: parsed.context || context || null
        });
      }

      // Unknown action -> still show raw model JSON
      return res.json({
        answer: JSON.stringify({ rawModelAction: parsed.action, ...resultJson, modelReply: reply }, null, 2),
        context: parsed.context || context || null
      });
    }


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
  const r = (reply || '').toLowerCase();

  if (r.includes('fakturácia') || r.includes('fakturacia')) return 'fakturacia';
  if (r.includes('vytvaranie faktur')) return 'fakturacia.vytvaranie';
  if (r.includes('ocr')) return 'fakturacia.ocr';
  if (r.includes('dph')) return 'dph';
  if (r.includes('bankové') || r.includes('bankove')) return 'banka';

  return oldContext || null;
}

export default router;


