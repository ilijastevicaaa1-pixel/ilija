import React from 'react';

function SalaryDetails({ salary }) {
  if (!salary) return <div>Izaberite obračun plate za detalje.</div>;
  return (
    <div style={{padding: 24}}>
      <h3>Detalji obračuna plate</h3>
      <ul>
        <li><b>Zaposleni:</b> {salary.employee}</li>
        <li><b>Mesec:</b> {salary.month}</li>
        <li><b>Bruto:</b> {salary.gross}</li>
        <li><b>Neto:</b> {salary.net}</li>
        <li><b>Porezi:</b> {salary.taxes}</li>
        <li><b>Doprinosi:</b> {salary.contributions}</li>
      </ul>
    </div>
  );
}

export default SalaryDetails;
