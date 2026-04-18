import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';
import nodeFetch from 'node-fetch';
import XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import util from 'util';
import { getDb } from './db.js';
import loginRouter from './routes/login.js';
import importSQL from './import-sql.js';
import authRouter from './routes/auth.js';
import { auth } from './authMiddleware.js';
import { extractTextWithGoogleVision } from './googleVisionOCR.js';
import { extractInvoiceFields } from './extractFields.js';
import { suggestPosting } from './autoPosting.js';
import { classifyPDV, extractDeadlines } from './autoClassification.js';
import pdfUploadRouter from './routes/pdfUpload.js';
import bankUploadRouter from './routes/bankUpload.js';
import itemsRouter from './routes/items.js';
import warehouseRouter from './routes/warehouse.js';
import receiptsRouter from './routes/receipts.js';
import issuesRouter from './routes/issues.js';
import faktureBatchRouter from './routes/faktureBatch.js';
import aiRouter from './routes/ai.js';
import matchingRouter from './routes/matching.js';

// ... rest of the original server.js code (copy the entire content except the broken imports) ...

// Inicijalizacija baze i admin korisnika
import initializeDatabase from './dbInit.js';
initializeDatabase();

// Inicijalizacija Express aplikacije
const app = express();

// --- APP INIT ---
async function auditLogMiddleware(req, res, next) {
    const db = await getDb();
    const userId = req.user?.id || null;
    let entity, entityId, oldValue = null, newValue = null, type = req.method, message = '';
    try {
        if (req.path.startsWith('/api/users')) entity = 'users';
        else if (req.path.startsWith('/api/fakture')) entity = 'input_invoices';
        else if (req.path.startsWith('/api/izlazne-fakture')) entity = 'output_invoices';
        else if (req.path.startsWith('/api/banka')) entity = 'bank_transactions';
        else return next();

        entityId = req.params.id || null;
        if ((req.method === 'PUT' || req.method === 'DELETE') && entityId) {
            const { rows } = await db.query(`SELECT * FROM ${entity} WHERE id = $1`, [entityId]);
            oldValue = rows[0] || null;
        }
        if (req.method === 'POST' || req.method === 'PUT') {
            newValue = req.body;
        }
        message = `${type} ${entity}${entityId ? ' id=' + entityId : ''}`;
        res.on('finish', async () => {
            if (res.statusCode < 400) {
                await db.query(
                    'INSERT INTO logs (timestamp, user_id, type, entity, entity_id, old_value, new_value, message) VALUES (CURRENT_TIMESTAMP, $1, $2, $3, $4, $5, $6, $7)',
                    [userId, type, entity, entityId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, message]
                );
            }
        });
    } catch (e) {
        console.error('Audit log error:', e);
    }
    next();
}

// Root ruta
app.get("/", (req, res) => res.send("Backend radi - SQL import spreman"));
app.use(cors());

app.use((req, res, next) => {
    if (req.path === '/api/ocr') return next();
    express.json({ limit: '50mb' })(req, res, next);
});
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/audio', express.static('audio'));

// --- SQL IMPORT ROUTE (added) ---
app.get('/import', async (req, res) => {
    try {
        const result = await importSQL();
        res.send(result);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Use routers
app.use('/api/upload/pdf', pdfUploadRouter);
app.use('/api/upload/bank', bankUploadRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/ai', aiRouter);
app.use('/api', loginRouter);
app.use('/api/auth', authRouter);

// --- FRONTEND SERVING ---
if (process.env.NODE_ENV === 'production') {
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
}

export default app;

if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
        console.log(`Server pokrenut na portu ${PORT}`);
    });
}
