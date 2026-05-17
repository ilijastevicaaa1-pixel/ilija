import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { apiFetch } from "../../api.js";
import AIExtractionModal from "../AIExtractionModal.jsx";

// ----------------------
// GREETING
// ----------------------
const greeting =
  "Dobrý deň...\n\n" +
  "Ako vám môžem pomôcť?\n\n" +
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

// ----------------------
// SUBOPTIONS
// ----------------------
const subOptions = {
  fakturacia: {
    "1": "vytvaranie faktur",
    "2": "citanie faktur (OCR)",
    "3": "vypocet DPH",
    "4": "odosielanie faktur",
    "5": "prehlad vsetkych faktur",
    "6": "kontrola stavu uhrad"
  },
  banka: {
    "1": "prehlad zostatku",
    "2": "prehlad transakcii",
    "3": "parovanie platieb",
    "4": "import bankoveho vypisu",
    "5": "analyza prijmov a vydavkov"
  },
  dph: {
    "1": "vypocet DPH",
    "2": "priprava DPH priznania",
    "3": "prehlad vstupnej a vystupnej DPH",
    "4": "upozornenia na terminy"
  },
  vydavky: {
    "1": "zadavanie vydavkov",
    "2": "OCR blockov",
    "3": "kategorizacia vydavkov",
    "4": "priradenie vydavkov k projektom"
  },
  prijmy: {
    "1": "prehlad prijmov",
    "2": "analyza podla klientov",
    "3": "mesacne prehlady"
  },
  reporty: {
    "1": "mesacny financny prehlad",
    "2": "zisk/strata",
    "3": "cashflow",
    "4": "porovnanie obdobi"
  },
  dokumenty: {
    "1": "nahravanie dokumentov",
    "2": "OCR spracovanie",
    "3": "automaticke rozpoznanie typu dokumentu",
    "4": "archiv dokumentov"
  },
  zakaznici: {
    "1": "pridavanie zakaznikov",
    "2": "prehlad historie",
    "3": "automaticke doplnanie udajov do faktur"
  },
  projekty: {
    "1": "vydavky podla projektu",
    "2": "prijmy podla projektu",
    "3": "analyza ziskovosti"
  },
  sklad: {
    "1": "stav skladu",
    "2": "prijem tovaru",
    "3": "vydaj tovaru",
    "4": "inventura",
    "5": "prehlad pohybov"
  }
};

// ----------------------
// TTS
// ----------------------
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const u = new window.SpeechSynthesisUtterance(text);
  u.lang = "sk-SK";

  const voices = window.speechSynthesis.getVoices();
  let voice =
    voices.find(v => v.lang.startsWith("sk")) ||
    voices.find(v => v.lang.startsWith("cs")) ||
    voices.find(v => v.lang.startsWith("en")) ||
    voices[0];

  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

// ----------------------
// HELPERS
// ----------------------
function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseMenuNumber(text) {
  const normalized = normalizeText(text).replace(/[^\w\s]/g, " ");
  const compact = normalized.replace(/\s+/g, " ").trim();

  const numberMatch = compact.match(/\b([1-9]|10|11)\b/);
  if (numberMatch) return numberMatch[1];

  const tokens = compact.split(" ").filter(Boolean);
  const joined = tokens.join("");

  const wordMap = {
    jeden: "1",
    jedna: "1",
    jedno: "1",
    dva: "2",
    tri: "3",
    cetiri: "4",
    pet: "5",
    sest: "6",
    sedam: "7",
    osam: "8",
    devet: "9",
    deset: "10",
    jedanaest: "11",
    dve: "2",
    styri: "4",
    pat: "5",
    sedem: "7",
    osem: "8",
    devat: "9",
    desat: "10",
    jedenast: "11"
  };

  for (const token of tokens) {
    if (token === "jedna") return "1";
    if (token === "sest") return "6";
    if (wordMap[token]) return wordMap[token];
  }

  if (wordMap[joined]) return wordMap[joined];
  return null;
}

function detectCategory(text) {
  const t = normalizeText(text);
  const menuNumber = parseMenuNumber(text);

  if (menuNumber === "1") return "fakturacia";
  if (menuNumber === "2") return "banka";
  if (menuNumber === "3") return "dph";
  if (menuNumber === "4") return "vydavky";
  if (menuNumber === "5") return "prijmy";
  if (menuNumber === "6") return "reporty";
  if (menuNumber === "7") return "dokumenty";
  if (menuNumber === "8") return "zakaznici";
  if (menuNumber === "9") return "projekty";
  if (menuNumber === "10") return "asistent";
  if (menuNumber === "11") return "sklad";

  if (t.includes("fakt")) return "fakturacia";
  if (t.includes("bank")) return "banka";
  if (t.includes("dph") || t.includes("dan")) return "dph";
  if (t.includes("vydav")) return "vydavky";
  if (t.includes("prijm")) return "prijmy";
  if (t.includes("report")) return "reporty";
  if (t.includes("dokument")) return "dokumenty";
  if (t.includes("zakaz") || t.includes("klient")) return "zakaznici";
  if (t.includes("projekt")) return "projekty";
  if (t.includes("asist")) return "asistent";
  if (t.includes("sklad")) return "sklad";

  return null;
}

