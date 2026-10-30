import { createHash } from 'node:crypto';
import { HttpError, id, transaction } from './validation.js';
import { companyProfileInput, PROFILE_FIELDS } from './company-profile.js';

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 100000;
// Fixed business fields keep credentials, connection strings and future secrets out of exports.
export const BACKUP_TABLES = Object.freeze({
  bank_accounts: 'id,company_id,name,iban,bic,currency,created_at',
  stock_items: 'id,company_id,code,name,unit,price,quantity,created_at',
  input_invoices: 'id,company_id,invoice_number,issue_date,due_date,receipt_date,payment_date,supplier,supplier_name,amount_without_vat,net_amount,amount,vat_amount,vat,total_amount,currency,status,expense_category,description,items,billing_details,created_at',
  output_invoices: 'id,company_id,invoice_number,date,issue_date,due_date,payment_date,customer,customer_name,amount_without_vat,net_amount,amount,vat_amount,vat,total_amount,currency,status,description,items,billing_details,created_at,updated_at',
  bank_transactions: 'id,company_id,account_id,transaction_date,amount,description,currency,variable_symbol,invoice_id,invoice_type,import_ref,created_at',
  stock_movements: 'id,company_id,item_id,direction,quantity,unit_price,movement_date,note,invoice_id,invoice_type,balance_after,created_at',
  app_documents: 'id,company_id,kind,title,document_date,partner,amount,currency,note,created_at',
  app_state: 'company_id,user_id,key,value,version,updated_at',
});
const invalid = () => new HttpError(400, 'Záloha má neplatný formát alebo poškodené údaje.');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const payloadOf = value => ({ format: value.format, version: value.version, createdAt: value.createdAt, company: value.company, members: value.members, tables: value.tables });
export const backupCounts = backup => Object.fromEntries(Object.entries(backup.tables).map(([table, rows]) => [table, rows.length]));

export function validateBusinessBackup(value) {
  if (!object(value) || value.format !== 'aap-business-backup' || value.version !== 1 ||
      Object.keys(value).some(key => !['format','version','createdAt','company','members','tables','sha256'].includes(key)) ||
      !/^\d{4}-\d{2}-\d{2}T/.test(value.createdAt || '') || !Number.isFinite(Date.parse(value.createdAt)) ||
      !object(value.company) || !Number.isSafeInteger(value.company.id) || value.company.id < 1 || typeof value.company.name !== 'string' ||
      Object.keys(value.company).some(key => !['id','name','created_at','profile','profile_version','profile_updated_at'].includes(key)) ||
      !Array.isArray(value.members) || value.members.length > MAX_ROWS || !object(value.tables) ||
      Object.keys(value.tables).length !== Object.keys(BACKUP_TABLES).length) throw invalid();
  if (value.company.profile != null) {
    if (!object(value.company.profile) || Object.keys(value.company.profile).some(key=>!PROFILE_FIELDS.includes(key))) throw invalid();
    companyProfileInput(value.company.profile);
  }
  let rows = 0;
  const members = new Set();
  for (const member of value.members) {
    if (!object(member) || Object.keys(member).some(key => !['id','email'].includes(key)) ||
        !Number.isSafeInteger(member.id) || member.id < 1 || typeof member.email !== 'string' || !member.email || members.has(member.id)) throw invalid();
    members.add(member.id);
  }
  for (const [table, columns] of Object.entries(BACKUP_TABLES)) {
    const records = value.tables[table], allowed = new Set(columns.split(',')), identifiers = new Set();
    if (!Array.isArray(records)) throw invalid();
    rows += records.length;
    if (rows > MAX_ROWS) throw invalid();
    for (const record of records) {
      if (!object(record) || record.company_id !== value.company.id || Object.keys(record).some(column => !allowed.has(column))) throw invalid();
      const key = table === 'app_state' ? `${record.user_id}:${record.key}` : record.id;
      if (table === 'app_state' ? !members.has(record.user_id) || !['budget','deadlines'].includes(record.key) : !Number.isSafeInteger(key) || key < 1) throw invalid();
      if (identifiers.has(key)) throw invalid();
      identifiers.add(key);
    }
  }
  const payload = payloadOf(value), json = JSON.stringify(payload);
  if (Buffer.byteLength(json) > MAX_BACKUP_BYTES || typeof value.sha256 !== 'string' || digest(payload) !== value.sha256) throw invalid();
  return value;
}

