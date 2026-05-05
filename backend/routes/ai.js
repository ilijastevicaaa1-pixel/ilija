import express from 'express';
import { getDb } from '../db.js';
import auth from '../authMiddleware.js';
import { wizardHandlers, getWizardPrompt } from './aiHandlers.js';

const router = express.Router();

// Korisnički stanja (stateful chat)
const userStates = new Map();

function detectMainCategory(text) {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const num = normalized.match(/\\b([1-9]|10|11)\\b/);
  if (num) return ['fakturacia', 'banka', 'dph', 'vydavky', 'prijmy', 'reporty', 'dokumenty', 'zakaznici', 'projekty', 'asistent', 'sklad'][parseInt(num[1]) - 1];
  if (normalized.includes('fakt')) return 'fakturacia';
  if (normalized.includes('bank')) return 'banka';
  return null;
}

function parseMenuNumber(text) {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const numMatch = normalized.match(/\b([1-9])\b/);
  if (numMatch) return numMatch[1];
  const words = { jedan: '1', dva: '2', tri: '3', cetiri: '4', pet: '5', sest: '6' };
  const tokens = normalized.split(' ');
  for (let token of tokens) if (words[token]) return words[token];
  return null;
}

function formatSubmenu(category) {
  const menus = {
    fakturacia: '1) Vytváranie faktúr\n2) OCR\n3) DPH výpočet\n4) Odoslanie\n5) Prehľad\n6) Kontrola úhrad',
    banka: '1) Prehľad zostatku\n2) Transakcie\n3) Párovanie\n4) Import výpisu\n5) Analýza P/V',
    dph: '1) DPH výpočet\n2) Priznanie\n3) Vstupná/Výstupná\n4) Termíny'
  };
  return menus[category] || 'Dostupné možnosti (1-6)';
}

router.post('/command', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.user.id;

    let state = userStates.get(userId) || null;
    let wizardData = {};

    const trimmed = text.trim().toLowerCase();

    // 1️⃣ GLAVNI MENU (1-11)
    const mainCategory = detectMainCategory(trimmed);
    if (mainCategory) {
      state = mainCategory;
      const reply = `Vybrali ste **${mainCategory}**\n\n${formatSubmenu(mainCategory)}`;
      userStates.set(userId, state);
      return res.json({ reply, context: { state, wizardData } });
    }

    // 2️⃣ PODMENI (broj u kontekstu)
    if (state && !state.includes('_')) {
      const submenu = parseMenuNumber(trimmed);
      if (submenu) {
        state = `${state}_${submenu}`;
        userStates.set(userId, state);
        const promptData = getWizardPrompt(state);
        if (promptData) {
          return res.json({ reply: promptData.prompt, context: { state, wizardData: promptData.data } });
        }
        return res.json({ reply: 'State saved. Pošaljite prvú informáciu.' });
      }
    }

    // 3️⃣ WIZARD KORAK
    if (state) {
      const promptData = getWizardPrompt(state, wizardData);
      if (promptData) {
        // Sačuvaj podatak
        const stepName = Object.keys(promptData.data).pop() || promptData.nextStep;
        wizardData[stepName] = trimmed;

        // Validacija
        if (promptData.validate && !promptData.validate(trimmed)) {
          return res.json({ reply: `${promptData.prompt} (neispravan unos)` });
        }

        userStates.set(userId, promptData.nextStep ? promptData.state : null);

        // Kompletno?
        if (promptData.nextStep === 'complete') {
          const db = await getDb();
          const completeReply = await wizardHandlers[state].complete(wizardData, db);
          userStates.delete(userId); // Reset
          return res.json({ reply: completeReply });
        }

        // Sledeći korak
        const nextPrompt = getWizardPrompt(promptData.state, wizardData);
        return res.json({ reply: nextPrompt.prompt, context: { state: nextPrompt.state, wizardData } });
      }
    }

    // 4️⃣ DEFAULT AI
    res.json({ reply: 'Pišite "1" za fakturáciu, "2" za banku, ili pitajte nešto drugo.' });

  } catch (error) {
    console.error('AI Command error:', error);
    res.status(500).json({ reply: 'Greška sistema. Pokušajte ponovo.' });
  }
});

export default router;

