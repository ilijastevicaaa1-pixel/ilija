import { invoiceAmounts, decimalUnits } from './amounts.mjs';

export function validIban(value) {
  const iban = String(value || '').replace(/\s/g,'').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const expanded = (iban.slice(4)+iban.slice(0,4)).replace(/[A-Z]/g,char=>String(char.charCodeAt(0)-55));
  let remainder = 0;
  for (const digit of expanded) remainder = (remainder*10+Number(digit))%97;
  return remainder === 1;
}
export function profileIssues(profile) {
  const value = profile || {}, issues = [];
  for (const [field,label] of [['name','názov dodávateľa'],['street','adresa dodávateľa'],['city','mesto dodávateľa'],['postal_code','PSČ dodávateľa'],['register_info','zápis dodávateľa v registri']]) if (typeof value[field] !== 'string' || !value[field].trim()) issues.push(label);
  if (!/^\d{8}$/.test(value.ico || '')) issues.push('IČO dodávateľa (8 číslic)');
  if (!/^\d{10}$/.test(value.dic || '')) issues.push('DIČ dodávateľa (10 číslic)');
  if (typeof value.vat_payer !== 'boolean') issues.push('stav platiteľa DPH');
  if (value.vat_payer && !/^SK\d{10}$/.test(value.vat_id || '')) issues.push('IČ DPH dodávateľa');
  if (!validIban(value.iban)) issues.push('platný IBAN dodávateľa');
  if (value.country !== 'SK') issues.push('PDF podporuje tuzemské plnenie dodávateľa zo Slovenska');
  return issues;
}
export function invoiceBillingIssues(invoice, issuer = invoice?.billing_details?.issuer) {
  const issues = profileIssues(issuer), details = invoice?.billing_details || {};
  if (!invoice?.invoice_number) issues.push('číslo faktúry');
  if (!String(invoice?.party ?? invoice?.customer ?? '').trim()) issues.push('názov alebo meno odberateľa');
  if (typeof details.customer_address !== 'string' || !details.customer_address.trim()) issues.push('adresa odberateľa');
  if (details.customer_country !== 'SK') issues.push('PDF podporuje tuzemské plnenie odberateľovi na Slovensku');
  const validDate=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
  if (!validDate(details.delivery_date)) issues.push('dátum dodania');
  if (!validDate(invoice?.issue_date)) issues.push('dátum vystavenia');
  if (!validDate(invoice?.due_date) || invoice.due_date < invoice.issue_date) issues.push('dátum splatnosti');
  if (invoice?.currency !== 'EUR') issues.push('PDF podporuje faktúry v EUR');
  if (invoice?.status === 'draft') issues.push('koncept najprv uložte ako faktúru');
  if (!Array.isArray(invoice?.items) || !invoice.items.length) issues.push('rozpis položiek');
  else {
    if (invoice.items.length>250 || invoice.items.some(item=>!item || typeof item.name!=='string' || !item.name.trim() || !Number.isFinite(Number(item.qty)) || Number(item.qty)<0.001 || Number(item.qty)>1e6 || item.price==null || !Number.isFinite(Number(item.price)) || Number(item.price)<0 || Number(item.price)>1e7 || item.vat==null || !Number.isFinite(Number(item.vat)) || Number(item.vat)<0 || Number(item.vat)>100)) issues.push('platné názvy, množstvá, ceny a DPH položiek');
    if (issuer?.vat_payer && invoice.items.some(item => !(Number(item?.vat)>0))) issues.push('nulová DPH a osobitné režimy vyžadujú samostatné spracovanie');
    if (issuer?.vat_payer === false && invoice.items.some(item => !item || Number(item.vat)!==0)) issues.push('neplatiteľ DPH musí mať pri každej položke DPH 0');
    try {
      const amounts = invoiceAmounts(invoice.items);
      for (const [key,cents] of [['amount_without_vat',amounts.net],['vat_amount',amounts.vat],['total_amount',amounts.net+amounts.vat]]) {
        if (invoice[key] == null || decimalUnits(invoice[key],2)!==cents) throw new Error('totals');
      }
    } catch { issues.push('uložené sumy musia súhlasiť s položkami'); }
  }
  return issues;
}
export function invoiceTaxGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const rate = Number(item.vat).toFixed(2), amounts = invoiceAmounts([item]);
    const group = groups.get(rate) || {rate:Number(rate),net:0,vat:0};
    group.net += amounts.net; group.vat += amounts.vat; groups.set(rate,group);
  }
  return [...groups.values()].sort((a,b)=>a.rate-b.rate);
}
