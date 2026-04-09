import React from 'react';

function StockDetails({ stock }) {
  if (!stock) return <div>Izaberite artikal za detalje.</div>;
  return (
    <div style={{padding: 24}}>
      <h3>Detalji zaliha / magacina</h3>
      <ul>
        <li><b>Artikal:</b> {stock.item_name}</li>
        <li><b>Količina:</b> {stock.quantity}</li>
        <li><b>Jedinica mere:</b> {stock.unit}</li>
        <li><b>Lokacija:</b> {stock.location}</li>
        <li><b>Datum:</b> {stock.date}</li>
        <li><b>Opis:</b> {stock.description}</li>
      </ul>
    </div>
  );
}

export default StockDetails;
