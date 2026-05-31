import React, { useState } from "react";
import { apiFetch } from "../../api.js";

// Global state (mimo komponenta)
let cat = null;
let sub = null;

function normalizeText(value) {
    return (value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// ===============================
// Llama poziv (tvoj format)
// ===============================
async function askLlama(text) {
    // DEBUG: logujemo šta šaljemo i šta vraća backend
    console.log("[MiniAI] askLlama input:", text);

    // Backend /routes/ai.js traži verifyToken → mora da postoji Authorization token.
    // Ako ga nema, ovaj poziv neće raditi (to je "ne radi" problem koji si prijavio).
    const token = localStorage.getItem("token");


    if (!token) {
        return "Chýba token (lokalStorage.token). Prihlás sa a skúšaj znovu.";
    }

    const res = await fetch("/api/ai/command", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text })
    });

    const data = await res.json().catch(() => ({}));
    console.log("[MiniAI] raw data:", data);

    if (data.answer) return data.answer;
    if (data.error) return data.error;
    if (data.reply) return data.reply;

    return `AI neodpoveda. raw=${typeof data === "string" ? data : JSON.stringify(data)}`;
}

async function executeOption(catKey, subKey, userInput) {
    if (catKey === "fakturacia" && subKey === "A") {
        return await askLlama("Vytvor faktúru podľa údajov: " + userInput);
    }

    if (catKey === "banka" && subKey === "A") {
        return await askLlama("Spracuj bankový výpis: " + userInput);
    }

    return "Táto funkcia ešte nie je implementovaná.";
}

async function miniProcess(input) {
    const t = normalizeText(input);

    // TEST mode: bypass menu logic to verify Llama works
    if (t.includes("test") && t.includes("ai")) {
        console.log("[MiniAI] TEST bypass hit");
        return await askLlama("ahoj");
    }

    console.log("[MiniAI] miniProcess normalized input:", t);


    // 1) výber kategórie
    if (!cat) {
        if (t === "1" || t.includes("fakturacia") || t.includes("faktura")) {
            cat = "fakturacia";
            return "Vybral si fakturaciu. Zadaj pod-opciu (a/b).";
        }
        if (t === "2" || t.includes("banka")) {
            cat = "banka";
            return "Vybral si banku. Zadaj pod-opciu (a/b).";
        }
        return "Menu: 1) fakturacia 2) banka";
    }

    // 2) výber pod-opcie
    if (!sub) {
        if (t === "a") {
            sub = "A";
            return "Vybral si A. Zadaj údaje.";
        }
        if (t === "b") {
            sub = "B";
            return "Vybral si B. Zadaj údaje.";
        }
        return "Pod-opcie: a, b";
    }

    // 3) vykonanie úlohy
    // v mini režimu očekujemo da askLlama vraća raw tekst ili answer; ako backend vrati JSON string, prikaži ga direktno
    return await executeOption(cat, sub, t);
}

export default function AssistantChatWindowMini() {
    const [messages, setMessages] = useState([
        { role: "assistant", text: "Menu: 1) fakturacia 2) banka" }
    ]);
    const [input, setInput] = useState("");

    const onSend = async () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        setInput("");

        const reply = await miniProcess(trimmed);
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    };

    return (
        <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
            <h3>Mini asistent</h3>

            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 12,
                    minHeight: 200,

                    background: "#fff"
                }}
            >
                {messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                        <b>{m.role === "user" ? "Ty" : "AI"}:</b> {m.text}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="1, 2, a, b alebo údaje"
                    style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc"
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSend();
                    }}
                />
                <button onClick={onSend} style={{ padding: "8px 12px" }}>
                    Poslať
                </button>
            </div>
        </div>
    );
}

