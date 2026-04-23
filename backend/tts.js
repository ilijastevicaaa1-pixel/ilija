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
    const outputDir = "audio";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, `tts_${Date.now()}.mp3`);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/audio/speech",
      {
        model: "gpt-4o-mini-tts",
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

    fs.writeFileSync(outputPath, response.data);
    return outputPath;

  } catch (error) {
    console.error("TTS error:", error.response?.data || error.message);
    throw new Error("Failed to generate speech");
  }
}

