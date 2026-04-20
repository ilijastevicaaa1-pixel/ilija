console.log("TEST_VAR iz .env:", process.env.TEST_VAR);

import app from './server.js';
import fs from 'fs';
import path from 'path';
import { getDb } from './db.js';
import { generateSpeech } from "./tts.js";

// ----------------------
// HEALTH CHECK
// ----------------------
app.get('/health', (req, res) => res.send('OK'));

// ----------------------
// TEST USERS ROUTA
// ----------------------
app.get('/users', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM users LIMIT 5');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

// ----------------------
// SQL IMPORT ROUTA
// ----------------------
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

// ----------------------
// TTS ROUTA  (MORA BITI PRE startServer())
// ----------------------
app.post("/tts", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const filePath = await generateSpeech(text);
    res.json({ audio: filePath });
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

// ----------------------
// START SERVER
// ----------------------
let PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
let maxTries = 10;
let tries = 0;
let server;

function startServer() {
  server = app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      if (tries < maxTries) {
        console.error(`Port ${PORT} je zauzet. Pokušavam sledeći...`);
        PORT++;
        tries++;
        setTimeout(startServer, 1000);
      } else {
        console.error("Nema slobodnih portova u opsegu!");
        process.exit(1);
      }
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
}

startServer()
