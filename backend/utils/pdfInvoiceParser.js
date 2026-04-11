import fs from 'fs';
import { PDFParse } from 'pdf-parse';

// Osnovni parser za PDF ulazne fakture
export async function parsePdfInvoice(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const data = await new PDFParse(buffer).parse();
  const text = data.text;

  // Naivno parsiranje osnovnih polja (prilagoditi prema PDF formatu)
  const invoice_number = (text.match(/Broj fakture[:\s]+([\w\d\/-]+)/i) || [])[1] || '';
  const issue_date = (text.match(/Datum[:\s]+([\d\.\/-]+)/i) || [])[1] || '';
  const supplier = (text.match(/Dobavljač[:\s]+([\w\s\d\.\-]+)/i) || [])[1] || '';
  const amount = parseFloat((text.match(/Iznos[:\s]+([\d\.,]+)/i) || [])[1]?.replace(',', '.') || '0');

  // Items ekstrakcija može biti unapređena
  const items = [];

  return {
    invoice_number,
    issue_date,
    supplier,
    amount,
    items,
    rawText: text
  };
}
