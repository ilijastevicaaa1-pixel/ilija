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
            } else throw new Error();
        } catch {
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
            } else throw new Error();
        } catch {
            const stored = localStorage.getItem(`bank_txs_${accountId}`);
            if (stored) setTransactions(JSON.parse(stored));
        } finally {
            setLoading(false);
        }
    };

    const handleAccountChange = (e) => {
        const value = e.target.value;
        const preset = bankPresets.find(b => b.name === value);
        if (preset) {
            setAccountForm({ ...accountForm, name: value });
        } else {
            setAccountForm({ ...accountForm, [e.target.name]: value });
        }
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        if (!accountForm.name) return alert("Názov účtu je povinný");

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
            } else throw new Error();
        } catch {
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
        }
    };

    const handleTxChange = (e) => {
        setTxForm({ ...txForm, [e.target.name]: e.target.value });
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();

        if (!txForm.transaction_date || !txForm.amount) {
            return alert("Povinné polia");
        }

        const newTx = {
            ...txForm,
            account_id: selectedAccountId,
            amount: parseFloat(txForm.amount),
            id: Date.now(),
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
                loadTransactions(selectedAccountId);
            } else throw new Error();
        } catch {
            const stored = localStorage.getItem(`bank_txs_${selectedAccountId}`);
            const existing = stored ? JSON.parse(stored) : [];
            const updated = [newTx, ...existing];
            localStorage.setItem(`bank_txs_${selectedAccountId}`, JSON.stringify(updated));
            setTransactions(updated);
        }
    };

    const handleDeleteTransaction = (id) => {
        if (!window.confirm("Naozaj chcete vymazať túto transakciu?")) return;

        const stored = localStorage.getItem(`bank_txs_${selectedAccountId}`);
        if (stored) {
            const existing = JSON.parse(stored);
            const updated = existing.filter(t => t.id !== id);
            localStorage.setItem(`bank_txs_${selectedAccountId}`, JSON.stringify(updated));
            setTransactions(updated);
        }
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(amount);

    const formatDate = (dateStr) =>
        dateStr ? new Date(dateStr).toLocaleDateString("sk-SK") : "";

    const filteredTransactions = selectedAccountId
        ? transactions.filter(t => String(t.account_id) === String(selectedAccountId))
        : transactions;

    const summary = (() => {
        const income = filteredTransactions
            .filter(t => ["priliv", "prijem"].includes(t.type))
            .reduce((s, t) => s + Number(t.amount || 0), 0);

        const expense = filteredTransactions
            .filter(t => ["odliv", "vydavok"].includes(t.type))
            .reduce((s, t) => s + Number(t.amount || 0), 0);

        return {
            balance: income - expense,
            income,
            expense,
            count: filteredTransactions.length
        };
    })();

    const lastTransactions = filteredTransactions.slice(0, 5);

    return (
        <div className="bank-bg">
            <div className="bank-card">

                <h1 className="title">🏦 Bankové transakcie</h1>

                {/* selector */}
                <div className="account-selector">
                    <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                        <option value="">-- Vyberte účet --</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ✅ FIXED BLOCK */}
                {selectedAccountId && (
                    <div className="account-summary">

                        <h2>Prehľad účtu</h2>

                        <div>Zostatok: {formatCurrency(summary.balance)}</div>
                        <div>Príjmy: {formatCurrency(summary.income)}</div>
                        <div>Výdavky: {formatCurrency(summary.expense)}</div>

                        {/* chart FIX */}
                        <div
                            style={{
                                height: `${Math.min(100,
                                    (summary.expense / Math.max(summary.income, summary.expense, 1)) * 100
                                )}%`
                            }}
                        />

                    </div>
                )}

                {/* TX list */}
                <table>
                    <tbody>
                        {filteredTransactions.map(t => (
                            <tr key={t.id}>
                                <td>{formatDate(t.transaction_date)}</td>
                                <td>{formatCurrency(t.amount)}</td>
                                <td>
                                    <button onClick={() => handleDeleteTransaction(t.id)}>X</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>
        </div>
    );
}

export default BankScreen;