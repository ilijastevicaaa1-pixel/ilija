import React from 'react';

function TravelOrderDetails({ order }) {
  if (!order) return <div>Izaberite putni nalog za detalje.</div>;
  return (
    <div style={{padding: 24}}>
      <h3>Detalji putnog naloga</h3>
      <ul>
        <li><b>Zaposleni:</b> {order.employee}</li>
        <li><b>Relacija:</b> {order.route}</li>
        <li><b>Datum polaska:</b> {order.date_start}</li>
        <li><b>Datum povratka:</b> {order.date_end}</li>
        <li><b>Vozilo:</b> {order.vehicle}</li>
        <li><b>Svrha:</b> {order.purpose}</li>
        <li><b>Iznos:</b> {order.amount}</li>
      </ul>
    </div>
  );
}

export default TravelOrderDetails;
