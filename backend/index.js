console.log("TEST_VAR iz .env:", process.env.TEST_VAR);
import app from './server.js';



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

startServer();

import { generateSpeech } from "./tts.js";

app.post("/tts", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const filePath = await generateSpeech(text);
    res.json({ audio: filePath });
  } catch (err) {
    res.status(500).json({ error: "TTS failed" });
  }
});

