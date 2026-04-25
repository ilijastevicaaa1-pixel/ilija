import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function generateSpeech(text) {
  try {
    // Ensure audio output directory exists
    const outputDir = "audio";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Output file path
    const outputPath = path.join(outputDir, `tts_${Date.now()}.mp3`);

    // Groq TTS request
    const response = await axios.post(
      "https://api.groq.com/openai/v1/audio/speech",
      {
        model: "gpt-4o-audio-preview",   // ← PRAVI MODEL ZA GROQ TTS
        voice: "alloy",
        input: text
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    // Save audio file
    fs.writeFileSync(outputPath, response.data);

    return outputPath;

  } catch (error) {
    console.error("TTS error:", error.response?.data || error.message);
    throw new Error("Failed to generate speech");
  }
}

