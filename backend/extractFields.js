// Modul za automatsko prepoznavanje polja iz OCR teksta
// Ključna polja: dobavljač, kupac, datum, iznos, PDV, stavke

export function extractInvoiceFields(ocrText) {
  // Osnovni regex za prepoznavanje polja
  const fields = {};
  fields.invoiceNumber = ocrText.match(/broj\s*fakture\s*:?\s*(\S+)/i)?.[1] || '';
  fields.supplier = ocrText.match(/dobavljač\s*:?\s*([\w\s]+)/i)?.[1] || '';
  fields.customer = ocrText.match(/kupac\s*:?\s*([\w\s]+)/i)?.[1] || '';
  fields.date = ocrText.match(/datum\s*:?\s*([0-9\.\/-]+)/i)?.[1] || '';
  fields.amount = ocrText.match(/iznos\s*:?\s*([0-9\.,]+)/i)?.[1] || '';
  fields.vat = ocrText.match(/pdv\s*:?\s*([0-9\.,]+)/i)?.[1] || '';
  // Stavke: traži linije sa nazivom i iznosom
  fields.items = [];
  const itemRegex = /stavka\s*:?\s*([\w\s]+)\s*iznos\s*:?\s*([0-9\.,]+)/gi;
  let match;
  while ((match = itemRegex.exec(ocrText)) !== null) {
    fields.items.push({ name: match[1], amount: match[2] });
  }
  return fields;
}
