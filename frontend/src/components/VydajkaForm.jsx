import React, { useState } from "react";

export default function VydajkaForm({ items, onSubmit, onCancel }) {
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!itemId) return setError("Izaberite artikal");
    if (!quantity || Number(quantity) <= 0) return setError("Količina mora biti > 0");
    setError("");
    onSubmit({ item_id: itemId, quantity, date });
  }

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: 320 }}>
      <div>
        <label>Artikal</label>
        <select value={itemId} onChange={e => setItemId(e.target.value)} required style={{ width: "100%" }}>
          <option value="">Izaberite...</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <div>
        <label>Količina</label>
        <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min={0.01} step={0.01} style={{ width: "100%" }} />
      </div>
      <div>
        <label>Datum</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%" }} />
      </div>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      <div style={{ marginTop: 12 }}>
        <button type="submit">Sačuvaj</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Otkaži</button>}
      </div>
    </form>
  );
}
