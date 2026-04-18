import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';
import nodeFetch from 'node-fetch';
import XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import util from 'util';
import path from 'path';
import { getDb } from './db.js';
import loginRouter from './routes/login.js';
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
import initializeDatabase from './dbInit.js';

initializeDatabase();

const app = express();

app.get("/", (req, res) => res.send("Backend radi"));

app.get('/health', (req, res) => res.send('OK'));

app.get('/users', async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query('SELECT * FROM users LIMIT 5');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.get("/import-sql", async (req, res) => {
    try {
        const sqlPath = path.join(process.cwd(), "dump.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");

        const db = await getDb();
        await db.query(sql);

        res.json({ message: "SQL import uspešan!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.use(cors());

app.use((req, res, next) => {
    if (req.path === '/api/ocr') return next();
    express.json({ limit: '50mb' })(req, res, next);
});

app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/audio', express.static('audio'));

app.use('/api/upload/pdf', pdfUploadRouter);
app.use('/api/upload/bank', bankUploadRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/ai', aiRouter);
app.use('/api', loginRouter);
app.use('/api/auth', authRouter);

// Frontend serving
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(process.cwd(), '../frontend/dist');
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server pokrenut na portu ${PORT}`);
});

export default app;

