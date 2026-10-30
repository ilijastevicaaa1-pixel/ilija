import express from 'express';
import { createAuth } from './core.js';
import { asyncRoute, HttpError } from './lib/validation.js';

export function createBackupsRouter(db, backups) {
  const router = express.Router();
  router.use(createAuth(db));
  router.use((req, _res, next) => next(req.user.role === 'admin' ? null : new HttpError(403, 'Zálohy môže spravovať iba správca firmy.')));
  router.get('/', asyncRoute(async (req, res) => res.set('Cache-Control','no-store').json(await backups.status(req.user.companyId))));
  router.post('/', asyncRoute(async (req, res) => res.status(201).set('Cache-Control','no-store').json(await backups.create(req.user.companyId))));
  router.get('/:backupId/download', asyncRoute(async (req, res) => {
    const backup = await backups.download(req.user.companyId, req.params.backupId);
    res.set({ 'Content-Type':'application/json; charset=utf-8', 'Content-Disposition':`attachment; filename="aap-zaloha-${backup.createdAt.slice(0,10)}-${req.params.backupId}.json"`, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }).send(JSON.stringify(backup));
  }));
  return router;
}
