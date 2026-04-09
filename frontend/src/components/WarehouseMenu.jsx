import React from "react";
import { Link } from "react-router-dom";

export default function WarehouseMenu() {
  return (
    <nav style={{ margin: '24px 0', padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
      <b style={{ fontSize: 18 }}>Skladište</b>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li><Link to="/skladiste/artikli">Artikli</Link></li>
        <li><Link to="/skladiste/stanje">Stanje zaliha</Link></li>
        <li><Link to="/skladiste/prijemke">Príjemke (Ulazi)</Link></li>
        <li><Link to="/skladiste/vydajke">Výdajke (Izlazi)</Link></li>
        <li><Link to="/skladiste/kartica/1">Kartica (primer)</Link></li>
      </ul>
    </nav>
  );
}