export async function snapshotBusinessData(db, companyId, createdAt = new Date().toISOString()) {
  companyId = id(companyId);
  const client = await db.connect();
  try {
    // Every table is read from the same committed database snapshot.
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const company = (await client.query('SELECT id,name,created_at,profile,profile_version,profile_updated_at FROM app_companies WHERE id=$1', [companyId])).rows[0];
    if (!company) throw new HttpError(404, 'Firma neexistuje.');
    const members = (await client.query('SELECT id,email FROM users WHERE company_id=$1 ORDER BY id', [companyId])).rows;
    const tables = {};
    let bytes = 0, rows = 0;
    for (const [table, columns] of Object.entries(BACKUP_TABLES)) {
      // Bound the response before transferring large document or JSON fields to Node.
      const size = (await client.query(`SELECT COUNT(*)::integer AS rows, COALESCE(SUM(octet_length(row_to_json(b)::text)),0)::float8 AS bytes FROM (SELECT ${columns} FROM ${table} WHERE company_id=$1) b`, [companyId])).rows[0];
      bytes += Number(size.bytes); rows += size.rows;
      if (bytes > MAX_BACKUP_BYTES || rows > MAX_ROWS) throw new HttpError(413, 'Údaje presahujú limit lokálnej zálohy 20 MB alebo 100 000 záznamov. Kontaktujte správcu.');
      tables[table] = (await client.query(`SELECT ${columns} FROM ${table} WHERE company_id=$1 ORDER BY ${table === 'app_state' ? 'user_id,key' : 'id'}`, [companyId])).rows;
    }
    await client.query('COMMIT');
    const payload = JSON.parse(JSON.stringify({ format: 'aap-business-backup', version: 1, createdAt, company, members, tables }));
    return validateBusinessBackup({ ...payload, sha256: digest(payload) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

// Restore is an explicit maintenance action into an empty company; never overwrite live records.
export async function restoreBusinessData(db, backup, targetCompanyId) {
  validateBusinessBackup(backup);
  const companyId = id(targetCompanyId);
  return transaction(db, async client => {
    await client.query(`LOCK TABLE ${Object.keys(BACKUP_TABLES).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
    const targetCompany=(await client.query('SELECT id,profile FROM app_companies WHERE id=$1 FOR UPDATE', [companyId])).rows[0];
    if (!targetCompany) throw new HttpError(404, 'Cieľová firma neexistuje.');
    if (backup.company.profile && targetCompany.profile) throw new HttpError(409,'Cieľová firma už má údaje dodávateľa. Použite novú prázdnu firmu.');
    for (const table of Object.keys(BACKUP_TABLES)) {
      if ((await client.query(`SELECT 1 FROM ${table} WHERE company_id=$1 LIMIT 1`, [companyId])).rowCount) throw new HttpError(409, 'Obnova je povolená iba do prázdnej firmy. Existujúce údaje neboli zmenené.');
    }
    const targetMembers = (await client.query('SELECT id,email FROM users WHERE company_id=$1', [companyId])).rows;
    const userMap = new Map(backup.members.map(member => [member.id, targetMembers.find(target => target.email.toLowerCase() === member.email.toLowerCase())?.id]));
    const maps = Object.fromEntries(Object.keys(BACKUP_TABLES).map(table => [table, new Map()]));
    const reference = (table, value) => {
      if (value == null) return null;
      const mapped = maps[table].get(value);
      if (!mapped) throw invalid();
      return mapped;
    };
    for (const [table, columns] of Object.entries(BACKUP_TABLES)) {
      for (const source of backup.tables[table]) {
        const row = { ...source, company_id: companyId };
        delete row.id;
        if (table === 'app_state') {
          row.user_id = userMap.get(source.user_id);
          if (!row.user_id) throw new HttpError(409, 'Pre obnovenie rozpočtu a úloh vytvorte v cieľovej firme účet s rovnakým e-mailom ako v zálohe.');
        }
        if (table === 'bank_transactions') row.account_id = reference('bank_accounts', row.account_id);
        if (table === 'stock_movements') row.item_id = reference('stock_items', row.item_id);
        if (['bank_transactions','stock_movements'].includes(table) && row.invoice_id != null) {
          if (!['input','output'].includes(row.invoice_type)) throw invalid();
          row.invoice_id = reference(row.invoice_type + '_invoices', row.invoice_id);
        }
        if (['input_invoices','output_invoices'].includes(table)) {
          if (!Array.isArray(row.items)) throw invalid();
          row.items = row.items.map(item => ({ ...item, ...(item.stock_item_id != null ? { stock_item_id: reference('stock_items', item.stock_item_id) } : {}) }));
        }
        const names = columns.split(',').filter(column => column !== 'id' && Object.hasOwn(row, column));
        const values = names.map(column => ['items','value','billing_details'].includes(column) ? JSON.stringify(row[column]) : row[column]);
        const result = await client.query(`INSERT INTO ${table}(${names.join(',')}) VALUES(${names.map((_, index) => '$' + (index + 1)).join(',')}) RETURNING ${table === 'app_state' ? 'user_id' : 'id'}`, values);
        if (table !== 'app_state') maps[table].set(source.id, result.rows[0].id);
      }
    }
    if (backup.company.profile) await client.query('UPDATE app_companies SET name=$1,profile=$2,profile_version=1,profile_updated_at=now() WHERE id=$3',[backup.company.profile.name,JSON.stringify(backup.company.profile),companyId]);
    return { restored: true, counts: backupCounts(backup) };
  });
}
