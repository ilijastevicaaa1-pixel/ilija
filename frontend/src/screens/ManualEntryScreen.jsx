import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/manual-entry.css";

function ManualEntryScreen() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const response = await fetch('/api/manual-entry/transactions', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Greška pri učitavanju');
            const data = await response.json();
            setTransactions(data.slice(0, 5)); // Poslednjih 5
        } catch (err) {
            console.error('Transakcije error:', err);
            setError('Nema transakcija ili greška');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="manual-entry-screen">
                <div className="loading">Učitavam...</div>
            </div>
        );
    }

    return (
        <div className="manual-entry-screen">
            <button className="btn-back" onClick={() => navigate(-1)}>
                ← Nazad
            </button>

            <header className="manual-header">
                <h1>✍️ Ručni unos</h1>
                <p>Unesite bankovne transakcije ili rashode/fakture ručno</p>
            </header>

            <div className="manual-buttons">
                <button
                    className="btn-primary"
                    onClick={() => navigate('/manual-entry/banka')}
                >
                    🏦 Banka transakcija
                </button>
                <button className="btn-secondary" disabled>
                    💰 Faktura/Rashod (skoro)
                </button>
            </div>

            <section className="recent-transactions">
                <h2>Poslednje transakcije</h2>
                {error ? (
                    <p className="no-transactions">{error}</p>
                ) : transactions.length === 0 ? (
                    <p className="no-transactions">Nema transakcija. Dodajte prvu!</p>
                ) : (
                    <div className="transactions-list">
                        {transactions.map((t, i) => (
                            <div key={i} className={`transaction ${t.tip}`}>
                                <span>{new Date(t.datum).toLocaleDateString('sr-RS')}</span>
                                <span>{t.opis}</span>
                                <strong>{parseFloat(t.iznos).toLocaleString('sr-RS')} RSD</strong>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default ManualEntryScreen;

