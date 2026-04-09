import React from 'react';

function ContractDetails({ contract }) {
  if (!contract) return <div>Izaberite ugovor za detalje.</div>;
  return (
    <div style={{padding: 24}}>
      <h3>Detalji ugovora</h3>
      <ul>
        <li><b>Naziv ugovora:</b> {contract.contract_name}</li>
        <li><b>Partner:</b> {contract.partner}</li>
        <li><b>Iznos:</b> {contract.amount}</li>
        <li><b>Datum početka:</b> {contract.date_start}</li>
        <li><b>Datum završetka:</b> {contract.date_end}</li>
        <li><b>Opis:</b> {contract.description}</li>
      </ul>
    </div>
  );
}

export default ContractDetails;
