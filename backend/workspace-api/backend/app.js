import express from 'express';
import cors from 'cors';
import { createCoreRouter } from './core.js';
import { createIntegrationsRouter } from './integrations.js';
import { createOpenAIService } from './openai-service.js';
import { createGroqService } from './groq-service.js';
import { readEditorProvider, readEditorKey } from './lib/editor-ai.js';
import { createDocumentJobs } from './document-jobs.js';
import { createBackupService } from './backup-service.js';
import { createBackupsRouter } from './backups.js';
import { createCompanyRouter } from './company.js';
import { createIssuedInvoicesRouter } from './issued-invoices.js';
import { createInvoiceChecksRouter } from './invoice-checks.js';

export function createApp(db, { ai=createOpenAIService({selectedProvider:readEditorProvider,preferEnvironmentKey:true,environmentKey:()=>readEditorKey('openai')}),groq=createGroqService({selectedProvider:readEditorProvider,preferEnvironmentKey:true,environmentKey:()=>readEditorKey('groq')}),documents=createDocumentJobs(),backups=createBackupService(db) } = {}) {
  const app = express();
  app.locals.documentJobs=documents;
  app.locals.backups=backups;
  app.disable('x-powered-by');
  const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', ...(process.env.FRONTEND_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]);
  app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); } }));
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => { req.body ??= {}; next(); });
  app.get('/', (req, res) => res.send('Účtovníctvo – server je spustený.'));
  app.get('/health', (req, res) => res.send('OK'));
  app.use('/api', createCoreRouter(db, { ai, groq }));
  app.use('/api/company', createCompanyRouter(db));
  app.use('/api/checks/invoices', createInvoiceChecksRouter(db,{ai,groq}));
  app.use('/api/invoices/output', createIssuedInvoicesRouter(db));
  app.use('/api/backups', createBackupsRouter(db, backups));
  app.use('/api', createIntegrationsRouter(db, { ai, groq, documents }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Táto funkcia nie je dostupná.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = error.status || 500, message = error.status && error.status < 500 ? error.message : 'Server nedokázal dokončiť požiadavku. Skúste to znova.';
    if (error.status === 503) message = error.message;
    if (error.type === 'entity.parse.failed') { status = 400; message = 'Neplatné údaje požiadavky.'; }
    if (error.type === 'entity.too.large' || error.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'Súbor alebo požiadavka sú príliš veľké.'; }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') { status = 400; message = 'Vyberte jeden súbor.'; }
    if (error.code === '23505') { status = 409; message = 'Záznam s týmto označením už existuje.'; }
    if (error.code === '23503') { status = 400; message = 'Súvisiaci záznam neexistuje.'; }
    if (error.code === '23514' || error.code === '22P02' || error.code === '22003') { status = 400; message = 'Skontrolujte zadané hodnoty.'; }
    if (status >= 500) console.error('API error:', error.code || error.name);
    res.status(status).json({ error: message });
  });
  return app;
}
