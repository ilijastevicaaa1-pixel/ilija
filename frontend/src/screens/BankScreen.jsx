import React, { useState, useEffect } from "react";
import "../styles/bank-modern.css";

function BankScreen() {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form for adding new account
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [accountForm, setAccountForm] = useState({
        name: "",
        iban: "",
        bic: "",
        account_number: "",
        currency: "EUR"
    });

    // Form for adding new transaction (FULL form)
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

    // Preset bank options
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

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    // Load transactions when account changes
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
            const data = await res.json();
            if (data.accounts) {
                setAccounts(data.accounts);
                if (data.accounts.length > 0 && !selectedAccountId) {
                    setSelectedAccountId(data.accounts[0].id);
                }
            }
        } catch (err) {
            console.error("Error loading accounts:", err);
        }
    };

    const loadTransactions = async (accountId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/bank/transactions?account_id=${accountId}&limit=100`, {
                headers: { Authorization: token }
            });
            const data = await res.json();
            if (data.transactions) {
                setTransactions(data.transactions);
            }
        } catch (err) {
            console.error("Error loading transactions:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccountChange = (e) => {
        const value = e.target.value;
        // Check if it's a preset bank name
        const preset = bankPresets.find(b => b.name === value);
        if (preset) {
            setAccountForm({ ...accountForm, name: value });
        } else {
            setAccountForm({ ...accountForm, [e.target.name]: value });
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
            const data = await res.json();
            if (res.ok) {
                alert("Účet pridaný!");
                setAccountForm({ name: "", iban: "", bic: "", account_number: "", currency: "EUR" });
                setShowAccountForm(false);
                loadAccounts();
            } else {
                alert(data.error || "Chyba pri pridávaní účtu");
            }
        } catch (err) {
            console.error("Error adding account:", err);
            alert("Chyba pri pridávaní účtu");
        }
    };

    const handleTxChange = (e) => {
        setTxForm({ ...txForm, [e.target.name]: e.target.value });
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

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/bank/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token
                },
                body: JSON.stringify({
                    ...txForm,
                    account_id: selectedAccountId,
                    amount: parseFloat(txForm.amount)
                })
            });
            const data = await res.json();
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
                alert(data.error || "Chyba pri pridávaní transakcie");
            }
        } catch (err) {
            console.error("Error adding transaction:", err);
            alert("Chyba pri pridávaní transakcie");
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
            }
        } catch (err) {
            console.error("Error deleting transaction:", err);
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

    // Filter transactions by selected account
    const filteredTransactions = selectedAccountId
        ? transactions.filter(t => t.account_id == selectedAccountId)
        : transactions;

    return (
        <div className="bank-bg">
            <div className="bank-card">
                <h1 className="title">🏦 Bankové transakcie</h1>

                {/* dropdown to select account */}
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

                {/* Add Account Form */}
                {showAccountForm && (
                    <div className="account-form">
                        <h2 className="subtitle">Nový bankový účet</h2>
                        <form onSubmit={handleAddAccount} className="form-grid">
                            <select
                                name="name"
                                className="input"
                                value={accountForm.name}
                                onChange={handleAccountChange}
                            >
                                <option value="">-- Vyberte banku --</option>
                                {bankPresets.map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                                <option value="custom">Vlastný názov...</option>
                            </select>

                            {accountForm.name === "custom" && (
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Názov účtu"
                                    className="input"
                                    value={accountForm.name}
                                    onChange={handleAccountChange}
                                />
                            )}

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

                {/* Transaction Form - FULL form */}
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
                                    onChange={handleTxChange}
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
                                    onChange={handleTxChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Typ *</label>
                                <select
                                    name="type"
                                    className="input"
                                    value={txForm.type}
                                    onChange={handleTxChange}
                                >
                                    <option value="priliv">Príliv</option>
                                    <option value="odliv">Odliv</option>
                                    <option value="prijem">Príjem</option>
                                    <option value="vydavok">Výdavok</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group full-width">
                            <label className="label">Popis (poznámka)</label>
                            <input
                                type="text"
                                name="description"
                                placeholder="Popis transakcie"
                                className="input"
                                value={txForm.description}
                                onChange={handleTxChange}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Variabilný symbol (VS)</label>
                                <input
                                    type="text"
                                    name="variable_symbol"
                                    placeholder="VS"
                                    className="input"
                                    value={txForm.variable_symbol}
                                    onChange={handleTxChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Špecifický symbol (SS)</label>
                                <input
                                    type="text"
                                    name="specific_symbol"
                                    placeholder="SS"
                                    className="input"
                                    value={txForm.specific_symbol}
                                    onChange={handleTxChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Konštantný symbol (KS)</label>
                                <input
                                    type="text"
                                    name="constant_symbol"
                                    placeholder="KS"
                                    className="input"
                                    value={txForm.constant_symbol}
                                    onChange={handleTxChange}
                                />
                            </div>
                        </div>

                        <div className="form-group full-width">
                            <label className="label">Protiúčet (IBAN)</label>
                            <input
                                type="text"
                                name="counter_iban"
                                placeholder="IBAN od dodávateľa/odberateľa"
                                className="input"
                                value={txForm.counter_iban}
                                onChange={handleTxChange}
                            />
                        </div>

                        <button type="submit" className="btn-primary">
                            Pridať transakciu
                        </button>
                    </form>
                </div>

                {/* Transactions Table - FULL form */}
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
                                    <th>VS</th>
                                    <th>SS</th>
                                    <th>KS</th>
                                    <th>Protiúčet</th>
                                    <th>Akcie</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((t) => (
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
                                        <td>{t.variable_symbol || "-"}</td>
                                        <td>{t.specific_symbol || "-"}</td>
                                        <td>{t.constant_symbol || "-"}</td>
                                        <td>{t.counter_iban || "-"}</td>
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
                                        <td colSpan="9" className="empty">
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
