import React, { useState, useEffect } from "react";
import "../styles/bank-modern.css";

const LS_ACCOUNTS_KEY = "bank_accounts";
const LS_TRANSACTIONS_KEY = "bank_transactions";

const CURRENCIES = ["EUR", "USD", "GBP", "CZK"];

const BANK_CATALOG = [
    { name: "Tatra banka", bic: "TATRSKBX" },
    { name: "VÚB", bic: "SUBASKBX" },
    { name: "ČSOB", bic: "CEKOSKBX" },
    { name: "Slovenská sporiteľňa", bic: "GIBASKBX" },
    { name: "Revolut", bic: "REVOGB21" },
    { name: "Wise", bic: "TRWIGB2L" },
    { name: "Firemný účet", bic: "" },
    { name: "Súkromný účet", bic: "" }
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
        const { name, value } = e.target;
        setTransactionForm({ ...transactionForm, [name]: value });
    };

    const handleAddTransaction = (e) => {
        e.preventDefault();
        if (
            !selectedAccountId ||
            !transactionForm.date ||
            !transactionForm.amount
        ) {
            return;
        }

        const tx = {
            id: crypto.randomUUID(),
            accountId: selectedAccountId,
            date: transactionForm.date,
            amount: Number(transactionForm.amount),
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

    // Novi balans — amount direktno određuje smer
    const accountBalance = accountTransactions.reduce((sum, t) => {
        return sum + t.amount;
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
                                        iban: "", // Clear IBAN when bank changes - user must enter manually
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
                                className="btn-assistant"
                                onClick={() => setManualMode((m) => !m)}
                            >
                                🤖 Prepni na asistenta
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
                                <div className="vs-ss-ks-row">
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

                                    <select
                                        name="ks"
                                        value={transactionForm.ks}
                                        onChange={handleTransactionChange}
                                        className="input"
                                    >
                                        <option value="">Konštantný symbol (KS)</option>

                                        <optgroup label="Platby za tovar a služby">
                                            <option value="0008">0008 – Platby za tovar</option>
                                            <option value="0108">0108 – Platby za poľnohospodárske výrobky</option>
                                            <option value="0308">0308 – Platby za služby</option>
                                        </optgroup>

                                        <optgroup label="Vzťahy k štátnemu rozpočtu (ŠR)">
                                            <option value="1018">1018 – Príjmy z podnikania a vlastníctva majetku</option>
                                            <option value="1118">1118 – Administratívne a iné poplatky</option>
                                            <option value="3118">3118 – Poistné a príspevok zamestnávateľa</option>
                                            <option value="1318">1318 – Splácanie úverov a pôžičiek zo ŠR</option>
                                            <option value="2018">2018 – Ostatné príjmy vo vzťahu k ŠR</option>
                                            <option value="3718">3718 – Nájomné vo vzťahu k ŠR</option>
                                            <option value="3818">3818 – Ostatné tovary a služby vo vzťahu k ŠR</option>
                                            <option value="5118">5118 – Splátky úrokov a ostatné platby</option>
                                            <option value="5918">5918 – Splácanie istiny, výnosov z CP</option>
                                        </optgroup>

                                        <optgroup label="Platby za dodávky investičnej povahy">
                                            <option value="0028">0028 – Platby za dodávky investičnej povahy</option>
                                        </optgroup>

                                        <optgroup label="Mzdové a osobné náklady">
                                            <option value="0038">0038 – Prostriedky na mzdy</option>
                                            <option value="0138">0138 – Zrážky z miezd</option>
                                            <option value="0938">0938 – Dávky sociálneho zabezpečenia</option>
                                        </optgroup>

                                        <optgroup label="Príjmy do ŠR z daní a poplatkov">
                                            <option value="1148">1148 – Bežná záloha dane</option>
                                            <option value="1348">1348 – Doúčtovanie daní</option>
                                            <option value="1548">1548 – Dodatočné daňové priznanie</option>
                                            <option value="1748">1748 – Vyúčtovanie dane</option>
                                            <option value="1948">1948 – Zúčtovanie rozdielov preddavkov</option>
                                            <option value="2148">2148 – Dodatočne vyrubená daň</option>
                                            <option value="2948">2948 – Paušálna daň</option>
                                            <option value="3148">3148 – Penále z kontroly</option>
                                            <option value="3348">3348 – Penále zo správy</option>
                                            <option value="3548">3548 – Penále z kontroly</option>
                                            <option value="3748">3748 – Penále zo správy</option>
                                            <option value="4948">4948 – Vrátenie dane</option>
                                            <option value="5148">5148 – Zvýšenie dane</option>
                                            <option value="5348">5348 – Nárok na odpočet dane</option>
                                            <option value="5748">5748 – Dodatočné daňové priznanie</option>
                                            <option value="5948">5948 – Zvýšenie dane – inšpekcia</option>
                                            <option value="6148">6148 – Dodatočná platba z inšpekcie</option>
                                            <option value="6348">6348 – Pokuta z kontroly</option>
                                            <option value="6548">6548 – Pokuta zo správy</option>
                                            <option value="6748">6748 – Pokuty vyrubené inšpekciou</option>
                                            <option value="6948">6948 – Pokuty ktoré nie sú príjmom ŠR</option>
                                            <option value="7148">7148 – Penále z inšpekcie</option>
                                            <option value="7348">7348 – Úrok pri odklade platenia</option>
                                            <option value="7548">7548 – Exekučné náklady</option>
                                            <option value="7748">7748 – Úrok za oneskorenie vrátenia preplatku</option>
                                            <option value="7948">7948 – Blokové pokuty</option>
                                            <option value="8148">8148 – Platba s predpisom</option>
                                            <option value="8748">8748 – Vyrovnanie preplatku</option>
                                        </optgroup>

                                        <optgroup label="Ostatné finančné platby">
                                            <option value="0058">0058 – Penále, sankcie, náhrady škôd</option>
                                            <option value="2058">2058 – Nákup cenných papierov</option>
                                            <option value="3058">3058 – Predaj cenných papierov</option>
                                            <option value="4058">4058 – Výnosy z CP, splatnosť istiny</option>
                                            <option value="5058">5058 – Ostatné obchody s CP</option>
                                            <option value="0158">0158 – Operatívne výdavky</option>
                                            <option value="0358">0358 – Výplaty cez poštu</option>
                                            <option value="0558">0558 – Finančné platby ostatné</option>
                                            <option value="2558">2558 – Úhrady poistných plnení</option>
                                            <option value="3558">3558 – Platby poistného poisťovniam</option>
                                            <option value="0858">0858 – Prechodne poskytnuté pôžičky</option>
                                        </optgroup>

                                        <optgroup label="Prevody medzi účtami">
                                            <option value="0068">0068 – Prevody na mzdy</option>
                                            <option value="0168">0168 – Splátky úverov</option>
                                            <option value="0968">0968 – Ostatné prevody</option>
                                        </optgroup>

                                        <optgroup label="Pokladničné príjmy">
                                            <option value="0078">0078 – Tržby za tovar</option>
                                            <option value="0178">0178 – Tržby za služby</option>
                                        </optgroup>
                                    </select>

                                    <input
                                        type="text"
                                        name="counterpartyIban"
                                        placeholder="Protiúčet (IBAN dodávateľa/odberateľa)"
                                        value={transactionForm.counterpartyIban}
                                        onChange={handleTransactionChange}
                                        className="input"
                                    />
                                </div>





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
                            <select
                                name="ks"
                                value={filters.ks}
                                onChange={handleFilterChange}
                                className="input"
                            >
                                <option value="">Konštantný symbol (KS)</option>

                                {/* PLATBY ZA TOVAR A SLUŽBY */}
                                <optgroup label="Platby za tovar a služby">
                                    <option value="0008">0008 – Platby za tovar</option>
                                    <option value="0108">0108 – Platby za poľnohospodárske výrobky</option>
                                    <option value="0308">0308 – Platby za služby</option>
                                </optgroup>

                                {/* VZŤAHY K ŠTÁTNEMU ROZPOČTU */}
                                <optgroup label="Vzťahy k štátnemu rozpočtu (ŠR)">
                                    <option value="1018">1018 – Príjmy z podnikania a vlastníctva majetku</option>
                                    <option value="1118">1118 – Administratívne a iné poplatky</option>
                                    <option value="3118">3118 – Poistné a príspevok zamestnávateľa</option>
                                    <option value="1318">1318 – Splácanie úverov a pôžičiek zo ŠR</option>
                                    <option value="2018">2018 – Ostatné príjmy vo vzťahu k ŠR</option>
                                    <option value="3718">3718 – Nájomné vo vzťahu k ŠR</option>
                                    <option value="3818">3818 – Ostatné tovary a služby vo vzťahu k ŠR</option>
                                    <option value="5118">5118 – Splátky úrokov a ostatné platby</option>
                                    <option value="5918">5918 – Splácanie istiny, výnosov z CP</option>
                                </optgroup>

                                {/* INVESTIČNÉ DODÁVKY */}
                                <optgroup label="Platby za dodávky investičnej povahy">
                                    <option value="0028">0028 – Platby za dodávky investičnej povahy</option>
                                </optgroup>

                                {/* MZDOVÉ A OSOBNÉ NÁKLADY */}
                                <optgroup label="Mzdové a osobné náklady">
                                    <option value="0038">0038 – Prostriedky na mzdy</option>
                                    <option value="0138">0138 – Zrážky z miezd</option>
                                    <option value="0938">0938 – Dávky sociálneho zabezpečenia</option>
                                </optgroup>

                                {/* PRÍJMY DO ŠR Z DANÍ A POPLATKOV */}
                                <optgroup label="Príjmy do ŠR z daní a poplatkov">
                                    <option value="1148">1148 – Bežná záloha dane</option>
                                    <option value="1348">1348 – Doúčtovanie daní</option>
                                    <option value="1548">1548 – Dodatočné daňové priznanie</option>
                                    <option value="1748">1748 – Vyúčtovanie dane</option>
                                    <option value="1948">1948 – Zúčtovanie rozdielov preddavkov</option>
                                    <option value="2148">2148 – Dodatočne vyrubená daň</option>
                                    <option value="2948">2948 – Paušálna daň</option>
                                    <option value="3148">3148 – Penále z kontroly</option>
                                    <option value="3348">3348 – Penále zo správy</option>
                                    <option value="3548">3548 – Penále z kontroly</option>
                                    <option value="3748">3748 – Penále zo správy</option>
                                    <option value="4948">4948 – Vrátenie dane</option>
                                    <option value="5148">5148 – Zvýšenie dane</option>
                                    <option value="5348">5348 – Nárok na odpočet dane</option>
                                    <option value="5748">5748 – Dodatočné daňové priznanie</option>
                                    <option value="5948">5948 – Zvýšenie dane – inšpekcia</option>
                                    <option value="6148">6148 – Dodatočná platba z inšpekcie</option>
                                    <option value="6348">6348 – Pokuta z kontroly</option>
                                    <option value="6548">6548 – Pokuta zo správy</option>
                                    <option value="6748">6748 – Pokuty vyrubené inšpekciou</option>
                                    <option value="6948">6948 – Pokuty ktoré nie sú príjmom ŠR</option>
                                    <option value="7148">7148 – Penále z inšpekcie</option>
                                    <option value="7348">7348 – Úrok pri odklade platenia</option>
                                    <option value="7548">7548 – Exekučné náklady</option>
                                    <option value="7748">7748 – Úrok za oneskorenie vrátenia preplatku</option>
                                    <option value="7948">7948 – Blokové pokuty</option>
                                    <option value="8148">8148 – Platba s predpisom</option>
                                    <option value="8748">8748 – Vyrovnanie preplatku</option>
                                </optgroup>

                                {/* OSTATNÉ FINANČNÉ PLATBY */}
                                <optgroup label="Ostatné finančné platby">
                                    <option value="0058">0058 – Penále, sankcie, náhrady škôd</option>
                                    <option value="2058">2058 – Nákup cenných papierov</option>
                                    <option value="3058">3058 – Predaj cenných papierov</option>
                                    <option value="4058">4058 – Výnosy z CP, splatnosť istiny</option>
                                    <option value="5058">5058 – Ostatné obchody s CP</option>
                                    <option value="0158">0158 – Operatívne výdavky</option>
                                    <option value="0358">0358 – Výplaty cez poštu</option>
                                    <option value="0558">0558 – Finančné platby ostatné</option>
                                    <option value="2558">2558 – Úhrady poistných plnení</option>
                                    <option value="3558">3558 – Platby poistného poisťovniam</option>
                                    <option value="0858">0858 – Prechodne poskytnuté pôžičky</option>
                                </optgroup>

                                {/* PREVODY */}
                                <optgroup label="Prevody medzi účtami">
                                    <option value="0068">0068 – Prevody na mzdy</option>
                                    <option value="0168">0168 – Splátky úverov</option>
                                    <option value="0968">0968 – Ostatné prevody</option>
                                </optgroup>

                                {/* POKLADŇA */}
                                <optgroup label="Pokladničné príjmy">
                                    <option value="0078">0078 – Tržby za tovar</option>
                                    <option value="0178">0178 – Tržby za služby</option>
                                </optgroup>
                            </select>

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
