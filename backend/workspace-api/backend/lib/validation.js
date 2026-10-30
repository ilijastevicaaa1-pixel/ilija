import { decimalUnits, invoiceAmounts } from '../../shared/amounts.mjs';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function text(value, label, { required = false, max = 500 } = {}) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw new HttpError(400, `Skontrolujte pole: ${label}.`);
  }
  return value.trim();
}

export function number(value, label, { min = 0, max = 1e9 } = {}) {
  if (value == null || !['string','number'].includes(typeof value) || (typeof value==='string' && !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value.trim()))) throw new HttpError(400, `Vyplňte pole: ${label}.`);
  const result = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  if (!Number.isFinite(result) || result < min || result > max) throw new HttpError(400, `Neplatná hodnota: ${label}.`);
  return result;
}

export const money = (value, label, options) => decimalUnits(number(value, label, options),2) / 100;
export function date(value, label, required = false) {
  if (!value && !required) return null;
  const result = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) {
    throw new HttpError(400, `Neplatný dátum: ${label}.`);
  }
  return result;
}
export function id(value) {
  if(!['string','number'].includes(typeof value)||(typeof value==='string'&&!/^[1-9]\d*$/.test(value)))throw new HttpError(400,'Neplatné číslo záznamu.');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1) throw new HttpError(400, 'Neplatné číslo záznamu.');
  return result;
}
export const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export async function transaction(db, action) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export function invoiceInput(value, type) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Neplatná faktúra.');
  if (value.items != null && (!Array.isArray(value.items) || value.items.length > 250)) throw new HttpError(400, 'Neplatné položky faktúry.');
  const items = (value.items || []).map(item => ({
    name: text(item?.name, 'Názov položky', { required: true, max: 250 }),
    unit: text(item?.unit, 'Jednotka', { max: 20 }),
    qty: number(item.qty, 'Množstvo', { min: 0.001, max: 1e6 }),
    price: money(item.price, 'Jednotková cena', { max: 1e7 }),
    vat: number(item.vat, 'Sadzba DPH', { max: 100 }),
    stock_item_id: item.stock_item_id ? id(item.stock_item_id) : null,
  }));
  for(const item of items){
    if(Math.abs(decimalUnits(item.qty,3)/1000-item.qty)>1e-10)throw new HttpError(400,'Množstvo môže mať najviac tri desatinné miesta.');
    if(Math.abs(decimalUnits(item.vat,2)/100-item.vat)>1e-10)throw new HttpError(400,'Sadzba DPH môže mať najviac dve desatinné miesta.');
  }
  let netCents = 0, vatCents = 0;
  if (items.length) {
    try{const totals=invoiceAmounts(items);netCents=totals.net;vatCents=totals.vat;}
    catch{throw new HttpError(400,'Suma faktúry je príliš vysoká.');}
  } else {
    netCents = decimalUnits(money(value.amount_without_vat ?? value.net_amount ?? value.amount, 'Základ dane'),2);
    vatCents = decimalUnits(money(value.vat_amount ?? value.vat ?? 0, 'DPH'),2);
  }
  const total = (netCents + vatCents) / 100;
  if (total > 1e9) throw new HttpError(400, 'Suma faktúry je príliš vysoká.');
  if (value.total_amount != null && Math.abs(money(value.total_amount, 'Celkom') - total) > 0.001) {
    throw new HttpError(400, 'Súčet položiek nesúhlasí s celkovou sumou.');
  }
  const issueDate = date(value.issue_date ?? value.date, 'Vystavenie', true);
  const dueDate = date(value.due_date, 'Splatnosť');
  if (dueDate && dueDate < issueDate) throw new HttpError(400, 'Splatnosť nesmie byť pred vystavením.');
  const currency = text(value.currency || 'EUR', 'Mena', { max: 3 }).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, 'Zadajte trojpísmenový kód meny.');
  const status = value.status || 'unpaid';
  if (!['unpaid', 'paid', 'draft'].includes(status)) throw new HttpError(400, 'Neplatný stav faktúry.');
  return {
    invoice_number: text(value.invoice_number, 'Číslo faktúry', { required: true, max: 100 }),
    party: text(type === 'input' ? value.supplier ?? value.supplier_name : value.customer ?? value.customer_name, type === 'input' ? 'Dodávateľ' : 'Odberateľ', { required: true, max: 250 }),
    issue_date: issueDate, due_date: dueDate, payment_date: date(value.payment_date, 'Úhrada'),
    amount_without_vat: netCents / 100, vat_amount: vatCents / 100, total_amount: total,
    currency, status, items,
    description: text(value.description ?? value.note, 'Poznámka', { max: 10000 }),
    expense_category: text(value.expense_category, 'Kategória', { max: 100 }),
  };
}
