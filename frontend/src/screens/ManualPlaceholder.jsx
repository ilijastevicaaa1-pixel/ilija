import React from "react";
import { useParams } from "react-router-dom";

const ManualPlaceholder = () => {
    const { section } = useParams();

    const sectionNames = {
        banka: "Banka",
        pokladna: "Pokladňa",
        faktura: "Faktúra",
        dodavatel: "Dodávateľ",
        odberatel: "Odberateľ",
        uctovny- zapis: "Účtovný zápis",
            dph: "DPH",
                other: "Ostatné"
};

const displayName = sectionNames[section] || section;

return (
    <div className="manual-placeholder-screen">
        <button onClick={() => window.history.back()} className="btn-back">
            ← Späť
        </button>
        <h1 className="title">🔧 {displayName}</h1>
        <p className="subtitle">
            Tento modul je stále vo vývoji. Skoro bude dostupný.
        </p>
    </div>
);
};

export default ManualPlaceholder;
