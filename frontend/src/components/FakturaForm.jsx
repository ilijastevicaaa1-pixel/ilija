import React, { useState } from "react";

export default function FakturaForm({ tip, artikli, onSubmit, onCancel, loading }) {
  // tip: "ulaz" ili "izlaz"
  const [broj, setBroj] = useState("");
  const [datum, setDatum] = useState("");
  const [partner, setPartner] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    if (!broj || !datum || !partner) {
      setError("Sva polja su obavezna.");
      return;
    }
    setError("");
    onSubmit({ broj, datum, partner, artikli });
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '24px 0', background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
      <h3>{tip === "ulaz" ? "Ulazna faktura" : "Izlazna faktura"}</h3>
      <div style={{ marginBottom: 8 }}>
        <label>Broj fakture: <input value={broj} onChange={e => setBroj(e.target.value)} /></label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Datum: <input type="date" value={datum} onChange={e => setDatum(e.target.value)} /></label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>{tip === "ulaz" ? "Dobavljač" : "Kupac"}: <input value={partner} onChange={e => setPartner(e.target.value)} /></label>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <button type="submit" disabled={loading}>Kreiraj fakturu + skladišne promene</button>
      <button type="button" onClick={onCancel} style={{ marginLeft: 16 }}>Otkaži</button>
    </form>
  );
}
