
import OpenAI from 'openai';
import { createOpenAIService } from './openai-service.js';
import { HttpError } from './lib/validation.js';

export const GROQ_MODEL = 'openai/gpt-oss-20b';

export const GROQ_KEY_PATTERN = /^gsk_[A-Za-z0-9_-]{20,500}$/;

// Jedini Groq kljuc cuva se na backend serveru.
function getGroqKey() {
  const key = (process.env.GROQ_API_KEY || '').trim();
  return GROQ_KEY_PATTERN.test(key) ? key : null;
}

// Svi prijavljeni korisnici koriste Groq preko backenda.
// Kljucevi se ne unose i ne cuvaju preko korisnickog interfejsa.
const serverCredentialStore = {
  async get() {
    return getGroqKey();
  },

  async set() {
    throw new HttpError(
      403,
      'AI pripojenie spravuje administrátor aplikácie.'
    );
  },

  async remove() {
    throw new HttpError(
      403,
      'AI pripojenie spravuje administrátor aplikácie.'
    );
  }
};

export function createGroqService(options = {}) {
  return createOpenAIService({
    provider: 'Groq',
    model: GROQ_MODEL,
    keyPrefix: 'gsk_',
    keyPattern: GROQ_KEY_PATTERN,
    wire: 'chat',

    store: serverCredentialStore,
    environmentKey: getGroqKey,

    clientFactory: apiKey =>
      new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
        timeout: 30000,
        maxRetries: 0,
        logLevel: 'off'
      }),

    ...options
  });
}
