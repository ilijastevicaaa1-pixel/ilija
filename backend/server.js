import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import FormData from "form-data";
import nodeFetch from "node-fetch";

import { getDb } from "./db.js";
import initializeDatabase from "./dbInit.js";
import pdfUploadRouter from "./routes/pdfUpload.js";
import bankUploadRouter from "./routes/bankUpload.js";
import matchingRouter from "./routes/matching.js";
import aiRouter from "./routes/ai.js";

const hasDbConfig = Boolean(
    process.env.DATABASE_URL ||
    (process.env.PG_HOST && process.env.PG_USER && process.env.PG_PASSWORD && process.env.PG_DATABASE)
);

if (hasDbConfig) {
    await initializeDatabase();
} else {
    console.log('DB not configured (DATABASE_URL or PG_* missing) - skipping initializeDatabase()');
}

const app = express();


app.get("/", (req, res) => res.send("Backend radi"));
app.use(cors());

app.use((req, res, next) => {
    if (req.path === "/api/ocr") return next();
    express.json({ limit: "50mb" })(req, res, next);
});
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/audio", express.static("audio"));

app.use("/api/upload/pdf", pdfUploadRouter);
app.use("/api/upload/bank", bankUploadRouter);
app.use("/api/matching", matchingRouter);
app.use("/api/ai", aiRouter);

function predictNext(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return Array(6).fill(0);
    const last = arr[arr.length - 1];
    return Array(6).fill(last);
}

function confidenceInterval(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return { min: 0, max: 0 };
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length);
    return { min: avg - std, max: avg + std };
}

app.get("/api/predikcije", async (req, res) => {
    const db = await getDb();
    const { rows } = await db.query("SELECT * FROM output_invoices");
    const amounts = rows.map((r) => r.total_amount);

    const income = amounts;
    const expense = amounts.map((a) => a * 0.7);
    const profit = income.map((v, i) => v - expense[i]);

    const predIncome = predictNext(income);
    const predExpense = predictNext(expense);
    const predProfit = predictNext(profit);

    const ciIncome = confidenceInterval(income);
    const ciExpense = confidenceInterval(expense);
    const ciProfit = confidenceInterval(profit);

    const trendIncome = predIncome[5] > (income[income.length - 1] ?? 0) ? "rast" : "pad";
    const trendExpense = predExpense[5] > (expense[expense.length - 1] ?? 0) ? "rast" : "pad";
    const trendProfit = predProfit[5] > (profit[profit.length - 1] ?? 0) ? "rast" : "pad";

    res.json({
        months: [],
        income,
        expense,
        profit,
        predIncome,
        predExpense,
        predProfit,
        ciIncome,
        ciExpense,
        ciProfit,
        trendIncome,
        trendExpense,
        trendProfit,
    });
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

app.post("/api/voice-to-text", upload.single("audio"), async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "OpenAI API ključ nije podešen." });
        if (!req.file) return res.status(400).json({ error: "No audio file." });

        const form = new FormData();
        form.append("file", req.file.buffer, {
            filename: req.file.originalname || "audio.webm",
            contentType: req.file.mimetype || "application/octet-stream",
        });
        form.append("model", "whisper-1");

        const response = await nodeFetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                ...form.getHeaders(),
            },
            body: form,
        });

        const data = await response.json();
        if (!data.text) return res.status(500).json({ error: "Transkripcija nije uspela.", details: data });
        res.json({ text: data.text });
    } catch (e) {
        res.status(500).json({ error: "Greška u transkripciji.", details: e.message });
    }
});

// Health check endpoint (for environments)
app.get("/health", (req, res) => res.send("OK"));

if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`Server pokrenut na portu ${PORT}`));
}

export default app;

