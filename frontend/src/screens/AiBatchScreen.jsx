import React, { useState } from "react";
import FakturaForm from "../components/FakturaForm.jsx";

export default function AiBatchScreen() {

  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipovi, setTipovi] = useState([]); // "ulaz" ili "izlaz" po dokumentu
  const [showFaktura, setShowFaktura] = useState(null); // index dokumenta za koji se prikazuje faktura forma

  const handleFilesChange = e => {
    const fs = Array.from(e.target.files);
    setFiles(fs);
    setResults([]);
    setTipovi(fs.map(() => "ulaz"));
  };

  // Batch upload i AI obrada
  const handleSend = async () => {
    setLoading(true);
    const newResults = [];
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/ai/parse-faktura", {
          method: "POST",
          body: formData
        });
        if (!res.ok) throw new Error("Greška u AI prepoznavanju.");
        const data = await res.json();
        if (!data.items || data.items.length === 0) {
          newResults.push({ name: file.name, status: "❌ Nema rezultata", artikli: [], confirmed: false });
        } else {
          newResults.push({ name: file.name, status: "Čeka potvrdu", artikli: data.items.map(a => ({ ...a })), confirmed: false });
        }
      } catch (e) {
        newResults.push({ name: file.name, status: "⚠ Greška: " + (e.message || "AI greška"), artikli: [], confirmed: false });
      }
    }
    setResults(newResults);
    setLoading(false);
  };

  // Izmena artikla
  const handleEdit = (docIdx, artIdx, field, value) => {
    setResults(results => results.map((r, i) =>
      i === docIdx ? {
        ...r,
        artikli: r.artikli.map((a, j) => j === artIdx ? { ...a, [field]: value } : a)
      } : r
    ));
  };

  // Izmena tipa (ulaz/izlaz)
  const handleTipChange = (docIdx, value) => {
    setTipovi(tipovi => tipovi.map((t, i) => i === docIdx ? value : t));
  };

  // Prikaz forme za fakturu
  const handleConfirm = (docIdx) => {
    setShowFaktura(docIdx);
  };

  // Kada korisnik potvrdi fakturu i artikle za jedan dokument
  const handleFakturaSubmit = async (docIdx, fakturaData) => {
    setResults(results => results.map((r, i) => i === docIdx ? { ...r, status: "Obrada..." } : r));
    const doc = results[docIdx];
    const tip = tipovi[docIdx];
    let success = true;
    let errorMsg = "";
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
          artikli: doc.artikli
        })
      });
      if (!fakturaRes.ok) throw new Error("Greška pri kreiranju fakture.");
      const faktura = await fakturaRes.json();
      // 2. Kreiraj skladišne promene za svaki artikal
      const skladisteEndpoint = tip === "ulaz" ? "/api/receipts" : "/api/issues";
      for (const artikal of doc.artikli) {
        const res = await fetch(skladisteEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...artikal, fakturaId: faktura.id })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          errorMsg = err.message || "Greška pri kreiranju";
          success = false;
          break;
        }
      }
    } catch (e) {
      errorMsg = e.message || "Greška pri kreiranju";
      success = false;
    }
    setResults(results => results.map((r, i) =>
      i === docIdx
        ? { ...r, status: success ? "✔ Uspešno kreirano" : ("⚠ " + errorMsg), confirmed: true }
        : r
    ));
    setShowFaktura(null);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 8, padding: 24 }}>
      <h2>Batch AI fakturisanje</h2>
      <input type="file" accept="application/pdf,image/*" multiple onChange={handleFilesChange} />
      <button onClick={handleSend} disabled={loading || files.length === 0} style={{ marginLeft: 16 }}>Pošalji na AI</button>
      {loading && <div>Obrada u toku...</div>}
      {results.length > 0 && (
        <table style={{ width: '100%', marginTop: 24, background: '#fff', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th>Dokument</th>
              <th>Status</th>
              <th>Tip</th>
              <th>Artikli</th>
              <th>Potvrda</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, docIdx) => (
              <tr key={docIdx}>
                <td>{r.name}</td>
                <td>{r.status}</td>
                <td>
                  <select value={tipovi[docIdx] || "ulaz"} onChange={e => handleTipChange(docIdx, e.target.value)} disabled={r.confirmed}>
                    <option value="ulaz">Ulaz (príjemka)</option>
                    <option value="izlaz">Izlaz (výdajka)</option>
                  </select>
                </td>
                <td>
                  {r.artikli.length === 0 ? <span style={{ color: '#888' }}>Nema rezultata</span> :
                    <table style={{ width: '100%', background: '#fafafa', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Naziv</th>
                          <th>Količina</th>
                          <th>Cena</th>
                          <th>Izmeni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.artikli.map((a, artIdx) => (
                          <tr key={artIdx}>
                            <td>
                              <input value={a.naziv || ""} onChange={e => handleEdit(docIdx, artIdx, "naziv", e.target.value)} disabled={r.confirmed} />
                            </td>
                            <td>
                              <input type="number" value={a.količina || ""} onChange={e => handleEdit(docIdx, artIdx, "količina", e.target.value)} style={{ width: 70 }} disabled={r.confirmed} />
                            </td>
                            <td>
                              <input type="number" value={a.cena || ""} onChange={e => handleEdit(docIdx, artIdx, "cena", e.target.value)} style={{ width: 90 }} disabled={r.confirmed} />
                            </td>
                            <td>
                              <button onClick={() => setResults(results => results.map((row, i) =>
                                i === docIdx ? { ...row, artikli: row.artikli.filter((_, j) => j !== artIdx) } : row
                              ))} disabled={r.confirmed}>Obriši</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                </td>
                <td>
                  {r.artikli.length > 0 && !r.confirmed && !showFaktura && (
                    <button onClick={() => handleConfirm(docIdx)} disabled={r.status === "Obrada..."}>Potvrdi</button>
                  )}
                  {showFaktura === docIdx && (
                    <FakturaForm
                      tip={tipovi[docIdx]}
                      artikli={r.artikli}
                      onSubmit={data => handleFakturaSubmit(docIdx, data)}
                      onCancel={() => setShowFaktura(null)}
                      loading={r.status === "Obrada..."}
                    />
                  )}
                  {r.confirmed && <span style={{ color: 'green' }}>Potvrđeno</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
