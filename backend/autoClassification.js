// Modul za automatsko prepoznavanje PDV kategorija, rokova i obaveza

export function classifyPDV(fields) {
  // Osnovna klasifikacija PDV kategorije
  if (fields.vat && Number(fields.vat) > 0) {
    return 'Opšta PDV stopa';
  } else {
    return 'Oslobođeno PDV';
  }
}

export function extractDeadlines(ocrText) {
  // Prepoznavanje rokova i obaveza iz teksta
  const deadlines = [];
  const deadlineRegex = /rok\s*:?\s*([0-9\.\/-]+)/gi;
  let match;
  while ((match = deadlineRegex.exec(ocrText)) !== null) {
    deadlines.push(match[1]);
  }
  return deadlines;
}
