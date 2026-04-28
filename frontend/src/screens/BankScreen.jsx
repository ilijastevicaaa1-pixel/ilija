import React, { useState } from "react";
import "../styles/bank-modern.css";

function BankScreen() {
    const [bankInfo, setBankInfo] = useState({
        bankName: "",
        iban: "",
        bic: "",
        accountNumber: ""
    });

    const [transactions, setTransactions] = useState([]);
    const [form, setForm] = useState({
        date: "",
        description: "",
        amount: "",
        account: "",
        type: ""
    });

    const handleBankChange = (e) => {
        setBankInfo({ ...bankInfo, [e.target.name]: e.target.value });
    };

    const handleBankSave = () => {
        console.log("Sačuvano:", bankInfo);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleAdd = (e) => {
        e.preventDefault();
        if (!form.date || !form.description || !form.amount || !form.account || !form.type) return;

        setTransactions((prev) => [
            ...prev,
            { ...form, id: Date.now(), amount: Number(form.amount) }
        ]);

        setForm({ date: "", description: "", amount: "", account: "", type: "" });
    };

    const handleDelete = (id) => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="bank-bg">
            <div className="bank-card">
                <h1 className="title">🏦 Bankovne transakcije</h1>

                {/* BANK INFO BLOK */}
                <div className="bank-info">
                    <h2 className="subtitle">Podaci o banci</h2>

                    <div className="form-grid">
                        <input
                            type="text"
                            name="bankName"
                            placeholder="Naziv banke"
                            value={bankInfo.bankName}
                            onChange={handleBankChange}
                            className="input"
                        />

                        <input
                            type="text"
                            name="iban"
                            placeholder="IBAN"
                            value={bankInfo.iban}
                            onChange={handleBankChange}
                            className="input"
                        />

                        <input
                            type="text"
                            name="bic"
                            placeholder="BIC / SWIFT"
                            value={bankInfo.bic}
                            onChange={handleBankChange}
                            className="input"
                        />

                        <input
                            type="text"
                            name="accountNumber"
                            placeholder="Broj računa"
                            value={bankInfo.accountNumber}
                            onChange={handleBankChange}
                            className="input"
                        />

                        <button
                            className="btn-primary"
                            style={{ gridColumn: "span 4" }}
                            onClick={handleBankSave}
                        >
                            Sačuvaj banku
                        </button>
                    </div>
                </div>

                {/* TRANSAKCIJE */}
                <form onSubmit={handleAdd} className="form-grid">
                    <input type="date" name="date" value={form.date} onChange={handleChange} className="input" />
                    <input type="text" name="description" placeholder="Opis" value={form.description} onChange={handleChange} className="input" />
                    <input type="number" name="amount" placeholder="Iznos" value={form.amount} onChange={handleChange} className="input" />
                    <input type="text" name="account" placeholder="Račun" value={form.account} onChange={handleChange} className="input" />

                    <select name="type" value={form.type} onChange={handleChange} className="input">
                        <option value="">Tip</option>
                        <option value="priliv">Priliv</option>
                        <option value="odliv">Odliv</option>
                    </select>

                    <button type="submit" className="btn-primary">Dodaj</button>
                </form>

                <table className="table">
                    <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Opis</th>
                            <th>Iznos</th>
                            <th>Račun</th>
                            <th>Tip</th>
                            <th>Akcije</th>
                        </tr>
                    </thead>

                    <tbody>
                        {transactions.map((t) => (
                            <tr key={t.id}>
                                <td>{t.date}</td>
                                <td>{t.description}</td>
                                <td>{t.amount}</td>
                                <td>{t.account}</td>
                                <td>{t.type}</td>
                                <td>
                                    <button className="btn-danger" onClick={() => handleDelete(t.id)}>🗑️</button>
                                </td>
                            </tr>
                        ))}

                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan="6" className="empty">
                                    Nema transakcija. Dodaj prvu iznad.
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
