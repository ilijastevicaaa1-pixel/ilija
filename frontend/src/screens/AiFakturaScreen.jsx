import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import FakturaForm from "../components/FakturaForm.jsx";

export default function AiFakturaScreen() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [artikli, setArtikli] = useState([]);
  const [editRows, setEditRows] = useState([]);
  const [tip, setTip] = useState("ulaz"); // ulaz ili izlaz
  const [showFaktura, setShowFaktura] = useState(false);
  const [fakturaId, setFakturaId] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setArtikli([]);
    setEditRows([]);
    setError("");
  };

  const handleUpload = async e => {
    e.preventDefault();
    if (!file) return setError("Izaberite PDF ili sliku fakture.");
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ai/parse-faktura", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Greška u AI prepoznavanju.");
      const data = await res.json();
      setArtikli(data.items || []);
      setEditRows((data.items || []).map(a => ({ ...a })));
    } catch (e) {
      setError(e.message || "Greška u AI prepoznavanju.");
    }
    setLoading(false);
  };

  const handleEdit = (idx, field, value) => {
    setEditRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };


  // Prvo prikazujemo FakturaForm, pa tek onda šaljemo sve
  const handleConfirm = () => {
    setShowFaktura(true);
  };

  // Kada korisnik potvrdi fakturu i artikle
  const handleFakturaSubmit = async (fakturaData) => {
    setLoading(true);
    setError("");
    try {
      // 1. Kreiraj fakturu
      const fakturaEndpoint = tip === "ulaz" ? "/api/fakture" : "/api/izlazne-fakture";
      const fakturaRes = await fetch(fakturaEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broj: fakturaData.broj,
          datum: fakturaData.datum,
          partner: fakturaData.partner,
          artikli: editRows
        })
      });
      if (!fakturaRes.ok) throw new Error("Greška pri kreiranju fakture.");
      const faktura = await fakturaRes.json();
      setFakturaId(faktura.id);
      // 2. Kreiraj skladišne promene za svaki artikal
      const skladisteEndpoint = tip === "ulaz" ? "/api/receipts" : "/api/issues";
      for (const artikal of editRows) {
        await fetch(skladisteEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...artikal, fakturaId: faktura.id })
        });
      }
      navigate(tip === "ulaz" ? "/skladiste/prijemke" : "/skladiste/vydajke");
    } catch (e) {
      setError(e.message || "Greška pri kreiranju fakture/skladišta.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 8, padding: 24 }}>
      <h2>AI faktura → skladište</h2>
      <form onSubmit={handleUpload} style={{ marginBottom: 24 }}>
        <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
        <button type="submit" disabled={loading}>Prepoznaj artikle</button>
        <select value={tip} onChange={e => setTip(e.target.value)} style={{ marginLeft: 16 }}>
          <option value="ulaz">Dobavljačka faktura (ulaz)</option>
          <option value="izlaz">Izlazna faktura (izlaz)</option>
        </select>
      </form>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {loading && <div>Učitavanje...</div>}
      {artikli.length > 0 && !showFaktura && (
        <div>
          <table style={{ width: '100%', marginTop: 16, background: '#fff', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th>Naziv</th>
                <th>Količina</th>
                <th>Cena</th>
                <th>Izmeni</th>
              </tr>
            </thead>
            <tbody>
              {editRows.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <input value={row.naziv || ""} onChange={e => handleEdit(idx, "naziv", e.target.value)} />
                  </td>
                  <td>
                    <input type="number" value={row.količina || ""} onChange={e => handleEdit(idx, "količina", e.target.value)} style={{ width: 70 }} />
                  </td>
                  <td>
                    <input type="number" value={row.cena || ""} onChange={e => handleEdit(idx, "cena", e.target.value)} style={{ width: 90 }} />
                  </td>
                  <td>
                    <button onClick={() => setEditRows(r => r.filter((_, i) => i !== idx))}>Obriši</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleConfirm} disabled={loading} style={{ marginTop: 24 }}>Potvrdi i nastavi na fakturu</button>
        </div>
      )}
      {showFaktura && (
        <FakturaForm
          tip={tip}
          artikli={editRows}
          onSubmit={handleFakturaSubmit}
          onCancel={() => setShowFaktura(false)}
          loading={loading}
        />
      )}
    </div>
  );
}
