import React from "react";
import { Link } from "react-router-dom";
import "./manual-entry.css"; // ako imaš CSS za ovaj ekran

function ManualEntryScreen() {
    return (
        <div className="manual-entry-screen">

            <button onClick={() => window.history.back()} className="btn-back">
                ← Späť
            </button>

            <h1 className="title">✍️ Ručný vstup</h1>
            <p className="subtitle">Vyberte typ účtovného zápisu:</p>

            <div className="manual-entry-options">

                <Link to="/manual-entry/banka" className="manual-entry-btn">
                    🏦 Banka – ručný zápis
                </Link>

                <Link to="/manual-entry/pokladna" className="manual-entry-btn">
                    💰 Pokladňa – ručný zápis
                </Link>

                <Link to="/manual-entry/faktura" className="manual-entry-btn">
                    📄 Faktúra – ručný zápis
                </Link>

                <Link to="/manual-entry/dodavatel" className="manual-entry-btn">
                    🧾 Dodávateľ – ručný zápis
                </Link>

                <Link to="/manual-entry/odberatel" className="manual-entry-btn">
                    👤 Odberateľ – ručný zápis
                </Link>

                <Link to="/manual-entry/uctovny-zapis" className="manual-entry-btn">
                    📘 Účtovný zápis
                </Link>

                <Link to="/manual-entry/dph" className="manual-entry-btn">
                    🧮 DPH – ručný vstup
                </Link>

                <Link to="/manual-entry/other" className="manual-entry-btn">
                    ⚙️ Ostatné
                </Link>

            </div>
        </div>
    );
}

export default ManualEntryScreen;
