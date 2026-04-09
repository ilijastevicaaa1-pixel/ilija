import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;

// Default voice (možeš promeniti kasnije)
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // Rachel

export async function generateSpeech(text) {
  try {
    const outputDir = "audio";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, `tts_${Date.now()}.mp3`);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text,
        model_id: "eleven_multilingual_v2"
      },
      {
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    fs.writeFileSync(outputPath, response.data);
    return outputPath;

  } catch (error) {
    console.error("TTS error:", error.response?.data?.toString() || error.message);
    throw new Error("Failed to generate speech");
  }
}

