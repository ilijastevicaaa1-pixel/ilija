import React, { useState } from "react";

// Global state (mimo komponenta)
let cat = null;
let sub = null;

function miniProcess(input) {
    const t = input.trim();

    if (!cat) {
        if (t === "1") {
            cat = "fakturacia";
            return "Vybral si fakturaciu. Zadaj pod-opciu.";
        }
        if (t === "2") {
            cat = "banka";
            return "Vybral si banku. Zadaj pod-opciu.";
        }
        return "Menu: 1) fakturacia 2) banka";
    }

    if (!sub) {
        if (t === "a") {
            sub = "A";
            return "Vybral si A.";
        }
        if (t === "b") {
            sub = "B";
            return "Vybral si B.";
        }
        return "Pod-opcie: a, b";
    }

    return `Pokračujem v ${cat} / ${sub}…`;
}

export default function AssistantChatWindowMini() {
    const [messages, setMessages] = useState([
        { role: "assistant", text: "Menu: 1) fakturacia 2) banka" }
    ]);
    const [input, setInput] = useState("");

    const onSend = () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        setMessages(prev => [...prev, { role: "user", text: trimmed }]);
        setInput("");

        const reply = miniProcess(trimmed);
        setMessages(prev => [...prev, { role: "assistant", text: reply }]);
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
                    onChange={e => setInput(e.target.value)}
                    placeholder="1, 2, a, b"
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                    onKeyDown={e => {
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

