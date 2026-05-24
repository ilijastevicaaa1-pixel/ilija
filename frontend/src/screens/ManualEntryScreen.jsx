import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/manual-entry.css";
import { apiFetch } from "../api/apiFetch";

const assistantMenu = {
    fakturacia: {
        1: "vytvaranie faktur",
        2: "citanie faktur (OCR)",
        3: "vypocet DPH",
        4: "odosielanie faktur",
        5: "prehlad vsetkych faktur",
        6: "kontrola stavu uhrad",
    },
    banka: {
        1: "prehlad zostatku",
        2: "prehlad transakcii",
        3: "parovanie platieb",
        4: "import bankoveho vypisu",
        5: "analyza prijmov a vydavkov",
    },
    dph: {
        1: "vypocet DPH",
        2: "priprava DPH priznania",
        3: "prehlad vstupnej a vystupnej DPH",
        4: "upozornenia na terminy",
    },
    vydavky: {
        1: "zadavanie vydavkov",
        2: "OCR blockov",
        3: "kategorizacia vydavkov",
        4: "priradenie vydavkov k projektom",
    },
    prijmy: {
        1: "prehlad prijmov",
        2: "analyza podla klientov",
        3: "mesacne prehlady",
    },
    reporty: {
        1: "mesacny financny prehlad",
        2: "zisk/strata",
        3: "cashflow",
        4: "porovnanie obdobi",
    },
    dokumenty: {
        1: "nahravovanie dokumentov",
        2: "OCR spracovanie",
        3: "automaticke rozpoznanie typu dokumentu",
        4: "archiv dokumentov",
    },
    zakaznici: {
        1: "pridavanie zakaznikov",
        2: "prehlad historie",
        3: "automaticke doplnanie udajov do faktur",
    },
    projekty: {
        1: "vydavky podla projektu",
        2: "prijmy podla projektu",
        3: "analyza ziskovosti",
    },
    asistent: {},
    sklad: {
        1: "stav skladu",
        2: "prijem tovaru",
        3: "vydaj tovaru",
        4: "inventura",
        5: "prehlad pohybov",
    },
};

const categoryOptions = [
    { key: "fakturacia", label: "Fakturácia" },
    { key: "banka", label: "Bankové operácie" },
    { key: "dph", label: "DPH" },
    { key: "vydavky", label: "Výdavky" },
    { key: "prijmy", label: "Príjmy" },
    { key: "reporty", label: "Reporty" },
    { key: "dokumenty", label: "Dokumenty" },
    { key: "zakaznici", label: "Zákazníci" },
    { key: "projekty", label: "Projekty" },
    { key: "asistent", label: "Asistent" },
    { key: "sklad", label: "Skladové hospodárstvo" },
];

