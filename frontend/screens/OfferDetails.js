import React from 'react';

function OfferDetails({ offer }) {
  if (!offer) return <div>Izaberite ponudu za detalje.</div>;
  return (
    <div style={{padding: 24}}>
      <h3>Detalji ponude</h3>
      <ul>
        <li><b>Kupac:</b> {offer.customer}</li>
        <li><b>Iznos:</b> {offer.amount}</li>
        <li><b>Datum:</b> {offer.date}</li>
        <li><b>Broj ponude:</b> {offer.offer_number}</li>
        <li><b>Valuta:</b> {offer.currency}</li>
        <li><b>Opis:</b> {offer.description}</li>
      </ul>
    </div>
  );
}

export default OfferDetails;
