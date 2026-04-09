import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function getStatus(qty, min) {
  if (min == null || min === "") return { label: "OK", color: "#2ecc40" };
  qty = Number(qty);
  min = Number(min);
  if (qty > min) return { label: "OK", color: "#2ecc40" };
  if (qty === min) return { label: "Nisko", color: "#f1c40f" };
  return { label: "Kritično", color: "#e74c3c" };
}

export default function StanjeScreen() {
  const [zaliha, setZaliha] = useState([]);
  const [state, setState] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/warehouse/state").then(r => r.json()).then(data => {
      setState(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Učitavanje...</div>;

  return (
    <div>
      <h2>Stanje zaliha</h2>
      <table style={{ width: '100%', marginTop: 16, background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>Naziv artikla</th>
            <th>Trenutna zaliha</th>
            <th>Minimalna zaliha</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {state.map(item => {
            const status = getStatus(item.quantity, item.min_quantity);
            return (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.min_quantity || '-'}</td>
                <td>
                  <span style={{ color: status.color, fontWeight: 'bold' }}>{status.label}</span>
                </td>
                <td>
                  <button onClick={() => navigate(`/skladiste/kartica/${item.id}`)}>Kartica</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button onClick={() => navigate("/")}>Povratak</button>
    </div>
  );
}
