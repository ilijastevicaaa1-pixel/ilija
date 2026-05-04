import dotenv from "dotenv";
dotenv.config();

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
import bankRoutes from './routes/bankRoutes.js';
import tinkCallback from './routes/tinkCallback.js';
import bankTransactions from './routes/bankTransactions.js';
import manualEntryRouter from './routes/manualEntry.js';
import initializeDatabase from './dbInit.js';

if (process.env.NODE_ENV !== "development") {
    initializeDatabase();
}

const app = express();

// GLOBAL JSON PARSER
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// BASIC ROUTES
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
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

// TINK BANK INTEGRATION
app.use('/api/bank', bankRoutes);
app.use('/api/tink', tinkCallback);
app.use('/api/bank', bankTransactions);
app.use('/api/manual-entry', manualEntryRouter);

// LOGIN TEST
app.get('/login', (req, res) => {
    res.json({ message: "Login endpoint working" });
});

// LOGIN REAL
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const loginField = email || req.body.username; // podrška za email ili username
    try {
        const db = await getDb();
        const result = await db.query('SELECT * FROM users WHERE email = $1 OR username = $1', [loginField]);
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

app.get('/register', (req, res) => {
    console.log('GET /register called from:', req.ip, req.headers['user-agent']);
    res.json({ message: "Use POST /register with JSON body: {username, email, password}" });
});



// FRONTEND SERVING
// if (process.env.NODE_ENV === 'production') {
//     const frontendPath = path.join(process.cwd(), '../frontend/dist');
//     app.use(express.static(frontendPath));
//     app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
// }

// DASHBOARD API
app.get('/api/dashboard', async (req, res) => {
    try {
        const db = await getDb();

        let totalUsers = 0, totalInputInvoices = 0, totalOutputInvoices = 0;
        let totalIncome = 0, totalExpense = 0, profit = 0;
        let recentTransactions = [], upcomingDeadlines = [], recentInvoices = [];

        try {
            const u = await db.query('SELECT COUNT(*) as count FROM users');
            totalUsers = parseInt(u.rows[0].count, 10);
        } catch (e) { /* tabela može ne postojati */ }

        try {
            const ii = await db.query('SELECT COUNT(*) as count FROM input_invoices');
            totalInputInvoices = parseInt(ii.rows[0].count, 10);
        } catch (e) { }

        try {
            const oi = await db.query('SELECT COUNT(*) as count FROM output_invoices');
            totalOutputInvoices = parseInt(oi.rows[0].count, 10);
        } catch (e) { }

        try {
            const inc = await db.query("SELECT COALESCE(SUM(iznos),0) as sum FROM transakcije WHERE tip='prihod'");
            totalIncome = parseFloat(inc.rows[0].sum) || 0;
        } catch (e) { }

        try {
            const exp = await db.query("SELECT COALESCE(SUM(iznos),0) as sum FROM transakcije WHERE tip='rashod'");
            totalExpense = parseFloat(exp.rows[0].sum) || 0;
        } catch (e) { }

        profit = totalIncome - totalExpense;

        try {
            const rt = await db.query("SELECT * FROM transakcije ORDER BY datum DESC LIMIT 5");
            recentTransactions = rt.rows;
        } catch (e) { }

        try {
            const ri = await db.query(
                `SELECT invoice_number as title, total_amount as amount, supplier as party, issue_date as date, 'input' as type
         FROM input_invoices ORDER BY issue_date DESC LIMIT 3`
            );
            const ro = await db.query(
                `SELECT invoice_number as title, total_amount as amount, customer as party, issue_date as date, 'output' as type
         FROM output_invoices ORDER BY issue_date DESC LIMIT 2`
            );
            recentInvoices = [...ri.rows, ...ro.rows];
        } catch (e) { }

        try {
            const dl = await db.query(
                `SELECT * FROM deadlines WHERE deadline_date >= CURRENT_DATE ORDER BY deadline_date ASC LIMIT 5`
            );
            upcomingDeadlines = dl.rows;
        } catch (e) { }

        res.json({
            status: 'ok',
            users: totalUsers,
            inputInvoices: totalInputInvoices,
            outputInvoices: totalOutputInvoices,
            income: totalIncome,
            expense: totalExpense,
            profit: profit,
            recentTransactions: recentTransactions,
            recentInvoices: recentInvoices,
            upcomingDeadlines: upcomingDeadlines
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Alias za stare frontend pozive
app.get("/dashboard", async (req, res) => {
    res.redirect('/api/dashboard');
});

// 404 HANDLER - catch all unmatched routes
app.use((req, res) => {
    console.log(`404: ${req.method} ${req.path} - No route matched`);
    res.status(404).json({
        error: "Not Found",
        method: req.method,
        path: req.path,
        message: `Cannot ${req.method} ${req.path}. Available routes: GET /, GET /test, GET /health, POST /login, POST /register`
    });
});

// START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server pokrenut na portu ${PORT}`);
});

export default app;
