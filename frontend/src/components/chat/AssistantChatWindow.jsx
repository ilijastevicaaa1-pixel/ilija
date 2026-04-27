import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../api.js";


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


const subOptions = {
    fakturacia: {
        "1": "vytvaranie faktur",
        "2": "citanie faktur (OCR)",
        "3": "vypocet DPH",
        "4": "odosielanie faktur",
        "5": "prehlad vsetkych faktur",
        "6": "kontrola stavu uhrad",
    },
    banka: {
        "1": "prehlad zostatku",
        "2": "prehlad transakcii",
        "3": "parovanie platieb",
        "4": "import bankoveho vypisu",
        "5": "analyza prijmov a vydavkov",
    },
    dph: {
        "1": "vypocet DPH",
        "2": "priprava DPH priznania",
        "3": "prehlad vstupnej a vystupnej DPH",
        "4": "upozornenia na terminy",
    },
    vydavky: {
        "1": "zadavanie vydavkov",
        "2": "OCR blockov",
        "3": "kategorizacia vydavkov",
        "4": "priradenie vydavkov k projektom",
    },
    prijmy: {
        "1": "prehlad prijmov",
        "2": "analyza podla klientov",
        "3": "mesacne prehlady",
    },
    reporty: {
        "1": "mesacny financny prehlad",
        "2": "zisk/strata",
        "3": "cashflow",
        "4": "porovnanie obdobi",
    },
    dokumenty: {
        "1": "nahravanie dokumentov",
        "2": "OCR spracovanie",
        "3": "automaticke rozpoznanie typu dokumentu",
        "4": "archiv dokumentov",
    },
    zakaznici: {
        "1": "pridavanie zakaznikov",
        "2": "prehlad historie",
        "3": "automaticke doplnanie udajov do faktur",
    },
    projekty: {
        "1": "vydavky podla projektu",
        "2": "prijmy podla projektu",
        "3": "analyza ziskovosti",
    },
    sklad: {
        "1": "stav skladu",
        "2": "prijem tovaru",
        "3": "vydaj tovaru",
        "4": "inventura",
        "5": "prehlad pohybov",
    },
};

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

    // If there is a direct number in the text, use it
    const numberMatch = compact.match(/\b([1-9]|10|11)\b/);
    if (numberMatch) return numberMatch[1];

    const tokens = compact.split(" ").filter(Boolean);
    const joined = tokens.join("");

    const wordMap = {
        // SR
        jedan: "1",
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
        // SK
        jeden: "1",
        jedna_sk: "1",
        dve: "2",
        styri: "4",
        pat: "5",
        sest_sk: "6",
        sedem: "7",
        osem: "8",
        devat: "9",
        desat: "10",
        jedenast: "11",
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
    if (t.includes("report") || t.includes("prehlad")) return "reporty";
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
    return `Vybrali ste: ${categoryKey}\nDostupne moznosti:\n${lines.join("\n")}`;
}

