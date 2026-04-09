import React, { useEffect, useState } from "react";
import PrijemkaForm from "../../components/PrijemkaForm.jsx";
import { useNavigate } from "react-router-dom";

export default function PrijemkeScreen() {
  const [receipts, setReceipts] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  async function fetchAll() {
    setLoading(true);
    const [receiptsRes, itemsRes] = await Promise.all([
      fetch("/api/receipts").then(r => r.json()),
      fetch("/api/items").then(r => r.json())
    ]);
    setReceipts(receiptsRes);
    setItems(itemsRes);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleAdd(data) {
    await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    setShowForm(false);
    fetchAll();
  }

  if (loading) return <div>Učitavanje...</div>;

  return (
    <div>
      <h2>Príjemke (Ulazi)</h2>
      <button onClick={() => setShowForm(true)}>+ Nova príjemka</button>
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ccc', padding: 16, margin: '16px 0', borderRadius: 8 }}>
          <PrijemkaForm items={items} onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}
      <table style={{ width: '100%', marginTop: 16, background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>Datum</th>
            <th>Artikal</th>
            <th>Količina</th>
            <th>Cena</th>
            <th>Faktura</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {receipts.map(r => (
            <tr key={r.id}>
              <td>{r.date ? r.date.slice(0, 10) : ""}</td>
              <td>{r.item_name}</td>
              <td>{r.quantity}</td>
              <td>{r.price || '-'}</td>
              <td>{r.faktura_id ? <a href={`/fakture/${r.faktura_id}`}>Faktura</a> : '-'}</td>
              <td><button onClick={() => navigate(`/skladiste/kartica/${r.item_id}`)}>Detalji</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => navigate("/")}>Nazad</button>
    </div>
  );
}
