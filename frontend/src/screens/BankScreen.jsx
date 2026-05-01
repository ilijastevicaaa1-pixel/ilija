import React, { useState, useEffect } from "react";
import "../styles/bank-modern.css";

const LS_ACCOUNTS_KEY = "bank_accounts";
const LS_TRANSACTIONS_KEY = "bank_transactions";

const CURRENCIES = ["EUR", "USD", "GBP", "CZK"];

const BANK_CATALOG = [
  { name: "Tatra banka", bic: "TATRSKBX", ibanPrefix: "SK12 1100" },
  { name: "VÚB", bic: "SUBASKBX", ibanPrefix: "SK12 0200" },
  { name: "ČSOB", bic: "CEKOSKBX", ibanPrefix: "SK12 7500" },
  { name: "Slovenská sporiteľňa", bic: "GIBASKBX", ibanPrefix: "SK12 0900" },
  { name: "Revolut", bic: "REVOGB21", ibanPrefix: "LT12 3250" },
  { name: "Wise", bic: "TRWIGB2L", ibanPrefix: "BE12 9670" },
  { name: "Firemný účet", bic: "", ibanPrefix: "" },
  { name: "Súkromný účet", bic: "", ibanPrefix: "" }
];

function BankScreen() {
    // Účty
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");

    const [newAccount, setNewAccount] = useState({
        name: "",
        iban: "",
        bic: "",
        accountNumber: "",
        currency: "EUR",
    });

    // Transakcie
    const [transactions, setTransactions] = useState([]);

    const [transactionForm, setTransactionForm] = useState({
        date: "",
        amount: "",
        type: "",
        description: "",
        vs: "",
        ss: "",
        ks: "",
        counterpartyIban: "",
    });

    // Filteri
    const [filters, setFilters] = useState({
        dateFrom: "",
        dateTo: "",
        type: "",
        vs: "",
        ss: "",
        ks: "",
        amountMin: "",
        amountMax: "",
        accountId: "",
    });

    // Ručný vstup toggle
    const [manualMode, setManualMode] = useState(true);

    // Load from LocalStorage
    useEffect(() => {
        const storedAccounts = JSON.parse(localStorage.getItem(LS_ACCOUNTS_KEY) || "[]");
        const storedTransactions = JSON.parse(localStorage.getItem(LS_TRANSACTIONS_KEY) || "[]");

        setAccounts(storedAccounts);
        setTransactions(storedTransactions);

        if (storedAccounts.length > 0) {
            setSelectedAccountId(storedAccounts[0].id);
            setFilters((prev) => ({ ...prev, accountId: storedAccounts[0].id }));
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem(LS_ACCOUNTS_KEY, JSON.stringify(accounts));
    }, [accounts]);

    useEffect(() => {
        localStorage.setItem(LS_TRANSACTIONS_KEY, JSON.stringify(transactions));
    }, [transactions]);

    // Účty handlers
    const handleAccountChange = (e) => {
        setNewAccount({ ...newAccount, [e.target.name]: e.target.value });
    };

    const handleAddAccount = (e) => {
        e.preventDefault();
        if (!newAccount.name || !newAccount.iban) return;

        const acc = {
            id: crypto.randomUUID(),
            ...newAccount,
            createdAt: new Date().toISOString(),
        };

        const updated = [...accounts, acc];
        setAccounts(updated);

        if (!selectedAccountId) {
            setSelectedAccountId(acc.id);
            setFilters((prev) => ({ ...prev, accountId: acc.id }));
        }

        setNewAccount({
            name: "",
            iban: "",
            bic: "",
            accountNumber: "",
            currency: "EUR",
        });
    };

    // Transakcie handlers
    const handleTransactionChange = (e) => {
        setTransactionForm({ ...transactionForm, [e.target.name]: e.target.value });
    };

    const handleAddTransaction = (e) => {
        e.preventDefault();
        if (
            !selectedAccountId ||
            !transactionForm.date ||
            !transactionForm.amount ||
            !transactionForm.type
        ) {
            return;
        }

        const tx = {
            id: crypto.randomUUID(),
            accountId: selectedAccountId,
            date: transactionForm.date,
            amount: Number(transactionForm.amount),
            type: transactionForm.type, // PRIJEM / VYDAVOK
            description: transactionForm.description,
            vs: transactionForm.vs,
            ss: transactionForm.ss,
            ks: transactionForm.ks,
            counterpartyIban: transactionForm.counterpartyIban,
            createdAt: new Date().toISOString(),
        };

        setTransactions((prev) => [...prev, tx]);

        setTransactionForm({
            date: "",
            amount: "",
            type: "",
            description: "",
            vs: "",
            ss: "",
            ks: "",
            counterpartyIban: "",
        });
    };

    const handleDeleteTransaction = (id) => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
    };

    // Filter handlers
    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleAccountSelect = (e) => {
        const id = e.target.value;
        setSelectedAccountId(id);
        setFilters((prev) => ({ ...prev, accountId: id }));
    };

    // Filter logic
    const filteredTransactions = transactions.filter((t) => {
        if (filters.accountId && t.accountId !== filters.accountId) return false;

        if (filters.type && t.type !== filters.type) return false;

        if (filters.vs && t.vs !== filters.vs) return false;
        if (filters.ss && t.ss !== filters.ss) return false;
        if (filters.ks && t.ks !== filters.ks) return false;

        if (filters.dateFrom && t.date < filters.dateFrom) return false;
        if (filters.dateTo && t.date > filters.dateTo) return false;

        if (filters.amountMin && t.amount < Number(filters.amountMin)) return false;
        if (filters.amountMax && t.amount > Number(filters.amountMax)) return false;

        return true;
    });

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

    const accountTransactions = transactions.filter(
        (t) => t.accountId === selectedAccountId
    );

    const accountBalance = accountTransactions.reduce((sum, t) => {
        return t.type === "PRIJEM" ? sum + t.amount : sum - t.amount;
    }, 0);

    const lastTransactions = accountTransactions
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5);

    return (
        <div className="bank-bg">
            <div className="bank-card">
                <button onClick={() => window.history.back()} className="btn-back">
                    ← Späť
                </button>

                <h1 className="title">🏦 Banka</h1>

                <div className="bank-layout">
                    {/* 1) ÚČTY */}
                    <section className="bank-section">
                        <h2 className="subtitle">Účty</h2>

                        <div className="block">
                            <label className="label">Vyberte účet</label>
                            <select
                                className="input"
                                value={selectedAccountId}
                                onChange={handleAccountSelect}
                            >
                                <option value="">-- Vyberte účet --</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.currency})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <h3 className="subtitle small">Pridať účet</h3>
                        <form onSubmit={handleAddAccount} className="form-grid">
                            <select
                                className="input"
                                style={{ gridColumn: "1 / -1" }}
                                onChange={(e) => {
                                    const bank = BANK_CATALOG.find(b => b.name === e.target.value);
                                    setNewAccount({
                                        ...newAccount,
                                        name: bank.name,
                                        bic: bank.bic,
                                        iban: bank.ibanPrefix,
                                    });
                                }}
                            >
                                <option value="">Vyberte banku</option>
                                {BANK_CATALOG.map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                name="name"
                                placeholder="Názov účtu (Firemný, Súkromný…)"
                                value={newAccount.name}
                                onChange={handleAccountChange}
                                className="input"
                            />
                            <input
                                type="text"
                                name="iban"
                                placeholder="IBAN"
                                value={newAccount.iban}
                                onChange={handleAccountChange}
                                className="input"
                            />
                            <input
                                type="text"
                                name="bic"
                                placeholder="BIC"
                                value={newAccount.bic}
                                onChange={handleAccountChange}
                                className="input"
                            />
                            <input
                                type="text"
                                name="accountNumber"
                                placeholder="Číslo účtu"
                                value={newAccount.accountNumber}
                                onChange={handleAccountChange}
                                className="input"
                            />
                            <select
                                name="currency"
                                value={newAccount.currency}
                                onChange={handleAccountChange}
                                className="input"
                            >
                                {CURRENCIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ gridColumn: "1 / -1" }}
                            >
                                Pridať účet
                            </button>
                        </form>
                    </section>

                    {/* 2) TRANSAKCIE */}
                    <section className="bank-section">
                        <h2 className="subtitle">Transakcie</h2>

                        <div className="block">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setManualMode((m) => !m)}
                            >
                                {manualMode ? "Prepni na asistenta (placeholder)" : "Ručný vstup"}
                            </button>
                        </div>

                        {manualMode && (
                            <form onSubmit={handleAddTransaction} className="form-grid">
                                <input
                                    type="date"
                                    name="date"
                                    value={transactionForm.date}
                                    onChange={handleTransactionChange}
                                    className="input"
                                />
                                <input
                                    type="number"
                                    name="amount"
                                    placeholder="Suma"
                                    value={transactionForm.amount}
                                    onChange={handleTransactionChange}
                                    className="input"
                                />
                                <select
                                    name="type"
                                    value={transactionForm.type}
                                    onChange={handleTransactionChange}
                                    className="input"
                                >
                                    <option value="">Typ</option>
                                    <option value="PRIJEM">Príjem</option>
                                    <option value="VYDAVOK">Výdavok</option>
                                </select>
                                <input
                                    type="text"
                                    name="description"
                                    placeholder="Popis / poznámka"
                                    value={transactionForm.description}
                                    onChange={handleTransactionChange}
                                    className="input"
                                />
                                <input
                                    type="text"
                                    name="vs"
                                    placeholder="Variabilný symbol (VS)"
                                    value={transactionForm.vs}
                                    onChange={handleTransactionChange}
                                    className="input"
                                />
                                <input
                                    type="text"
                                    name="ss"
                                    placeholder="Špecifický symbol (SS)"
                                    value={transactionForm.ss}
                                    onChange={handleTransactionChange}
                                    className="input"
                                />
                                <input
                                    type="text"
                                    name="ks"
                                    placeholder="Konštantný symbol (KS)"
                                    value={transactionForm.ks}
                                    onChange={handleTransactionChange}
                                    className="input"
                                />
                                <input
                                    type="text"
                                    name="counterpartyIban"
                                    placeholder="Protiúčet (IBAN dodávateľa/odberateľa)"
                                    value={transactionForm.counterpartyIban}
                                    onChange={handleTransactionChange}
                                    className="input"
                                />

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ gridColumn: "1 / -1" }}
                                >
                                    Pridať transakciu
                                </button>
                            </form>
                        )}

                        <h3 className="subtitle small" style={{ marginTop: 16 }}>
                            Filteri
                        </h3>
                        <div className="form-grid">
                            <input
                                type="date"
                                name="dateFrom"
                                value={filters.dateFrom}
                                onChange={handleFilterChange}
                                className="input"
                            />
                            <input
                                type="date"
                                name="dateTo"
                                value={filters.dateTo}
                                onChange={handleFilterChange}
                                className="input"
                            />
                            <select
                                name="type"
                                value={filters.type}
                                onChange={handleFilterChange}
                                className="input"
                            >
                                <option value="">Typ</option>
                                <option value="PRIJEM">Príjem</option>
                                <option value="VYDAVOK">Výdavok</option>
                            </select>
                            <input
                                type="text"
                                name="vs"
                                placeholder="VS"
                                value={filters.vs}
                                onChange={handleFilterChange}
                                className="input"
                            />
                            <input
                                type="text"
                                name="ss"
                                placeholder="SS"
                                value={filters.ss}
                                onChange={handleFilterChange}
                                className="input"
                            />
                            <input
                                type="text"
                                name="ks"
                                placeholder="KS"
                                value={filters.ks}
                                onChange={handleFilterChange}
                                className="input"
                            />
                            <input
                                type="number"
                                name="amountMin"
                                placeholder="Min suma"
                                value={filters.amountMin}
                                onChange={handleFilterChange}
                                className="input"
                            />
                            <input
                                type="number"
                                name="amountMax"
                                placeholder="Max suma"
                                value={filters.amountMax}
                                onChange={handleFilterChange}
                                className="input"
                            />
                        </div>

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
                                        <td>{t.date}</td>
                                        <td>{t.amount}</td>
                                        <td>{t.type}</td>
                                        <td>{t.description}</td>
                                        <td>{t.vs}</td>
                                        <td>{t.ss}</td>
                                        <td>{t.ks}</td>
                                        <td>{t.counterpartyIban}</td>
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
                                            Žiadne transakcie podľa zvolených filtrov.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>

                    {/* 3) DETAIL ÚČTU */}
                    <section className="bank-section">
                        <h2 className="subtitle">Detail účtu</h2>

                        {selectedAccount ? (
                            <>
                                <p>
                                    <strong>Názov:</strong> {selectedAccount.name}
                                </p>
                                <p>
                                    <strong>IBAN:</strong> {selectedAccount.iban}
                                </p>
                                <p>
                                    <strong>Mena:</strong> {selectedAccount.currency}
                                </p>
                                <p>
                                    <strong>Aktuálny zostatok:</strong>{" "}
                                    {accountBalance.toFixed(2)} {selectedAccount.currency}
                                </p>
                                <p>
                                    <strong>Počet transakcií:</strong> {accountTransactions.length}
                                </p>

                                <h3 className="subtitle small" style={{ marginTop: 16 }}>
                                    Posledné transakcie
                                </h3>
                                <ul className="list">
                                    {lastTransactions.map((t) => (
                                        <li key={t.id}>
                                            {t.date} — {t.type} — {t.amount}{" "}
                                            {selectedAccount.currency} — {t.description}
                                        </li>
                                    ))}
                                    {lastTransactions.length === 0 && (
                                        <li>Žiadne transakcie.</li>
                                    )}
                                </ul>

                                <div className="graph-placeholder">
                                    Graf príde neskôr 🙂
                                </div>
                            </>
                        ) : (
                            <p>Vyberte účet pre detail.</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default BankScreen;