function AssistantChatWindow({ onClose }) {
    const [messages, setMessages] = useState([{ role: "assistant", text: greeting }]);
    const [input, setInput] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speechError, setSpeechError] = useState("");
    const [context, setContext] = useState({});

    const listRef = useRef(null);
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);
    const voicesRef = useRef([]);
    const hasSpokenGreetingRef = useRef(false);
    const needsGreetingRetryRef = useRef(false);
    const hasUnlockedAudioRef = useRef(false);
    const lastTranscriptRef = useRef("");

    const SpeechRecognitionApi = useMemo(
        () => window.SpeechRecognition || window.webkitSpeechRecognition || null,
        []
    );

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, isSending]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            window.speechSynthesis?.cancel();
        };
    }, []);

    useEffect(() => {
        const loadVoices = () => {
            voicesRef.current = window.speechSynthesis?.getVoices?.() || [];
        };

        loadVoices();
        window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
        return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
    }, []);

    const speak = (text) => {
        if (!text || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance === "undefined") return;

        const utterance = new window.SpeechSynthesisUtterance(text);
        const voices = voicesRef.current;

        // 🔹 1. Izbor NAJBOLJEG slovačkog glasa
        const preferredVoice =
            voices.find((v) =>
                v.lang?.toLowerCase().includes("sk") &&
                v.name?.toLowerCase().includes("microsoft")
            ) ||
            voices.find((v) => v.lang?.toLowerCase().startsWith("sk")) ||
            voices.find((v) => v.lang?.toLowerCase().startsWith("cs"));

        if (preferredVoice) utterance.voice = preferredVoice;

        // 🔹 2. Jezik
        utterance.lang = preferredVoice?.lang || "sk-SK";

        // 🔹 3. SPORIJE I JASNIJE
        utterance.rate = 0.85;   // idealno za slovački
        utterance.pitch = 1;

        // 🔹 4. Ne sme da pojede prvu reč
        window.speechSynthesis.cancel();
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 150);

        utterance.onerror = () => {
            if (text === greeting) needsGreetingRetryRef.current = true;
        };

        // 🔹 5. Ako browser blokira autoplay
        if (text === greeting) {
            setTimeout(() => {
                if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                    needsGreetingRetryRef.current = true;
                }
            }, 120);
        }
    };

    const maybeShowSubOptions = (text) => {
        const category = detectCategory(text);
        if (!category || category === "asistent") return category;

        const optionMessage = formatSubOptions(category);
        setMessages((prev) => [...prev, { role: "assistant", text: optionMessage }]);
        speak(optionMessage);
        return category;
    };

    const resolveSubOptionReply = (categoryKey, text) => {
        if (!categoryKey || !subOptions[categoryKey]) return null;
        const normalizedNumber = parseMenuNumber(text);
        const direct = normalizedNumber ? subOptions[categoryKey][normalizedNumber] : null;
        if (!direct) return null;
        return `Rozumiem. Zvolili ste: ${direct}. Pokracujte, prosim, dalsim pokynom.`;
    };

    const isMainMenuCommand = (text) => {
        const t = text.toLowerCase().trim();
        return t === "menu" || t === "hlavne menu" || t === "spat" || t === "spat na menu";
    };

    useEffect(() => {
        if (hasSpokenGreetingRef.current) return;
        hasSpokenGreetingRef.current = true;
        speak(greeting);
    }, []);

    useEffect(() => {
        const unlockAudioOnFirstGesture = () => {
            if (hasUnlockedAudioRef.current) return;
            hasUnlockedAudioRef.current = true;

            if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === "undefined") return;

            // "Warm up" speech engine after first user interaction
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

    const sendMessage = async (textOverride) => {
        const trimmed = (typeof textOverride === "string" ? textOverride : input).trim();
        if (!trimmed || isSending) return;

        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        setInput("");
        setIsSending(true);

        if (isMainMenuCommand(trimmed)) {
            setSelectedCategory(null);
            setMessages((prev) => [...prev, { role: "assistant", text: greeting }]);
            speak(greeting);
            setIsSending(false);
            return;
        }

        // Ako je kategorija vec izabrana, broj 1..n tumaci kao podopciju te kategorije
        const activeCategory = selectedCategory;
        const fixedReply = resolveSubOptionReply(activeCategory, trimmed);
        if (fixedReply) {
            setMessages((prev) => [...prev, { role: "assistant", text: fixedReply }]);
            speak(fixedReply);

            if (activeCategory === "fakturacia" && (trimmed === "2" || trimmed.includes("ocr"))) {
                setTimeout(() => fileInputRef.current?.click(), 250);
            }

            setIsSending(false);
            return;
        }

        // Ako je korisnik u kategoriji i izgovori broj/rec broja van opsega, vrati ga u meni kategorije.
        if (activeCategory && parseMenuNumber(trimmed)) {
            const retryMessage = formatSubOptions(activeCategory);
            setMessages((prev) => [...prev, { role: "assistant", text: retryMessage }]);
            speak(retryMessage);
            setIsSending(false);
            return;
        }

        // Ako nismo u kategoriji, onda biramo glavnu kategoriju
        let categoryFromInput = null;
        if (!selectedCategory) {
            categoryFromInput = maybeShowSubOptions(trimmed);
            if (categoryFromInput && categoryFromInput !== "asistent") {
                setSelectedCategory(categoryFromInput);
                setIsSending(false);
                return;
            }
        }

        try {
            const data = await apiFetch("/api/ai/command", {
                method: "POST",
                body: { text: trimmed, context },
            });

            const reply = data.reply || data.answer || "Rozumiem.";
            setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
            speak(reply);

            if (data.context) setContext(data.context);

            if (
                (selectedCategory === "fakturacia" || categoryFromInput === "fakturacia") &&
                (trimmed === "2" || trimmed.toLowerCase().includes("ocr"))
            ) {
                setTimeout(() => fileInputRef.current?.click(), 250);
            }
        } catch {
            const errorMessage = "Vyskytla sa chyba pri komunikacii so serverom.";
            setMessages((prev) => [
                ...prev,
                { role: "assistant", text: errorMessage },
            ]);
            speak(errorMessage);
        } finally {
            setIsSending(false);
        }
    };

    const toggleSpeech = () => {
        setSpeechError("");
        // Kada korisnik ukljuci mikrofon, asistent prestaje da cita naglas.
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
                // Posalji automatski ono sto je korisnik izgovorio.
                sendMessage(transcript);
            }
        };
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map((result) => result[0]?.transcript || "")
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

            <div className="modern-chat-overlay" role="dialog" aria-modal="true" onClick={onClose}>
                <section className="modern-chat-panel" onClick={(e) => e.stopPropagation()}>
                    <header className="modern-chat-header">
                        <div>
                            <h3>Asistent</h3>
                            <p>Slovensko + srpski</p>
                        </div>
                        <button type="button" className="modern-chat-close" onClick={onClose} aria-label="Zatvori chat">
                            ×
                        </button>
                    </header>

                    <div className="modern-chat-messages" ref={listRef}>
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
                                {message.text}
                            </div>
                        ))}
                        {isSending && <div className="chat-bubble assistant">Asistent pise...</div>}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*,.pdf"
                        onChange={(event) => {
                            if (event.target.files?.[0]) {
                                setMessages((prev) => [
                                    ...prev,
                                    { role: "user", text: `Učitan fajl: ${event.target.files[0].name}` },
                                ]);
                            }
                        }}
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
                            placeholder="Piši poruku ili komandu (npr. 1 za fakturaciju)..."
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
                    {speechError && <p className="modern-chat-speech-error">{speechError}</p>}
                </section>
            </div>
        </>
    );
}

export default AssistantChatWindow;