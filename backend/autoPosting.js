// Modul za automatsko knjiženje na osnovu prepoznatih podataka
// Predlog knjiženja, korisnik potvrđuje

export function suggestPosting(fields) {
  // Osnovni predlog knjiženja
  return {
    account: fields.items && fields.items.length > 0 ? 'Troškovni račun' : 'Glavni račun',
    amount: fields.amount || '',
    vat: fields.vat || '',
    date: fields.date || '',
    supplier: fields.supplier || '',
    customer: fields.customer || '',
    items: fields.items || [],
    description: `Knjiženje fakture ${fields.invoiceNumber || ''}`
  };
}
