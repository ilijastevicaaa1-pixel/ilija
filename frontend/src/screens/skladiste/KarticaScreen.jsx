import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

function TimelineEntry({ entry }) {
  const isReceipt = entry.type === "Príjemka";
  const arrow = isReceipt ? "🟢↑" : "🔴↓";
  const qtySign = isReceipt ? "+" : "-";
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #eee',
      fontSize: 16
    }}>
      <span style={{ width: 90, color: '#888' }}>{entry.date ? entry.date.slice(0, 10) : ""}</span>
      <span style={{ width: 40, fontSize: 22 }}>{arrow}</span>
      <span style={{ width: 110, color: isReceipt ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
        {qtySign}{Math.abs(entry.quantity)} kom
      </span>
      <span style={{ width: 100 }}>{entry.type}</span>
      <span style={{ width: 120 }}>
        {entry.fakturaId ? (
          <Link to={`/faktura/${entry.fakturaId}`}>Faktura #{entry.fakturaId}</Link>
        ) : ""}
      </span>
      <span style={{ width: 120, color: '#555' }}>
        Stanje: <b>{entry.stockAfter}</b>
      </span>
    </div>
  );
}

export default function KarticaScreen() {
  const { itemId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [item, setItem] = useState(null);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/warehouse/item/${itemId}`);
        if (!res.ok) throw new Error("Greška pri učitavanju podataka.");
        const data = await res.json();
        setItem(data.item || {});
        // Calculate stock after each movement if not provided
        let stock = data.initialStock ?? 0;
        const hist = (data.history || []).map((h) => ({ ...h }));
        for (let i = 0; i < hist.length; ++i) {
          const entry = hist[i];
          if (typeof entry.stockAfter === "undefined") {
            stock += entry.type === "Príjemka" ? entry.quantity : -entry.quantity;
            entry.stockAfter = stock;
          }
        }
        setHistory(hist);
      } catch (e) {
        setError(e.message || "Greška pri učitavanju.");
      }
      setLoading(false);
    }
    fetchData();
  }, [itemId]);

  if (loading) return <div>Učitavanje...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!item) return <div>Nema podataka.</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 8, padding: 24 }}>
      <h2>Skladišna kartica</h2>
      <div style={{ marginBottom: 16 }}>
        <b>Artikal:</b> {item.name || ""}<br />
        <b>Trenutna zaliha:</b> {item.stock ?? ""}
      </div>
      <div style={{ margin: '24px 0 8px 0', fontWeight: 600, fontSize: 17 }}>Istorija ulaza/izlaza:</div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fafcff', padding: 8 }}>
        {history.length === 0 && <div style={{ color: '#888', padding: 16 }}>Nema promena za ovaj artikal.</div>}
        {history.map((entry, idx) => (
          <TimelineEntry entry={entry} key={idx} />
        ))}
      </div>
      <div style={{ marginTop: 32 }}>
        <button onClick={() => navigate(-1)}>Nazad</button>
      </div>
    </div>
  );
}
