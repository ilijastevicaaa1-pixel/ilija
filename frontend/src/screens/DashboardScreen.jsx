import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import AssistantChatWindow from "../components/chat/AssistantChatWindow.jsx";
import { apiFetch } from "../api.js";

function Card({ label, value, color }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 18,
        textAlign: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: "0.85rem",
          color: "#666",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: "bold",
          color: color || "#333",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function DashboardScreen() {
  const { logout } = useAuth();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [root, setRoot] = useState(null);

  useEffect(() => {
    setRoot(document.getElementById("assistant-root"));
  }, []);

  useEffect(() => {
    apiFetch("/api/dashboard")
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return <div style={{ margin: 40 }}>Učitavanje...</div>;

  if (error)
    return (
      <div style={{ color: "red", margin: 40 }}>
        Greška: {error}
      </div>
    );

  const fmt = (n) =>
    Number(n || 0).toLocaleString("sr-RS", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €";

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("sr-RS") : "";

  const Section = ({ title, children }) => (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ fontSize: "1.1rem", marginBottom: 12, color: "#333" }}>
        {title}
      </h2>
      {children}
    </div>
  );

  return (
    <div
      style={{
        padding: "30px 16px 120px",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Dashboard Pregled
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Card label="Korisnici" value={data.users || 0} />
        <Card label="Ulazne fakture" value={data.inputInvoices || 0} />
        <Card label="Izlazne fakture" value={data.outputInvoices || 0} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Card label="Prihod" value={fmt(data.income)} color="#2a7" />
        <Card label="Rashod" value={fmt(data.expense)} color="#e55" />
        <Card
          label="Profit"
          value={fmt(data.profit)}
          color={(data.profit || 0) >= 0 ? "#2a7" : "#e55"}
        />
      </div>

      {/* Nedavne transakcije */}
      <Section title="Nedavne transakcije">
        {(data.recentTransactions || []).length === 0 ? (
          <div style={{ color: "#888" }}>Nema nedavnih transakcija.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Datum</th>
                <th style={{ textAlign: "left", padding: 8 }}>Opis</th>
                <th style={{ textAlign: "right", padding: 8 }}>Iznos</th>
                <th style={{ textAlign: "left", padding: 8 }}>Tip</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentTransactions || []).map((tx, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{fmtDate(tx.datum)}</td>
                  <td style={{ padding: 8 }}>{tx.opis || tx.description || "-"}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {fmt(tx.iznos || tx.amount)}
                  </td>
                  <td style={{ padding: 8 }}>{tx.tip || tx.type || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Nadolazeći rokovi */}
      <Section title="Nadolazeći rokovi">
        {(data.upcomingDeadlines || []).length === 0 ? (
          <div style={{ color: "#888" }}>Nema nadolazećih rokova.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Naziv</th>
                <th style={{ textAlign: "left", padding: 8 }}>Rok</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.upcomingDeadlines || []).map((dl, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{dl.name || dl.title || "-"}</td>
                  <td style={{ padding: 8 }}>{fmtDate(dl.deadline_date || dl.date)}</td>
                  <td style={{ padding: 8 }}>{dl.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Nedavne fakture */}
      <Section title="Nedavne fakture">
        {(data.recentInvoices || []).length === 0 ? (
          <div style={{ color: "#888" }}>Nema nedavnih faktura.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Broj/Naziv</th>
                <th style={{ textAlign: "left", padding: 8 }}>Strana</th>
                <th style={{ textAlign: "right", padding: 8 }}>Iznos</th>
                <th style={{ textAlign: "left", padding: 8 }}>Tip</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentInvoices || []).map((inv, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{inv.title || inv.invoice_number || "-"}</td>
                  <td style={{ padding: 8 }}>{inv.party || inv.supplier || inv.customer || "-"}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {fmt(inv.amount || inv.total_amount)}
                  </td>
                  <td style={{ padding: 8 }}>
                    {inv.type === "input"
                      ? "Ulazna"
                      : inv.type === "output"
                        ? "Izlazna"
                        : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <button
        onClick={() => {
          logout();
          window.location.href = "/login";
        }}
        style={{
          padding: "10px 18px",
          background: "#ff6b6b",
          color: "#fff",
          borderRadius: 10,
          fontWeight: "bold",
          border: "none",
          cursor: "pointer",
        }}
      >
        Odjavi se
      </button>

      <button
        onClick={() => setShowChat(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#007bff",
          color: "#fff",
          border: "none",
          fontSize: "22px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        🤖
      </button>

      {showChat &&
        root &&
        createPortal(
          <AssistantChatWindow onClose={() => setShowChat(false)} />,
          root
        )}
    </div>
  );
}