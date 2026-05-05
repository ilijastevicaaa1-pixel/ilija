import React from "react";
import "../styles/offers.css";

const OffersScreen = () => {
  return (
    <div className="offers-screen">

      <button onClick={() => window.history.back()} className="btn-back">
        ← Späť
      </button>

      <h1 className="title">📑 Ponuky</h1>
      <p className="subtitle">
        Modul pre správu ponúk je vo vývoji. Čoskoro bude dostupný.
      </p>

      <div className="offers-placeholder-box">
        <p>Tu budete môcť:</p>
        <ul>
          <li>Vytvárať nové ponuky</li>
          <li>Exportovať do PDF</li>
          <li>Odosielať ponuky klientom</li>
          <li>Spravovať stav ponúk</li>
          <li>Prepojiť ponuku s faktúrou</li>
        </ul>
      </div>

    </div>
  );
};

export default OffersScreen;