function formatSubOptions(categoryKey) {
  const options = subOptions[categoryKey];
  if (!options) return "";
  const lines = Object.entries(options).map(([num, label]) => `${num}) ${label}`);
  return `Vybrali ste: ${categoryKey}\nDostupné možnosti:\n${lines.join("\n")}`;
}

function resolveSubOptionReply(categoryKey, text) {
  if (!categoryKey || !subOptions[categoryKey]) return null;
  const normalizedNumber = parseMenuNumber(text);
  const direct = normalizedNumber ? subOptions[categoryKey][normalizedNumber] : null;
  if (!direct) return null;

  // Ne prikazuj “Rozumiem…” (UI spam). Umesto toga samo potvrdi izbor.
  return `Vybrali ste: ${direct}.`;
}


function isMainMenuCommand(text) {
  const t = text.toLowerCase().trim();
  return (
    t === "menu" ||
    t === "hlavne menu" ||
    t === "spat" ||
    t === "spat na menu"
  );
}

// ----------------------
// COMPONENT
// ----------------------
function AssistantChatWindow({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: greeting }
  ]);
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [context, setContext] = useState(null);

  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const listRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasSpokenGreetingRef = useRef(false);
  const needsGreetingRetryRef = useRef(false);
  const hasUnlockedAudioRef = useRef(false);
  const lastTranscriptRef = useRef("");

  const SpeechRecognitionApi = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition || null,
    []
  );

  // Scroll
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isSending]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Greeting TTS
  useEffect(() => {
    if (hasSpokenGreetingRef.current) return;
    hasSpokenGreetingRef.current = true;
    try {
      speak(greeting);
    } catch {
      needsGreetingRetryRef.current = true;
    }
  }, []);

  // Unlock audio on first gesture
  useEffect(() => {
    const unlockAudioOnFirstGesture = () => {
      if (hasUnlockedAudioRef.current) return;
      hasUnlockedAudioRef.current = true;

      if (!window.speechSynthesis) return;

      const warmup = new window.SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(warmup);
      window.speechSynthesis.cancel();

      if (needsGreetingRetryRef.current) {
        needsGreetingRetryRef.current = false;
        speak(greeting);
      }
    };

    window.addEventListener("pointerdown", unlockAudioOnFirstGesture, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudioOnFirstGesture);
  }, []);

  // ----------------------
  // OCR upload + AI extraction
  // ----------------------
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessages(prev => [
      ...prev,
      { role: "user", text: `Učitan fajl: ${file.name}` }
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiFetch("/api/ocr", {
        method: "POST",
        body: formData
      });

      const text = data.ocrText || "Nepodarilo sa načítať dokument.";
      setMessages(prev => [...prev, { role: "assistant", text }]);
      speak(text);

      try {
        const aiData = await apiFetch("/api/ai/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });

        setExtractedData({
          fields: aiData.fields || {},
          rawText: text
        });
        setShowExtractionModal(true);
      } catch (err) {
        console.error("AI extrakcia zlyhala", err);
      }
    } catch (err) {
      const errorMessage = "OCR zlyhalo.";
      setMessages(prev => [...prev, { role: "assistant", text: errorMessage }]);
      speak(errorMessage);
    }
  };

  // ----------------------
  // MICROPHONE
  // ----------------------
  const sendMessage = async (textOverride) => {
    const trimmed = (typeof textOverride === "string" ? textOverride : input).trim();
    if (!trimmed || isSending) return;

    setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsSending(true);

    // Reset na glavni meni
    if (isMainMenuCommand(trimmed)) {
      setSelectedCategory(null);
      setContext(null);
      setMessages(prev => [...prev, { role: "assistant", text: greeting }]);
      speak(greeting);
      setIsSending(false);
      return;
    }

    const activeCategory = selectedCategory;
    const fixedReply = resolveSubOptionReply(activeCategory, trimmed);

    // Navigacija na konkretne funkcije (npr. vytvaranie faktur)
    const normalizedNumber = parseMenuNumber(trimmed);
    if (activeCategory === "fakturacia" && normalizedNumber === "1") {
      setContext(prev => prev || {
        category: "fakturacia",
        suboption: subOptions.fakturacia["1"]
      });

      setIsSending(false);
      return window.location.assign("/ai/faktura");
    }

    // Ako je izabrana podopcija, prikaži info
    if (fixedReply) {
      setMessages(prev => [...prev, { role: "assistant", text: fixedReply }]);
      speak(fixedReply);

      const normalizedNumber = parseMenuNumber(trimmed);
      if (activeCategory && normalizedNumber && subOptions[activeCategory][normalizedNumber]) {
        setContext({
          category: activeCategory,
          suboption: subOptions[activeCategory][normalizedNumber]
        });
      }
    }

    // Ako je već izabrana kategorija i korisnik unosi broj → ponovo pokaži podmeni
    if (activeCategory && parseMenuNumber(trimmed)) {
      const retryMessage = formatSubOptions(activeCategory);
      setMessages(prev => [...prev, { role: "assistant", text: retryMessage }]);
      speak(retryMessage);
    }

    // Ako još nema kategorije → detektuj i prikaži podmeni
    let categoryFromInput = null;
    if (!selectedCategory) {
      categoryFromInput = detectCategory(trimmed);
      if (categoryFromInput && categoryFromInput !== "asistent") {
        const optionMessage = formatSubOptions(categoryFromInput);
        setMessages(prev => [...prev, { role: "assistant", text: optionMessage }]);
        speak(optionMessage);
        setSelectedCategory(categoryFromInput);
        setIsSending(false);
        return;
      }
    }

    // Skip AI samo ako je korisnik u meniju i bira opciju
    const normalizedTrimmed = normalizeText(trimmed);
    const isMenuOnlyNumber = /^([1-9]|10|11)$/.test(normalizedTrimmed);

    const shouldSkipAI =
      (activeCategory && isMenuOnlyNumber) ||
      (!!fixedReply && activeCategory);

    if (shouldSkipAI) {
      setIsSending(false);
      return;
    }

    // ----------------------
    // POZIV AI BACKENDU
    // ----------------------
    try {
      const data = await apiFetch("https://TVOJ-BACKEND-URL/api/ai/command", {
        method: "POST",
        body: {
          text: trimmed,
          context
        }
      });

      const reply = data.reply || data.answer || "";

      if (reply) {
        setMessages(prev => [...prev, { role: "assistant", text: reply }]);
        speak(reply);
      }

      if (data.context) {
        setContext(data.context);
      }

      const cat = selectedCategory || categoryFromInput;

      if (
        (cat === "fakturacia") &&
        (trimmed === "2" || trimmed.toLowerCase().includes("ocr"))
      ) {
        setTimeout(() => fileInputRef.current?.click(), 250);
      }
    } catch (err) {
      const errorMessage = "Vyskytla sa chyba pri komunikacii so serverom.";
      setMessages(prev => [...prev, { role: "assistant", text: errorMessage }]);
      speak(errorMessage);
    } finally {
      setIsSending(false);
    }

  };

  // ----------------------
  // MICROPHONE
  // ----------------------
  const toggleSpeech = () => {
    setSpeechError("");
    window.speechSynthesis?.cancel();

    if (!SpeechRecognitionApi) {
      setSpeechError("Voice input nie je podporovany v tomto prehliadaci.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognitionRef.current = recognition;
    recognition.lang = "sk-SK";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    lastTranscriptRef.current = "";

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = (event) => {
      setSpeechError(`Chyba mikrofonu: ${event.error || "neznama chyba"}`);
    };
    recognition.onend = () => {
      setIsListening(false);
      const transcript = lastTranscriptRef.current.trim();
      if (transcript) {
        lastTranscriptRef.current = "";
        setInput(transcript);
        sendMessage(transcript);
      }
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript || "")
        .join(" ");
      lastTranscriptRef.current = transcript.trim();
      setInput(lastTranscriptRef.current);
    };

    recognition.start();
  };

  const onInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <link rel="stylesheet" href="/src/styles/chat-modern.css" />
      <div
        className="modern-chat-overlay"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <section
          className="modern-chat-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="modern-chat-header">
            <div>
              <h3>Asistent</h3>
              <p>Slovensko + srpski</p>
            </div>
            <button
              type="button"
              className="modern-chat-close"
              onClick={onClose}
              aria-label="Zatvori chat"
            >
              ×
            </button>
          </header>

          <div className="modern-chat-messages" ref={listRef}>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chat-bubble ${message.role}`}
              >
                {message.text}
              </div>
            ))}
            {isSending && (
              <div className="chat-bubble assistant">Asistent píše...</div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*,.pdf"
            onChange={handleFileUpload}
          />

          <footer className="modern-chat-input-row">
            <button
              type="button"
              className={`modern-chat-mic ${isListening ? "active" : ""}`}
              onClick={toggleSpeech}
              aria-label="Mikrofon"
              title={isListening ? "Zaustavi snimanje" : "Pokreni mikrofon"}
            >
              🎤
            </button>
            <textarea
              className="modern-chat-textarea"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Piši poruku ili komandu (npr. 1 za fakturáciu)..."
              rows={1}
              disabled={isSending}
            />
            <button
              type="button"
              className="modern-chat-send"
              onClick={sendMessage}
              disabled={isSending}
            >
              →
            </button>
          </footer>

          {speechError && (
            <p className="modern-chat-speech-error">{speechError}</p>
          )}
        </section>
      </div>

      <AIExtractionModal
        open={showExtractionModal}
        data={extractedData}
        onClose={() => setShowExtractionModal(false)}
        onConfirm={(data) => {
          console.log("Potvrđeni podaci:", data);
          setShowExtractionModal(false);
        }}
      />
    </>
  );
}

export default AssistantChatWindow;