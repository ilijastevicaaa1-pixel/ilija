import { randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { windowsProtect } from './lib/credential-store.js';
import { HttpError, id } from './lib/validation.js';
import { MAX_BACKUP_BYTES, snapshotBusinessData, validateBusinessBackup, backupCounts } from './lib/business-backup.js';

const compress = promisify(gzip), expand = promisify(gunzip);
const DAY = 24 * 60 * 60 * 1000, HOUR = DAY / 24, KEEP = 7;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const unavailable = () => new HttpError(503, 'Zálohu sa nepodarilo bezpečne uložiť alebo prečítať. Staršie kópie zostali zachované. Skúste to znova.');
const metadata = archive => ({ format: archive.format, version: archive.version, companyId: archive.companyId, id: archive.id, createdAt: archive.createdAt, counts: archive.counts });
const aad = archive => Buffer.from(JSON.stringify(metadata(archive)));
const context = archive => 'aap-backup-key-v1:' + archive.companyId + ':' + archive.id;
const info = archive => ({ id: archive.id, createdAt: archive.createdAt, counts: archive.counts, records: Object.values(archive.counts).reduce((sum, count) => sum + count, 0) });

export function createBackupService(db, { directory = fileURLToPath(new URL('./.private/backups/', import.meta.url)), protect = windowsProtect, now = () => Date.now() } = {}) {
  const pending = new Map(), failures = new Map();
  let started = false, closed = false, firstTimer, interval, tickPromise, globalFailure = '';
  const folder = companyId => path.join(directory, String(id(companyId)));
  const filename = (companyId, backupId) => {
    if (!uuid.test(backupId || '')) throw new HttpError(400, 'Neplatné označenie zálohy.');
    return path.join(folder(companyId), backupId + '.json');
  };
  async function archiveAt(companyId, backupId) {
    const file = filename(companyId, backupId), size = (await stat(file)).size;
    if (size > MAX_BACKUP_BYTES * 2) throw unavailable();
    const archive = JSON.parse(await readFile(file, 'utf8'));
    if (archive.format !== 'aap-local-backup' || archive.version !== 1 || archive.companyId !== companyId || archive.id !== backupId ||
        !Number.isFinite(Date.parse(archive.createdAt)) || !archive.counts || Object.values(archive.counts).some(count => !Number.isSafeInteger(count) || count < 0)) throw unavailable();
    return archive;
  }
  async function archives(companyId) {
    let files;
    try { files = await readdir(folder(companyId)); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const result = [];
    for (const name of files) {
      if (!name.endsWith('.json') || !uuid.test(name.slice(0, -5))) continue;
      try { result.push(await archiveAt(companyId, name.slice(0, -5))); }
      catch { failures.set(companyId, 'Niektorá zo záloh sa nedá prečítať. Vytvorte novú kópiu.'); }
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }
  async function decrypt(archive) {
    const key = Buffer.from(await protect('unprotect', archive.protectedKey, context(archive)), 'base64');
    if (key.length !== 32) throw unavailable();
    try {
      const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(archive.iv, 'base64'));
      cipher.setAAD(aad(archive)); cipher.setAuthTag(Buffer.from(archive.tag, 'base64'));
      const compressed = Buffer.concat([cipher.update(Buffer.from(archive.encrypted, 'base64')), cipher.final()]);
      const snapshot = validateBusinessBackup(JSON.parse((await expand(compressed, { maxOutputLength: MAX_BACKUP_BYTES + 4096 })).toString('utf8')));
      if (snapshot.company.id !== archive.companyId || snapshot.createdAt !== archive.createdAt || JSON.stringify(backupCounts(snapshot)) !== JSON.stringify(archive.counts)) throw unavailable();
      return snapshot;
    } finally { key.fill(0); }
  }
  async function create(companyId) {
    companyId = id(companyId);
    if (closed) throw unavailable();
    if (pending.has(companyId)) return pending.get(companyId);
    const operation = (async () => {
      let temporary, committed;
      try {
        const snapshot = await snapshotBusinessData(db, companyId, new Date(now()).toISOString());
        const archive = { format: 'aap-local-backup', version: 1, companyId, id: randomUUID(), createdAt: snapshot.createdAt, counts: backupCounts(snapshot) };
        const key = randomBytes(32), iv = randomBytes(12);
        try {
          archive.protectedKey = await protect('protect', key.toString('base64'), context(archive));
          const cipher = createCipheriv('aes-256-gcm', key, iv);
          cipher.setAAD(aad(archive));
          const compressed = await compress(Buffer.from(JSON.stringify(snapshot)));
          archive.iv = iv.toString('base64');
          archive.encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]).toString('base64');
          archive.tag = cipher.getAuthTag().toString('base64');
        } finally { key.fill(0); }
        await mkdir(folder(companyId), { recursive: true, mode: 0o700 });
        committed = filename(companyId, archive.id); temporary = committed + '.' + randomUUID() + '.tmp';
        await writeFile(temporary, JSON.stringify(archive), { flag: 'wx', mode: 0o600, flush: true });
        await rename(temporary, committed); temporary = null;
        // Verify the bytes actually saved before any older managed copies are removed.
        await decrypt(await archiveAt(companyId, archive.id));
        const verified = committed; committed = null;
        failures.delete(companyId);
        const saved = await archives(companyId);
        const retained = new Set([archive.id, ...saved.filter(old => old.id !== archive.id).slice(0, KEEP - 1).map(old => old.id)]);
        for (const old of saved) if (!retained.has(old.id) && filename(companyId, old.id) !== verified) await unlink(filename(companyId, old.id));
        return info(archive);
      } catch (error) {
        const message = error.status === 413 ? error.message : unavailable().message;
        failures.set(companyId, message);
        throw new HttpError(error.status === 413 ? 413 : 503, message);
      } finally {
        if (temporary) await unlink(temporary).catch(() => {});
        if (committed) await unlink(committed).catch(() => {});
      }
    })();
    pending.set(companyId, operation);
    try { return await operation; } finally { pending.delete(companyId); }
  }
  async function status(companyId) {
    companyId = id(companyId);
    const list = (await archives(companyId)).map(info);
    return { automatic: started && !closed, intervalHours: 24, retainedCopies: KEEP, busy: pending.has(companyId), lastSuccess: list[0]?.createdAt || null, warning: failures.get(companyId) || globalFailure || null, backups: list };
  }
  async function download(companyId, backupId) {
    companyId = id(companyId);
    try { return await decrypt(await archiveAt(companyId, backupId)); }
    catch (error) {
      if (error.code === 'ENOENT') throw new HttpError(404, 'Záloha neexistuje.');
      if (error.status === 400) throw error;
      throw unavailable();
    }
  }
  async function runDue() {
    if (closed) return [];
    if (tickPromise) return tickPromise;
    tickPromise = (async () => {
      const created = [];
      try {
        const companies = (await db.query('SELECT id FROM app_companies ORDER BY id')).rows;
        globalFailure = '';
        for (const company of companies) {
          if (closed) break;
          try {
            const latest = (await archives(company.id))[0], age = latest ? now() - Date.parse(latest.createdAt) : Infinity;
            if (age >= DAY || age < -DAY) created.push(await create(company.id));
          } catch { /* Status exposes a safe error without logging financial data. */ }
        }
      } catch { globalFailure = 'Automatická kontrola záloh sa nepodarila. Skontrolujte pripojenie databázy a skúste vytvoriť zálohu ručne.'; }
      return created;
    })();
    try { return await tickPromise; } finally { tickPromise = null; }
  }
  return {
    create, status, download, runDue,
    start() {
      if (started || closed) return;
      started = true;
      firstTimer = setTimeout(() => { void runDue(); }, 2000); firstTimer.unref();
      interval = setInterval(() => { void runDue(); }, HOUR); interval.unref();
    },
    async close() { closed = true; clearTimeout(firstTimer); clearInterval(interval); await Promise.allSettled([tickPromise, ...pending.values()].filter(Boolean)); },
  };
}
