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
        console.log("Uložené:", bankInfo);
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
                <h1 className="title">🏦 Bankové transakcie</h1>

                {/* BANK INFO BLOK */}
                <div className="bank-info">
                    <h2 className="subtitle">Údaje o banke</h2>

                    <div className="form-grid">
                        <input
                            type="text"
                            name="bankName"
                            placeholder="Názov banky"
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
                            placeholder="Číslo účtu"
                            value={bankInfo.accountNumber}
                            onChange={handleBankChange}
                            className="input"
                        />

                        <button
                            className="btn-primary"
                            style={{ gridColumn: "span 4" }}
                            onClick={handleBankSave}
                        >
                            Uložiť banku
                        </button>
                    </div>
                </div>

                {/* TRANSAKCIE */}
                <form onSubmit={handleAdd} className="form-grid">
                    <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        className="input"
                    />

                    <input
                        type="text"
                        name="description"
                        placeholder="Popis"
                        value={form.description}
                        onChange={handleChange}
                        className="input"
                    />

                    <input
                        type="number"
                        name="amount"
                        placeholder="Suma"
                        value={form.amount}
                        onChange={handleChange}
                        className="input"
                    />

                    <input
                        type="text"
                        name="account"
                        placeholder="Účet"
                        value={form.account}
                        onChange={handleChange}
                        className="input"
                    />

                    <select
                        name="type"
                        value={form.type}
                        onChange={handleChange}
                        className="input"
                    >
                        <option value="">Typ</option>
                        <option value="priliv">Príliv</option>
                        <option value="odliv">Odliv</option>
                    </select>

                    <button type="submit" className="btn-primary">Pridať</button>
                </form>

                <table className="table">
                    <thead>
                        <tr>
                            <th>Dátum</th>
                            <th>Popis</th>
                            <th>Suma</th>
                            <th>Účet</th>
                            <th>Typ</th>
                            <th>Akcie</th>
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
                                    Žiadne transakcie. Pridaj prvú vyššie.
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
