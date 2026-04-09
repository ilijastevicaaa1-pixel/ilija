import React, { useEffect, useState } from "react";
import VydajkaForm from "../../components/VydajkaForm.jsx";
import { useNavigate } from "react-router-dom";

export default function VydajkeScreen() {
  const [form, setForm] = useState({});
  const [issues, setIssues] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function fetchAll() {
    setLoading(true);
    const [issuesRes, itemsRes] = await Promise.all([
      fetch("/api/issues").then(r => r.json()),
      fetch("/api/items").then(r => r.json())
    ]);
    setIssues(issuesRes);
    setItems(itemsRes);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const handleFormSubmit = (data) => {
    setForm(data);
    navigate("/faktura");
  };

  async function handleAdd(data) {
    setError("");
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "Greška pri dodavanju výdajke");
      return;
    }
    setShowForm(false);
    fetchAll();
  }

  if (loading) return <div>Učitavanje...</div>;

  return (
    <div>
      <h2>Výdajke (Izlazi)</h2>
      <button onClick={() => setShowForm(true)}>+ Nova výdajka</button>
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ccc', padding: 16, margin: '16px 0', borderRadius: 8 }}>
          <VydajkaForm items={items} onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        </div>
      )}
      <table style={{ width: '100%', marginTop: 16, background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>Datum</th>
            <th>Artikal</th>
            <th>Količina</th>
            <th>Faktura</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {issues.map(v => (
            <tr key={v.id}>
              <td>{v.date ? v.date.slice(0, 10) : ""}</td>
              <td>{v.item_name}</td>
              <td>{v.quantity}</td>
              <td>{v.faktura_id ? <a href={`/fakture/${v.faktura_id}`}>Faktura</a> : '-'}</td>
              <td><button onClick={() => navigate(`/skladiste/kartica/${v.item_id}`)}>Detalji</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
