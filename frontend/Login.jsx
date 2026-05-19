import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../../api/apiFetch";

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

// ----------------------
// WORD MAP (SK čísla)
// ----------------------
const wordMap = {
  jeden: "1",
  jedna: "1",
  jedno: "1",
  dva: "2",
  dve: "2",
  tri: "3",
  styri: "4",
  štyri: "4",
  pat: "5",
  päť: "5",
  sest: "6",
  šesť: "6",
  sedem: "7",
  osem: "8",
  devat: "9",
  deväť: "9",
  desat: "10",
  desať: "10",
  jedenast: "11",
  jedenásť: "11"
};

// ----------------------
// PARSE MENU NUMBER
// ----------------------
function parseMenuNumber(text) {
  if (!text) return null;

  const normalized = normalizeText(text).replace(/[^\w\s]/g, " ");
  const compact = normalized.replace(/\s+/g, " ").trim();

  const numberMatch = compact.match(/\b([1-9]|10|11)\b/);
  if (numberMatch) return numberMatch[1];

  const tokens = compact.split(" ").filter(Boolean);
  const joined = tokens.join("");

  for (const token of tokens) {
    if (wordMap[token]) return wordMap[token];
  }

  if (wordMap[joined]) return wordMap[joined];

  return null;
}

// ----------------------
// DETECT CATEGORY
// ----------------------
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

// ----------------------
// UI KOMPONENT
// ----------------------
export default function AssistantChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Dobrý deň... Ako vám môžem pomôcť?\nPonúkam tieto služby:\n1) Fakturácia\n2) Bankové operácie\n3) DPH\n4) Výdavky\n5) Príjmy\n6) Reporty\n7) Dokumenty\n8) Zákazníci\n9) Projekty\n10) Asistent\n11) Skladové hospodárstvo\n\nProsím, vyberte si jednu z možností (napíšte číslo)."
    }
  ]);

  const [input, setInput] = useState("");
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await apiFetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, context })
      });

      const reply = data.reply || data.answer || "AI neodpovedalo.";
      const newCtx = data.context || null;

      setContext(newCtx);

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Chyba: server neodpovedá." }
      ]);
    }

    setInput("");
    setLoading(false);
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <div
        style={{
          border: "1px solid #ccc",
          padding: 16,
          borderRadius: 8,
          height: 500,
          overflowY: "auto",
          background: "#fafafa"
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              textAlign: m.role === "user" ? "right" : "left"
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 6,
                background: m.role === "user" ? "#d1e7ff" : "#fff",
                border: "1px solid #ccc"
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Napíšte správu..."
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={sendMessage} disabled={loading} style={{ padding: "0 20px" }}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
