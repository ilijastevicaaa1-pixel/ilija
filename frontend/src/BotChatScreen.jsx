import React, { useState, useEffect, useRef } from 'react';
import Assistant from '../components/VirtualBookkeeper/Assistant.jsx';
import AIExtractionModal from './components/AIExtractionModal.jsx';
import { apiFetch } from './api.js';

// TTS (slovački)
async function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new window.SpeechSynthesisUtterance(text);
  u.lang = 'sk-SK';
  const voices = window.speechSynthesis.getVoices();
  let voice = voices.find(v => v.lang.startsWith('sk') || v.lang.startsWith('cs'));
  if (!voice) voice = voices.find(v => v.lang.startsWith('en'));
  if (!voice) voice = voices[0]; // fallback na prvi dostupni
  u.voice = voice;
  window.speechSynthesis.speak(u);
}

function BotChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scene, setScene] = useState('office');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Modal state
  const [extractedData, setExtractedData] = useState(null);
  const [showExtractionModal, setShowExtractionModal] = useState(false);

  const fileInputRef = useRef(null);

  const greeting =
    "Dobrý deň, ako vám môžem pomôcť?\n" +
    "Ponúkam tieto služby:\n" +
    "1) Fakturácia\n" +
    "2) Bankové operácie\n" +
    "3) DPH\n" +
    "4) Výdavky\n" +
    "5) Príjmy\n" +
    "6) Reporty\n" +
    "7) Dokumenty\n" +
    "8) Zákazníci\n" +
    "9) Projekty\n" +
    "10) Asistent\n" +
    "11) Skladové hospodárstvo\n\n" +
    "Prosím, vyberte si jednu z možností (napíšte číslo).";

  // Unlock audio
  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio('/sounds/pozdrav.mp3');
      audio.volume = 1.0;
      audio.play().catch(() => {});
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  // Unlock TTS
  useEffect(() => {
    const unlockTTS = () => {
      const u = new SpeechSynthesisUtterance('');
      u.lang = 'sk-SK';
      window.speechSynthesis.speak(u);
      window.removeEventListener('click', unlockTTS);
    };
    window.addEventListener('click', unlockTTS);
    return () => window.removeEventListener('click', unlockTTS);
  }, []);

  // Greeting
  useEffect(() => {
    const playGreeting = () => {
      setMessages(prev => [...prev, { sender: 'bot', text: greeting }]);
      speak(greeting);
      window.removeEventListener('click', playGreeting);
    };
    window.addEventListener('click', playGreeting);
    return () => window.removeEventListener('click', playGreeting);
  }, []);

  // OCR upload
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setMessages(prev => [...prev, { sender: 'user', text: `Nahraný súbor: ${file.name}` }]);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiFetch('/api/ocr', {
        method: 'POST',
        body: formData
      });

      const text = data.ocrText || "Nepodarilo sa načítať dokument.";
      setMessages(prev => [...prev, { sender: 'bot', text }]);
      speak(text);

      // AI ekstrakcija
      try {
        const aiData = await apiFetch('/api/ai/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        setExtractedData({
          fields: aiData.fields || {},
          rawText: text
        });

        setShowExtractionModal(true);

      } catch (err) {
        console.error("AI ekstrakcija nije uspela", err);
      }

    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: "OCR zlyhalo." }]);
    }

    setLoading(false);
  }

  function setSceneForCategory(cat) {
    const map = {
      fakturacia: 'desk',
      banka: 'bank',
      dph: 'office',
      vydavky: 'desk',
      prijmy: 'office',
      reporty: 'globe',
      dokumenty: 'desk',
      zakaznici: 'office',
      projekty: 'office',
      asistent: 'office',
      sklad: 'desk'
    };
    setScene(map[cat] || 'office');
  }

  function getSubmenu(cat) {
    const menus = {
      fakturacia:
        "Fakturácia – vyberte si možnosť:\n" +
        "1) Vytváranie faktúr\n" +
        "2) Čítanie faktúr (OCR)\n" +
        "3) Výpočet DPH\n" +
        "4) Odosielanie faktúr\n" +
        "5) Prehľad všetkých faktúr\n" +
        "   - 1 Zoznam vydaných faktúr\n" +
        "   - 2 Zoznam prijatých faktúr\n" +
        "   - 3 Stav platby faktúr\n" +
        "   - 4 Možnosť filtrovania podľa dátumu, čísla faktúry, či stavu platby\n" +
        "Chcete zobraziť konkrétny zoznam alebo filtrovať podľa určitých kritérií?\n" +
        "6) Kontrola stavu úhrad\n\n" +
        "Napíšte číslo možnosti.",

      banka:
        "Bankové operácie – vyberte si možnosť:\n" +
        "1) Prehľad zostatku\n" +
        "2) Prehľad transakcií\n" +
        "3) Párovanie platieb\n" +
        "4) Import bankového výpisu\n" +
        "5) Analýza príjmov a výdavkov\n\n" +
        "Napíšte číslo možnosti.",

      dph:
        "DPH – vyberte si možnosť:\n" +
        "1) Výpočet DPH\n" +
        "2) Príprava DPH priznania\n" +
        "3) Prehľad vstupnej a výstupnej DPH\n" +
        "4) Upozornenia na termíny\n\n" +
        "Napíšte číslo možnosti.",

      vydavky:
        "Výdavky – vyberte si možnosť:\n" +
        "1) Zadávanie výdavkov\n" +
        "2) OCR bločkov\n" +
        "3) Kategorizácia výdavkov\n" +
        "4) Priradenie výdavkov k projektom\n\n" +
        "Napíšte číslo možnosti.",

      prijmy:
        "Príjmy – vyberte si možnosť:\n" +
        "1) Prehľad príjmov\n" +
        "2) Analýza podľa klientov\n" +
        "3) Mesačné prehľady\n\n" +
        "Napíšte číslo možnosti.",

      reporty:
        "Reporty – vyberte si možnosť:\n" +
        "1) Mesačný finančný prehľad\n" +
        "2) Zisk/strata\n" +
        "3) Cashflow\n" +
        "4) Porovnanie období\n\n" +
        "Napíšte číslo možnosti.",

      dokumenty:
        "Dokumenty – vyberte si možnosť:\n" +
        "1) Nahrávanie dokumentov\n" +
        "2) OCR spracovanie\n" +
        "3) Automatické rozpoznanie typu dokumentu\n" +
        "4) Archív dokumentov\n\n" +
        "Napíšte číslo možnosti.",

      zakaznici:
        "Zákazníci – vyberte si možnosť:\n" +
        "1) Pridávanie zákazníkov\n" +
        "2) Prehľad histórie\n" +
        "3) Automatické dopĺňanie údajov do faktúr\n\n" +
        "Napíšte číslo možnosti.",

      projekty:
        "Projekty – vyberte si možnosť:\n" +
        "1) Výdavky podľa projektu\n" +
        "2) Príjmy podľa projektu\n" +
        "3) Analýza ziskovosti\n\n" +
        "Napíšte číslo možnosti.",

      sklad:
        "Skladové hospodárstvo – vyberte si možnosť:\n" +
        "1) Stav skladu\n" +
        "2) Príjem tovaru\n" +
        "3) Výdaj tovaru\n" +
        "4) Inventúra\n" +
        "5) Prehľad pohybov\n\n" +
        "Napíšte číslo možnosti.",

      asistent:
        "Som vám k dispozícii na akékoľvek otázky.\n" +
        "Napíšte, čo potrebujete urobiť."
    };

    return menus[cat] || "";
  }

  const subOptions = {
    fakturacia: {
      "1": "vytváranie faktúr",
      "2": "čítanie faktúr (OCR)",
      "3": "výpočet DPH",
      "4": "odosielanie faktúr",
      "5": "prehľad všetkých faktúr",
      "6": "kontrola stavu úhrad"
    },
    banka: {
      "1": "prehľad zostatku",
      "2": "prehľad transakcií",
      "3": "párovanie platieb",
      "4": "import bankového výpisu",
      "5": "analýza príjmov a výdavkov"
    },
    dph: {
      "1": "výpočet DPH",
      "2": "príprava DPH priznania",
      "3": "prehľad vstupnej a výstupnej DPH",
      "4": "upozornenia na termíny"
    },
    vydavky: {
      "1": "zadávanie výdavkov",
      "2": "OCR bločkov",
      "3": "kategorizácia výdavkov",
      "4": "priradenie výdavkov k projektom"
    },
    prijmy: {
      "1": "prehľad príjmov",
      "2": "analýza podľa klientov",
      "3": "mesačné prehľady"
    },
    reporty: {
      "1": "mesačný finančný prehľad",
      "2": "zisk/strata",
      "3": "cashflow",
      "4": "porovnanie období"
    },
    dokumenty: {
      "1": "nahrávanie dokumentov",
      "2": "OCR spracovanie",
      "3": "automatické rozpoznanie typu dokumentu",
      "4": "archív dokumentov"
    },
    zakaznici: {
      "1": "pridávanie zákazníkov",
      "2": "prehľad histórie",
      "3": "automatické dopĺňanie údajov do faktúr"
    },
    projekty: {
      "1": "výdavky podľa projektu",
      "2": "príjmy podľa projektu",
      "3": "analýza ziskovosti"
    },
    sklad: {
      "1": "stav skladu",
      "2": "príjem tovaru",
      "3": "výdaj tovaru",
      "4": "inventúra",
      "5": "prehľad pohybov"
    }
  };

  function detectCategory(text) {
    const t = text.toLowerCase().trim();

    if (t === "1") return "fakturacia";
    if (t === "2") return "banka";
    if (t === "3") return "dph";
    if (t === "4") return "vydavky";
    if (t === "5") return "prijmy";
    if (t === "6") return "reporty";
    if (t === "7") return "dokumenty";
    if (t === "8") return "zakaznici";
    if (t === "9") return "projekty";
    if (t === "10") return "asistent";
    if (t === "11") return "sklad";

    if (t.includes("fakt")) return "fakturacia";
    if (t.includes("bank")) return "banka";
    if (t.includes("dph") || t.includes("daň")) return "dph";
    if (t.includes("výdav") || t.includes("vydav")) return "vydavky";
    if (t.includes("príjm") || t.includes("prijm")) return "prijmy";
    if (t.includes("report") || t.includes("prehľad")) return "reporty";
    if (t.includes("dokument")) return "dokumenty";
    if (t.includes("zákaz") || t.includes("klient")) return "zakaznici";
    if (t.includes("projekt")) return "projekty";
    if (t.includes("asist")) return "asistent";
    if (t.includes("sklad") || t.includes("skladov")) return "sklad";

    return null;
  }

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userText = input;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    if (!selectedCategory) {
      const cat = detectCategory(userText);

      if (cat) {
        setSelectedCategory(cat);
        setSceneForCategory(cat);

        const submenu = getSubmenu(cat);
        setMessages(prev => [...prev, { sender: 'bot', text: submenu }]);
        speak(submenu);

        setInput('');
        setLoading(false);
        return;
      }
    }

    if (selectedCategory) {
      const num = userText.trim();
      const options = subOptions[selectedCategory];

      if (options && options[num]) {
        const chosen = options[num];

        if (chosen.includes("OCR")) {
          setMessages(prev => [...prev, { sender: 'bot', text: "Nahrajte faktúru na spracovanie." }]);
          speak("Nahrajte faktúru na spracovanie.");

          setTimeout(() => fileInputRef.current?.click(), 300);

          setInput('');
          setLoading(false);
          return;
        }

        try {
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          const prompt =
            "Používateľ si vybral možnosť: " +
            chosen +
            " v kategórii " +
            selectedCategory +
            ".\nOdpovedaj výhradne po slovensky.";

          const data = await apiFetch('/api/ai/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: prompt })
          });

          const reply = data.reply || data.answer || "Rozumiem.";

          setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
          speak(reply);

          setInput('');
          setLoading(false);
          return;
        } catch (err) {
          setMessages(prev => [...prev, { sender: 'bot', text: "Vyskytla sa chyba." }]);
          setInput('');
          setLoading(false);
          return;
        }
      }
    }

    try {
      const prompt =
        "Používateľ chce vykonať úkon v kategórii: " +
        selectedCategory +
        ".\nText: " +
        userText +
        "\nOdpovedaj výhradne po slovensky.";

      const data = await apiFetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt })
      });

      const reply = data.reply || data.answer || "Rozumiem.";

      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
      speak(reply);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Vyskytla sa chyba." }]);
    }

    setInput('');
    setLoading(false);
  };

  const lastBotMsg = messages.slice().reverse().find(m => m.sender === 'bot');
  const assistantMsg = loading
    ? "píšem..."
    : (lastBotMsg ? lastBotMsg.text : greeting);

  return (
    <div className="main-app-layout">
      <div className="assistant-fullscreen">
        <Assistant message={assistantMsg} scene={scene} />
      </div>

      <div className="chat-container">
        <div style={{ width: 480 }}>
          <div
            style={{
              minHeight: 80,
              maxHeight: 120,
              overflowY: 'auto',
              marginBottom: 8
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  textAlign: msg.sender === 'bot' ? 'left' : 'right',
                  margin: '8px 0'
                }}
              >
                <b>{msg.sender === 'bot' ? 'Asistent' : 'Vy'}:</b> {msg.text}
              </div>
            ))}
            {loading && <div><i>Asistent píše...</i></div>}
            <div ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*,.pdf"
            onChange={handleFileUpload}
          />

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Vaša správa alebo príkaz..."
            style={{ width: '70%', marginRight: 8 }}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />

          <button onClick={sendMessage} disabled={loading}>
            Odoslať
          </button>
        </div>
      </div>

      {/* AI Extraction Modal */}
      <AIExtractionModal
        open={showExtractionModal}
        data={extractedData}
        onClose={() => setShowExtractionModal(false)}
        onConfirm={(data) => {
          console.log("Potvrđeni podaci:", data);
          setShowExtractionModal(false);

          // Ovde kasnije možemo dodati:
          // - automatsko knjiženje
          // - kreiranje fakture
          // - kreiranje troška
        }}
      />

    </div>
  );
}

export default BotChatScreen;