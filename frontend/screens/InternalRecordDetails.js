import React from 'react';

function InternalRecordDetails({ record }) {
  if (!record) return <div>Izaberite evidenciju za detalje.</div>;
  return (
    <div style={{padding: 24}}>
      <h3>Detalji interne evidencije</h3>
      <ul>
        <li><b>Tip evidencije:</b> {record.record_type}</li>
        <li><b>Datum:</b> {record.date}</li>
        <li><b>Opis:</b> {record.description}</li>
        <li><b>Povezani entiteti:</b> {record.related_entities}</li>
      </ul>
    </div>
  );
}

export default InternalRecordDetails;