function ManualEntryScreen() {
    const navigate = useNavigate();

    const [category, setCategory] = useState("");
    const [suboption, setSuboption] = useState("");
    const [payload, setPayload] = useState({});

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const subOptionsList = Object.entries(assistantMenu[category] || {}).map(
        ([num, label]) => ({ num, label })
    );

    const resetByBranch = (cat, sub) => {
        if (cat === "fakturacia" && sub === "vytvaranie faktur") {
            setPayload({
                invoice_number: "",
                issue_date: "",
                due_date: "",
                supplier: "",
                customer: "",
                items: [{ name: "", qty: 1, price: 0, vat: 20 }],
                total: 0,
                note: "",
            });
            return;
        }

        if (cat === "banka" && sub === "parovanie platieb") {
            setPayload({
                transaction_date: "",
                amount: 0,
                variable_symbol: "",
                iban: "",
                description: "",
                invoice_id: "",
                type_trans: "prijem",
            });
            return;
        }

        // Placeholder forma (aby UI pokrio sve grane)
        setPayload({ note: "" });
    };

    useEffect(() => {
        if (!category) {
            setSuboption("");
            setPayload({});
            return;
        }

        const options = assistantMenu[category] || {};
        if (suboption && !Object.values(options).includes(suboption)) {
            setSuboption("");
            setPayload({});
        }
    }, [category]);

    useEffect(() => {
        if (!category || !suboption) return;
        resetByBranch(category, suboption);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, suboption]);

    // FACTURACIA -> automatické total
    useEffect(() => {
        if (category === "fakturacia" && suboption === "vytvaranie faktur") {
            const items = payload.items || [];
            const total = items.reduce((sum, it) => {
                const qty = Number(it.qty) || 0;
                const price = Number(it.price) || 0;
                const vat = Number(it.vat) || 0;
                const line = qty * price;
                const withVat = line + (line * vat) / 100;
                return sum + withVat;
            }, 0);

            setPayload((prev) => ({ ...prev, total: Number(total.toFixed(2)) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payload?.items]);

    const save = async () => {
        setSaving(true);
        setMessage("");

        try {
            const res = await apiFetch("/api/manual-entry", {
                method: "POST",
                body: { category, suboption, data: payload },
            });

            setMessage(res?.message || "OK");
            alert("Uspesno ulozeno");
            navigate("/manual-entry");
        } catch (e) {
            const msg = e?.message || "Greška pri čuvanju";
            setMessage(msg);
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const showInvoicesForm =
        category === "fakturacia" && suboption === "vytvaranie faktur";
    const showPaymentMatchingForm =
        category === "banka" && suboption === "parovanie platieb";

    return (
        <div className="manual-entry-bg">
            <div className="manual-entry-card">
                <h2>Ručný vstup</h2>
                {message && <div className="error-box">{message}</div>}

                <div className="form-grid">
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Vyberte kategóriu</option>
                        {categoryOptions.map((c) => (
                            <option key={c.key} value={c.key}>
                                {c.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={suboption}
                        disabled={!category}
                        onChange={(e) => setSuboption(e.target.value)}
                    >
                        <option value="">Vyberte pod-opciu</option>
                        {subOptionsList.map((s) => (
                            <option key={s.num} value={s.label}>
                                {s.num}) {s.label}
                            </option>
                        ))}
                    </select>

                    {showInvoicesForm && (
                        <>
                            <input
                                type="text"
                                placeholder="Číslo faktúry"
                                value={payload.invoice_number || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, invoice_number: e.target.value }))
                                }
                            />

                            <input
                                type="date"
                                value={payload.issue_date || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, issue_date: e.target.value }))
                                }
                            />

                            <input
                                type="date"
                                value={payload.due_date || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, due_date: e.target.value }))
                                }
                            />

                            <input
                                type="text"
                                placeholder="Dodávateľ"
                                value={payload.supplier || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, supplier: e.target.value }))
                                }
                            />

                            <input
                                type="text"
                                placeholder="Odberateľ"
                                value={payload.customer || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, customer: e.target.value }))
                                }
                            />

                            <div style={{ display: "grid", gap: 12 }}>
                                {(payload.items || []).map((it, idx) => (
                                    <div key={idx} style={{ display: "grid", gap: 8 }}>
                                        <input
                                            type="text"
                                            placeholder={`Položka ${idx + 1} - názov`}
                                            value={it.name || ""}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setPayload((p) => ({
                                                    ...p,
                                                    items: p.items.map((x, i) =>
                                                        i === idx ? { ...x, name: v } : x
                                                    ),
                                                }));
                                            }}
                                        />

                                        <input
                                            type="number"
                                            placeholder="Množstvo (qty)"
                                            value={it.qty}
                                            step="1"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setPayload((p) => ({
                                                    ...p,
                                                    items: p.items.map((x, i) =>
                                                        i === idx ? { ...x, qty: v } : x
                                                    ),
                                                }));
                                            }}
                                        />

                                        <input
                                            type="number"
                                            placeholder="Cena"
                                            value={it.price}
                                            step="0.01"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setPayload((p) => ({
                                                    ...p,
                                                    items: p.items.map((x, i) =>
                                                        i === idx ? { ...x, price: v } : x
                                                    ),
                                                }));
                                            }}
                                        />

                                        <select
                                            value={it.vat}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setPayload((p) => ({
                                                    ...p,
                                                    items: p.items.map((x, i) =>
                                                        i === idx ? { ...x, vat: v } : x
                                                    ),
                                                }));
                                            }}
                                        >
                                            {[0, 10, 20].map((v) => (
                                                <option key={v} value={v}>
                                                    DPH {v}%
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="save-btn"
                                    onClick={() =>
                                        setPayload((p) => ({
                                            ...p,
                                            items: [
                                                ...(p.items || []),
                                                { name: "", qty: 1, price: 0, vat: 20 },
                                            ],
                                        }))
                                    }
                                >
                                    + Pridať položku
                                </button>
                            </div>

                            <input type="number" disabled value={payload.total || 0} />

                            <textarea
                                placeholder="Poznámka"
                                value={payload.note || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, note: e.target.value }))
                                }
                            />
                        </>
                    )}

                    {showPaymentMatchingForm && (
                        <>
                            <input
                                type="date"
                                value={payload.transaction_date || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, transaction_date: e.target.value }))
                                }
                            />

                            <input
                                type="number"
                                placeholder="Suma"
                                value={payload.amount || 0}
                                step="0.01"
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, amount: e.target.value }))
                                }
                            />

                            <input
                                type="text"
                                placeholder="Variabilný symbol"
                                value={payload.variable_symbol || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, variable_symbol: e.target.value }))
                                }
                            />

                            <input
                                type="text"
                                placeholder="IBAN"
                                value={payload.iban || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, iban: e.target.value }))
                                }
                            />

                            <input
                                type="text"
                                placeholder="Popis"
                                value={payload.description || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, description: e.target.value }))
                                }
                            />

                            <input
                                type="text"
                                placeholder="Priradenie k faktúre (invoice_id)"
                                value={payload.invoice_id || ""}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, invoice_id: e.target.value }))
                                }
                            />

                            <select
                                value={payload.type_trans || "prijem"}
                                onChange={(e) =>
                                    setPayload((p) => ({ ...p, type_trans: e.target.value }))
                                }
                            >
                                <option value="prijem">príjem</option>
                                <option value="vydavok">výdavok</option>
                            </select>
                        </>
                    )}

                    <button
                        className="save-btn"
                        onClick={save}
                        disabled={saving || !category || !suboption}
                    >
                        💾 Sačuvaj
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ManualEntryScreen;

