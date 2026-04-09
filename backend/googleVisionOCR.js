// Modul za AI OCR sa Google Vision API
// Potrebno je imati Google Cloud credentials i enable-ovan Vision API

import vision from '@google-cloud/vision';
import path from 'path';

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.resolve('gen-lang-client-0758623437-4e666dc7f8e1.json') // Putanja do service account JSON fajla
});

export async function extractTextWithGoogleVision(buffer) {
  const [result] = await client.documentTextDetection({
    image: { content: buffer }
  });
  const text = result.fullTextAnnotation?.text || '';
  return text;
}
