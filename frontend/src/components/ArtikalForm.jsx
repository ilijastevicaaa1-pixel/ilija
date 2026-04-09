import React, { useState } from "react";

export default function ArtikalForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [code, setCode] = useState(initial?.code || "");
  const [unit, setUnit] = useState(initial?.unit || "kom");
  const [minQuantity, setMinQuantity] = useState(initial?.min_quantity || "");
  const [description, setDescription] = useState(initial?.description || "");

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name, code, unit, min_quantity: minQuantity, description });
  }

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: 320 }}>
      <div>
        <label>Naziv</label>
        <input value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%" }} />
      </div>
      <div>
        <label>Šifra</label>
        <input value={code} onChange={e => setCode(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div>
        <label>Jedinica mere</label>
        <input value={unit} onChange={e => setUnit(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div>
        <label>Minimalna zaliha</label>
        <input type="number" value={minQuantity} onChange={e => setMinQuantity(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div>
        <label>Opis</label>
        <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <button type="submit">Sačuvaj</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Otkaži</button>}
      </div>
    </form>
  );
}
