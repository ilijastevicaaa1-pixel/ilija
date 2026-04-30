import React, { useState } from "react";
import "../styles/bank-modern.css";

function BankScreen() {
    // ⭐ 1) VIŠE BANKOVNIH RAČUNA
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");

    const [newAccount, setNewAccount] = useState({
        bankName: "",
        iban: "",
        bic: "",
        accountNumber: ""
    });

    // ⭐ 2) TRANSAKCIJE
    const [transactions, setTransactions] = useState([]);

    const [form, setForm] = useState({
        date: "",
        description: "",
        amount: "",
        type: ""
    });

    // -----------------------------
    // ⭐ HANDLERS ZA RAČUNE
    // -----------------------------
    const handleNewAccountChange = (e) => {
        setNewAccount({ ...newAccount, [e.target.name]: e.target.value });
    };

    const handleAddAccount = () => {
        if (!newAccount.bankName || !newAccount.iban) return;

        const acc = {
            id: crypto.randomUUID(),
            ...newAccount
        };

        setAccounts((prev) => [...prev, acc]);
        setSelectedAccountId(acc.id);

        setNewAccount({
            bankName: "",
            iban: "",
            bic: "",
            accountNumber: ""
        });
    };

    // -----------------------------
    // ⭐ HANDLERS ZA TRANSAKCIJE
    // -----------------------------
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleAdd = (e) => {
        e.preventDefault();
        if (!form.date || !form.description || !form.amount || !form.type || !selectedAccountId) return;

        setTransactions((prev) => [
            ...prev,
            {
                ...form,
                id: Date.now(),
                amount: Number(form.amount),
                accountId: selectedAccountId
            }
        ]);

        setForm({
            date: "",
            description: "",
            amount: "",
            type: ""
        });
    };

    const handleDelete = (id) => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
    };

    // ⭐ FILTER TRANSAKCIJA ZA IZABRANI RAČUN
    const filteredTransactions = transactions.filter(
        (t) => t.accountId === selectedAccountId
    );

    return (
        <div className="bank-bg">
            <div className="bank-card">
                <h1 className="title">🏦 Bankovne transakcije</h1>

                {/* ----------------------------- */}
                {/* ⭐ BLOK: LISTA RAČUNA */}
                {/* ----------------------------- */}
                <div className="bank-info">
                    <h2 className="subtitle">Bankovni računi</h2>

                    {/* Dropdown za izbor računa */}
                    <select
                        className="input"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        style={{ marginBottom: 16 }}
                    >
                        <option value="">-- Izaberite račun --</option>
                        {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                                {acc.bankName} ({acc.accountNumber})
                            </option>
                        ))}
                    </select>

                    {/* Forma za dodavanje računa */}
                    <div className="form-grid">
                        <input
                            type="text"
                            name="bankName"
                            placeholder="Naziv banke"
                            value={newAccount.bankName}
                            onChange={handleNewAccountChange}
                            className="input"
                        />

                        <input
                            type="text"
                            name="iban"
                            placeholder="IBAN"
                            value={newAccount.iban}
                            onChange={handleNewAccountChange}
                            className="input"
                        />

                        <input
                            type="text"
                            name="bic"
                            placeholder="BIC / SWIFT"
                            value={newAccount.bic}
                            onChange={handleNewAccountChange}
                            className="input"
                        />

                        <input
                            type="text"
                            name="accountNumber"
                            placeholder="Broj računa"
                            value={newAccount.accountNumber}
                            onChange={handleNewAccountChange}
                            className="input"
                        />

                        <button
                            className="btn-primary"
                            style={{ gridColumn: "span 4" }}
                            onClick={handleAddAccount}
                        >
                            ➕ Dodaj račun
                        </button>
                    </div>
                </div>

                {/* ----------------------------- */}
                {/* ⭐ TRANSAKCIJE */}
                {/* ----------------------------- */}
                <form onSubmit={handleAdd} className="form-grid">
                    <input type="date" name="date" value={form.date} onChange={handleChange} className="input" />
                    <input type="text" name="description" placeholder="Opis" value={form.description} onChange={handleChange} className="input" />
                    <input type="number" name="amount" placeholder="Iznos" value={form.amount} onChange={handleChange} className="input" />

                    <select name="type" value={form.type} onChange={handleChange} className="input">
                        <option value="">Tip</option>
                        <option value="priliv">Priliv</option>
                        <option value="odliv">Odliv</option>
                    </select>

                    <button type="submit" className="btn-primary">Dodaj</button>
                </form>

                {/* ----------------------------- */}
                {/* ⭐ TABELA TRANSAKCIJA */}
                {/* ----------------------------- */}
                <table className="table">
                    <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Opis</th>
                            <th>Iznos</th>
                            <th>Tip</th>
                            <th>Akcije</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredTransactions.map((t) => (
                            <tr key={t.id}>
                                <td>{t.date}</td>
                                <td>{t.description}</td>
                                <td>{t.amount}</td>
                                <td>{t.type}</td>
                                <td>
                                    <button className="btn-danger" onClick={() => handleDelete(t.id)}>🗑️</button>
                                </td>
                            </tr>
                        ))}

                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan="6" className="empty">
                                    Nema transakcija za ovaj račun.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default BankScreen;
