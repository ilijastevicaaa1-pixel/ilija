import React, { useState, useEffect } from "react";
import "../styles/bank-modern.css";

function BankScreen() {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [accountForm, setAccountForm] = useState({
        name: "",
        iban: "",
        bic: "",
        account_number: "",
        currency: "EUR"
    });
    const [txForm, setTxForm] = useState({
        transaction_date: "",
        amount: "",
        type: "priliv",
        description: "",
        variable_symbol: "",
        specific_symbol: "",
        constant_symbol: "",
        counter_iban: ""
    });

    const bankPresets = [
        { name: "Firemný účet" },
        { name: "Súkromný účet" },
        { name: "Revolut" },
        { name: "PayPal" },
        { name: "Wise" },
        { name: "Tatra banka" },
        { name: "VÚB" },
        { name: "ČSOB" },
        { name: "Slovenská sporiteľňa" }
    ];

    useEffect(() => {
        loadAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccountId) {
            loadTransactions(selectedAccountId);
        }
    }, [selectedAccountId]);

    const loadAccounts = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/bank-accounts", {
                headers: { Authorization: token }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.accounts) {
                    setAccounts(data.accounts);
                    localStorage.setItem("bank_accounts", JSON.stringify(data.accounts));
                    if (data.accounts.length > 0 && !selectedAccountId) {
                        setSelectedAccountId(data.accounts[0].id);
                    }
                }
            } else {
                throw new Error("API not available");
            }
        } catch (err) {
            const stored = localStorage.getItem("bank_accounts");
            if (stored) {
                const parsed = JSON.parse(stored);
                setAccounts(parsed);
                if (parsed.length > 0 && !selectedAccountId) {
                    setSelectedAccountId(parsed[0].id);
                }
            }
        }
    };

    const loadTransactions = async (accountId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/bank/transactions?account_id=${accountId}&limit=100`, {
                headers: { Authorization: token }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.transactions) {
                    setTransactions(data.transactions);
                    localStorage.setItem(`bank_txs_${accountId}`, JSON.stringify(data.transactions));
                }
            } else {
                throw new Error("API not available");
            }
        } catch (err) {
            const stored = localStorage.getItem(`bank_txs_${accountId}`);
            if (stored) {
                setTransactions(JSON.parse(stored));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        if (!accountForm.name) {
            alert("Názov účtu je povinný");
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/bank-accounts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token
                },
                body: JSON.stringify(accountForm)
            });
            if (res.ok) {
                alert("Účet pridaný!");
                setAccountForm({ name: "", iban: "", bic: "", account_number: "", currency: "EUR" });
                setShowAccountForm(false);
                loadAccounts();
            } else {
                throw new Error("API not available");
            }
        } catch (err) {
            const stored = localStorage.getItem("bank_accounts");
            const existing = stored ? JSON.parse(stored) : [];
            const newAccount = {
                ...accountForm,
                id: Date.now(),
                is_active: true,
                created_at: new Date().toISOString()
            };
            const updated = [...existing, newAccount];
            localStorage.setItem("bank_accounts", JSON.stringify(updated));
            setAccounts(updated);
            alert("Účet pridaný (LocalStorage)!");
            setAccountForm({ name: "", iban: "", bic: "", account_number: "", currency: "EUR" });
            setShowAccountForm(false);
            if (updated.length > 0 && !selectedAccountId) {
                setSelectedAccountId(updated[0].id);
            }
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!txForm.transaction_date || !txForm.amount || !txForm.type) {
            alert("Povinné polia: dátum, suma, typ");
            return;
        }
        if (!selectedAccountId) {
            alert("Najprv vyberte účet");
            return;
        }
        const newTx = {
            ...txForm,
            account_id: selectedAccountId,
            amount: parseFloat(txForm.amount),
            id: Date.now(),
            tenant_id: 1,
            created_at: new Date().toISOString()
        };
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/bank/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token
                },
                body: JSON.stringify(newTx)
            });
            if (res.ok) {
                alert("Transakcia pridaná!");
                setTxForm({
                    transaction_date: "",
                    amount: "",
                    type: "priliv",
                    description: "",
                    variable_symbol: "",
                    specific_symbol: "",
                    constant_symbol: "",
                    counter_iban: ""
                });
                loadTransactions(selectedAccountId);
            } else {
                throw new Error("API not available");
            }
        } catch (err) {
            const stored = localStorage.getItem(`bank_txs_${selectedAccountId}`);
            const existing = stored ? JSON.parse(stored) : [];
            const updated = [newTx, ...existing];
            localStorage.setItem(`bank_txs_${selectedAccountId}`, JSON.stringify(updated));
            setTransactions(updated);
            alert("Transakcia pridaná (LocalStorage)!");
            setTxForm({
                transaction_date: "",
                amount: "",
                type: "priliv",
                description: "",
                variable_symbol: "",
                specific_symbol: "",
                constant_symbol: "",
                counter_iban: ""
            });
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!confirm("Naozaj chcete vymazať túto transakciu?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/bank/transactions/${id}`, {
                method: "DELETE",
                headers: { Authorization: token }
            });
            if (res.ok) {
                loadTransactions(selectedAccountId);
            } else {
                throw new Error("API not available");
            }
        } catch (err) {
            const stored = localStorage.getItem(`bank_txs_${selectedAccountId}`);
            if (stored) {
                const existing = JSON.parse(stored);
                const updated = existing.filter(t => t.id !== id);
                localStorage.setItem(`bank_txs_${selectedAccountId}`, JSON.stringify(updated));
                setTransactions(updated);
                alert("Transakcia vymazaná (LocalStorage)!");
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('sk-SK', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString('sk-SK');
    };

    const filteredTransactions = selectedAccountId
        ? transactions.filter(t => t.account_id == selectedAccountId)
        : transactions;

    const calculateSummary = () => {
        if (!selectedAccountId) return { balance: 0, count: 0, income: 0, expense: 0 };
        const txs = filteredTransactions;
        const income = txs
            .filter(t => t.type === 'priliv' || t.type === 'prijem')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const expense = txs
            .filter(t => t.type === 'odliv' || t.type === 'vydavok')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const balance = income - expense;
        return { balance, count: txs.length, income, expense };
    };

    const summary = calculateSummary();

    return (
        <div className="bank-bg">
            <div className="bank-card">
                <h1 className="title">🏦 Bankové transakcie</h1>

                <div className="account-selector">
                    <label className="label">Vyberte účet:</label>
                    <select
                        className="input"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                        <option value="">-- Vyberte účet --</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} {acc.iban ? `(${acc.iban})` : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowAccountForm(!showAccountForm)}
                    >
                        + Pridať účet
                    </button>
                </div>

                {selectedAccountId && (
                    <div className="account-summary">
                        <h2 className="subtitle">📊 Prehľad účtu</h2>
                        <div className="summary-stats">
                            <div className="stat-card balance">
                                <div className="stat-label">Aktuálny zostatok</div>
                                <div className={`stat-value ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
                                    {formatCurrency(summary.balance)}
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Počet transakcií</div>
                                <div className="stat-value">{summary.count}</div>
                            </div>
                            <div className="stat-card income">
                                <div className="stat-label">Príjmy</div>
                                <div className="stat-value positive">{formatCurrency(summary.income)}</div>
                            </div>
                            <div className="stat-card expense">
                                <div className="stat-label">Výdavky</div>
                                <div className="stat-value negative">{formatCurrency(summary.expense)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {showAccountForm && (
                    <div className="account-form">
                        <h2 className="subtitle">Nový bankový účet</h2>
                        <form onSubmit={handleAddAccount} className="form-grid">
                            <select
                                name="name"
                                className="input"
                                value={accountForm.name}
                                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                            >
                                <option value="">-- Vyberte banku --</option>
                                {bankPresets.map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                name="iban"
                                placeholder="IBAN"
                                className="input"
                                value={accountForm.iban}
                                onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
                            />
                            <input
                                type="text"
                                name="bic"
                                placeholder="BIC / SWIFT"
                                className="input"
                                value={accountForm.bic}
                                onChange={(e) => setAccountForm({ ...accountForm, bic: e.target.value })}
                            />
                            <input
                                type="text"
                                name="account_number"
                                placeholder="Číslo účtu"
                                className="input"
                                value={accountForm.account_number}
                                onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                            />
                            <select
                                name="currency"
                                className="input"
                                value={accountForm.currency}
                                onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                            >
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="CZK">CZK</option>
                                <option value="GBP">GBP</option>
                            </select>
                            <button type="submit" className="btn-primary">
                                Uložiť účet
                            </button>
                        </form>
                    </div>
                )}

                <div className="tx-form">
                    <h2 className="subtitle">📝 Pridať transakciu</h2>
                    <form onSubmit={handleAddTransaction} className="form-grid-full">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Dátum *</label>
                                <input
                                    type="date"
                                    name="transaction_date"
                                    className="input"
                                    value={txForm.transaction_date}
                                    onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Suma *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="input"
                                    value={txForm.amount}
                                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Typ *</label>
                                <select
                                    name="type"
                                    className="input"
                                    value={txForm.type}
                                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                                >
                                    <option value="priliv">Príliv</option>
                                    <option value="odliv">Odliv</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group full-width">
                            <label className="label">Popis</label>
                            <input
                                type="text"
                                name="description"
                                placeholder="Popis transakcie"
                                className="input"
                                value={txForm.description}
                                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="btn-primary">
                            Pridať transakciu
                        </button>
                    </form>
                </div>

                <div className="transactions-list">
                    <h2 className="subtitle">📋 Zoznam transakcií</h2>
                    {loading ? (
                        <div className="loading">Načítavam...</div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Dátum</th>
                                    <th>Suma</th>
                                    <th>Typ</th>
                                    <th>Popis</th>
                                    <th>Akcie</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id}>
                                        <td>{formatDate(t.transaction_date)}</td>
                                        <td className={t.type === 'priliv' || t.type === 'prijem' ? 'amount-positive' : 'amount-negative'}>
                                            {formatCurrency(t.amount)}
                                        </td>
                                        <td>
                                            <span className={`type-badge ${t.type}`}>
                                                {t.type === 'priliv' || t.type === 'prijem' ? 'Príjem' : 'Výdavok'}
                                            </span>
                                        </td>
                                        <td>{t.description || "-"}</td>
                                        <td>
                                            <button
                                                className="btn-danger"
                                                onClick={() => handleDeleteTransaction(t.id)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="empty">
                                            {selectedAccountId
                                                ? "Žiadne transakcie pre vybraný účet."
                                                : "Vyberte účet pre zobrazenie transakcií."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BankScreen;
