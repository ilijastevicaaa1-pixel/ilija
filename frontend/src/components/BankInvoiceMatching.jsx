import React, { useEffect, useState } from "react";

// Prikazuje predloge za matching banke i faktura
export default function BankInvoiceMatching() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/matching/bank-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // može se proširiti za custom input
    })
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.matches || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Greška pri učitavanju podudaranja.");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Učitavanje predloga za povezivanje...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!matches.length) return <div>Nema predloga za povezivanje.</div>;

  return (
    <div>
      <h3>Predlozi za povezivanje banke i faktura</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Bank. transakcija</th>
            <th>Faktura</th>
            <th>Score</th>
            <th>Razlog</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={i}>
              <td>{m.bank_tx_id}</td>
              <td>{m.invoice_id}</td>
              <td>{(m.score * 100).toFixed(0)}%</td>
              <td>{m.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
