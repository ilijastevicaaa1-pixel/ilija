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
import jwt from 'jsonwebtoken';

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
import { generateSpeech } from "./tts.js";

initializeDatabase();

const app = express();

// GLOBAL JSON PARSER
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use('/audio', express.static('audio'));

// BASIC ROUTES
app.get("/", (req, res) => res.send("Backend radi"));
app.get("/test", (req, res) => res.send("Test route works"));
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

// SQL IMPORT
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

// API ROUTES
app.use('/api/upload/pdf', pdfUploadRouter);
app.use('/api/upload/bank', bankUploadRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/ai', aiRouter);
app.use('/api', loginRouter);
app.use('/api/auth', authRouter);

// LOGIN TEST
app.get('/login', (req, res) => {
    res.json({ message: "Login endpoint working" });
});

// LOGIN REAL
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const db = await getDb();
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(400).json({ message: "Korisnik ne postoji" });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(400).json({ message: "Pogrešna lozinka" });

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || "dev_secret",
            { expiresIn: "7d" }
        );

        res.json({ message: "Uspešna prijava", token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška na serveru" });
    }
});

// REGISTER ROUTA (NEDOSTAJALA)
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
        return res.status(400).json({ error: "Sva polja su obavezna" });

    try {
        const db = await getDb();
        const hash = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'user')",
            [username, email, hash]
        );

        res.json({ message: "User registered" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// TTS ROUTA (NEDOSTAJALA)
app.post("/tts", async (req, res) => {
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
        const filePath = await generateSpeech(text);
        res.json({ audio: filePath });
    } catch (err) {
        console.error("TTS error:", err);
        res.status(500).json({ error: "TTS failed" });
    }
});

// FRONTEND SERVING
// if (process.env.NODE_ENV === 'production') {
//     const frontendPath = path.join(process.cwd(), '../frontend/dist');
//     app.use(express.static(frontendPath));
//     app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
// }

// START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server pokrenut na portu ${PORT}`);
});

export default app;

