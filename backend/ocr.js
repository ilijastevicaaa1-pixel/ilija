// AI OCR modul za čitanje faktura
// Koristi Tesseract.js za ekstrakciju teksta iz PDF/JPG/PNG
import Tesseract from 'tesseract.js';
import nodeFetch from 'node-fetch';

export async function extractTextFromImage(imagePath) {
  const result = await Tesseract.recognize(imagePath, 'srp', {
    logger: m => console.log(m)
  });
  return result.data.text;
}

// Napredna AI funkcija za parsiranje fakture iz teksta
export async function parseFakturaAI(filePath) {
  const text = await extractTextFromImage(filePath);
  if (!text || typeof text !== 'string') {
    return { error: 'Tekst je prazan ili nije validan nakon ekstrakcije.', details: 'OCR nije vratio tekst.' };
  }

  // Prompt za LLM: izvuci sva relevantna polja iz fakture
  const prompt = `Ekstraktuj iz sledećeg teksta fakture sva relevantna polja u JSON formatu. Polja: broj_fakture, datum, dobavljač, kupac, iznos, pdv, valuta, stavke (naziv, kolicina, cena, iznos), opis. Ako nešto nije navedeno, stavi null. Tekst:\n"""\n${text}\n"""`;
  const body = {
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: 'Ti si AI za ekstrakciju podataka iz faktura. Vraćaš samo JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.0,
    max_tokens: 1024
  };
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY nije podešen. Proverite environment varijable.");
  }
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  let aiRes, aiData, extracted;
  try {
    aiRes = await nodeFetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    aiData = await aiRes.json();
    const content = aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content;
    extracted = JSON.parse(content);
    } catch (e) {
    extracted = { error: 'AI ekstrakcija nije uspela', details: e.message };
  }
  return extracted;
}
