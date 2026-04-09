import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArtikalForm from "../../components/ArtikalForm.jsx";

function getZaliha(item, state) {
  const found = state.find(s => s.id === item.id);
  return found ? found.quantity : 0;
}

export default function ArtikliScreen() {
  const [artikli, setArtikli] = useState([]);
  const [zaliha, setZaliha] = useState([]);
  const [items, setItems] = useState([]);
  const [state, setState] = useState([]); // zalihe
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const navigate = useNavigate();

  async function fetchAll() {
    setLoading(true);
    const [itemsRes, stateRes] = await Promise.all([
      fetch("/api/items").then(r => r.json()),
      fetch("/api/warehouse/state").then(r => r.json())
    ]);
    setItems(itemsRes);
    setState(stateRes);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleAdd(item) {
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    setShowForm(false);
    fetchAll();
  }

  async function handleEdit(item) {
    await fetch(`/api/items/${editItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    setEditItem(null);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("Obrisati artikal?")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    fetchAll();
  }

  const handleAddArtikal = (artikal) => {
    setArtikli([...artikli, artikal]);
  };

  const handleDeleteArtikal = (id) => {
    setArtikli(artikli.filter((item) => item.id !== id));
  };

  if (loading) return <div>Učitavanje...</div>;

  return (
    <div>
      <h2>Artikli</h2>
      <button onClick={() => { setEditItem(null); setShowForm(true); }}>+ Novi artikal</button>
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ccc', padding: 16, margin: '16px 0', borderRadius: 8 }}>
          <ArtikalForm
            initial={editItem}
            onSubmit={editItem ? handleEdit : handleAdd}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        </div>
      )}
      <table style={{ width: '100%', marginTop: 16, background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>Naziv</th>
            <th>Jedinica</th>
            <th>Minimalna zaliha</th>
            <th>Trenutna zaliha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.unit}</td>
              <td>{item.min_quantity || '-'}</td>
              <td>{getZaliha(item, state)}</td>
              <td>
                <button onClick={() => navigate(`/skladiste/kartica/${item.id}`)}>Kartica</button>
                <button onClick={() => { setEditItem(item); setShowForm(true); }}>Izmeni</button>
                <button onClick={() => handleDelete(item.id)}>Obriši</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
