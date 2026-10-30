import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { HttpError } from './validation.js';

export const settingsFile = fileURLToPath(new URL('../ai-settings.json', import.meta.url));
const privateEnvironment = fileURLToPath(new URL('../.env', import.meta.url));
const names = { groq: 'GROQ_API_KEY', openai: 'OPENAI_API_KEY' };

export function readEditorProvider() {
  let value;
  try { value = JSON.parse(readFileSync(settingsFile, 'utf8')).provider; }
  catch (error) {
    if (error.code === 'ENOENT') value = process.env.AI_PROVIDER || null;
    else throw new HttpError(503, 'Nastavenie AI sa nepodarilo načítať. Obráťte sa na správcu.');
  }
  if (value !== null && !Object.hasOwn(names, value)) throw new HttpError(503, 'AI služba nie je správne nastavená. Obráťte sa na správcu.');
  return value;
}

export function readEditorKey(provider) {
  if (!Object.hasOwn(names, provider)) return null;
  // Local editor changes survive sign-out, browser resets, and server restarts.
  // Hosted production continues using its existing secret environment settings.
  if (process.platform === 'win32') {
    try {
      const value = dotenv.parse(readFileSync(privateEnvironment))[names[provider]];
      if (value?.trim()) return value.trim();
    } catch (error) {
      if (error.code !== 'ENOENT') throw new HttpError(503, 'Pripojenie AI sa nepodarilo načítať. Obráťte sa na správcu.');
    }
  }
  return process.env[names[provider]] || null;
}

export function readEditorVoice(){
  try{
    const voice=JSON.parse(readFileSync(settingsFile,'utf8')).voice||{};
    return{autoStart:voice.autoStart!==false,readAloud:voice.readAloud!==false};
  }catch{return{autoStart:true,readAloud:true};}
}
