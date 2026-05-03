import { useNavigate } from "react-router-dom";
import "../styles/manual-entry.css";

export default function ManualEntryScreen() {
    const navigate = useNavigate();

    return (
        <div className="manual-entry-screen">
            {/* Späť */}
            <button onClick={() => window.history.back()} className="btn-back">
                ← Späť
            </button>

            {/* Title */}
            <h1 className="title">✍️ Ručný vstup</h1>

            <p className="subtitle">
                Vyberte typ ručného účtovného zápisu:
            </p>

            {/* Sekcie */}
            <div className="manual-entry-grid">

                {/* BANKA */}
                <div className="manual-entry-card">
                    <h2>🏦 Banka</h2>
                    <p>Ručné pridanie bankovej transakcie (príjem / výdavok).</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/banka")}
                    >
                        Otvoriť
                    </button>
                </div>

                {/* POKLADŇA */}
                <div className="manual-entry-card">
                    <h2>💼 Pokladňa</h2>
                    <p>Ručné účtovanie hotovostných príjmov a výdavkov.</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/pokladna")}
                    >
                        Otvoriť
                    </button>
                </div>

                {/* FAKTÚRA */}
                <div className="manual-entry-card">
                    <h2>📄 Faktúra</h2>
                    <p>Ručné vytvorenie alebo zaúčtovanie faktúry.</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/faktura")}
                    >
                        Otvoriť
                    </button>
                </div>

                {/* DODÁVATEĽ */}
                <div className="manual-entry-card">
                    <h2>👤 Dodávateľ</h2>
                    <p>Ručné pridanie alebo úprava dodávateľa.</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/dodavatel")}
                    >
                        Otvoriť
                    </button>
                </div>

                {/* ODBERATEĽ */}
                <div className="manual-entry-card">
                    <h2>👥 Odberateľ</h2>
                    <p>Ručné pridanie alebo úprava odberateľa.</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/odberatel")}
                    >
                        Otvoriť
                    </button>
                </div>

                {/* ÚČTOVNÝ ZÁPIS */}
                <div className="manual-entry-card">
                    <h2>📘 Účtovný zápis</h2>
                    <p>Ručné účtovanie do hlavnej knihy (MD/DAL).</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/uctovny-zapis")}
                    >
                        Otvoriť
                    </button>
                </div>

                {/* DPH */}
                <div className="manual-entry-card">
                    <h2>🧾 DPH</h2>
                    <p>Ručné doplnenie údajov pre DPH priznanie.</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/dph")}
                    >
                        Otvoriť
                    </button>
                </div>

                {/* OSTATNÉ */}
                <div className="manual-entry-card">
                    <h2>➕ Ostatné</h2>
                    <p>Ďalšie typy účtovných zápisov (budúce rozšírenie).</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/manual-entry/other")}
                    >
                        Otvoriť
                    </button>
                </div>

            </div>
        </div>
    );
}