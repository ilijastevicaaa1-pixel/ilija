import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/manual-entry.css";
import { apiFetch } from "../api/apiFetch";

export default function ManualEntryScreen() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        date: "",
        description: "",
        amount: "",
        category: "",
        type: "expense",
        payment_method: "bank",
        counterparty: "",
        document_number: "",
        vat_rate: 20,
        vat_amount: 0,
        total_amount: 0,
        note: "",
    });

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");


    // automatski proračun PDV
    useEffect(() => {
        const amount = Number(form.amount) || 0;
        const vat = (amount * form.vat_rate) / 100;
        const total = amount + vat;

        setForm((prev) => ({
            ...prev,
            vat_amount: vat.toFixed(2),
            total_amount: total.toFixed(2),
        }));
    }, [form.amount, form.vat_rate]);

    const save = async () => {
        setSaving(true);
        setMessage("");

        try {
            const res = await apiFetch("/api/manual-entry", {
                method: "POST",
                body: form,
            });

            setMessage(res?.message || "OK");
            alert("Úspešne uložené");

            navigate("/manual-entry");
        } catch (e) {
            const msg = e?.message || "Greška pri čuvanju";
            setMessage(msg);
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="manual-entry-bg">
            <div className="manual-entry-card">
                <h2>Ručný vstup</h2>

                {message && <div className="error-box">{message}</div>}

                <div className="form-grid">
                    <input
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                            setForm({ ...form, date: e.target.value })
                        }
                    />

                    <input
                        type="text"
                        placeholder="Opis"
                        value={form.description}
                        onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                        }
                    />

                    <input
                        type="number"
                        placeholder="Iznos"
                        value={form.amount}
                        onChange={(e) =>
                            setForm({ ...form, amount: e.target.value })
                        }
                        step="0.01"
                    />

                    <input
                        type="text"
                        placeholder="Kategorija"
                        value={form.category}
                        onChange={(e) =>
                            setForm({ ...form, category: e.target.value })
                        }
                    />

                    <select
                        value={form.type}
                        onChange={(e) =>
                            setForm({ ...form, type: e.target.value })
                        }
                    >
                        <option value="income">Príjem</option>
                        <option value="expense">Výdavok</option>
                    </select>

                    <select
                        value={form.payment_method}
                        onChange={(e) =>
                            setForm({ ...form, payment_method: e.target.value })
                        }
                    >
                        <option value="bank">Bankový účet</option>
                        <option value="cash">Hotovosť</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Partner (klient/dodávateľ)"
                        value={form.counterparty}
                        onChange={(e) =>
                            setForm({ ...form, counterparty: e.target.value })
                        }
                    />

                    <input
                        type="text"
                        placeholder="Číslo dokumentu"
                        value={form.document_number}
                        onChange={(e) =>
                            setForm({ ...form, document_number: e.target.value })
                        }
                    />

                    <select
                        value={form.vat_rate}
                        onChange={(e) =>
                            setForm({ ...form, vat_rate: Number(e.target.value) })
                        }
                    >
                        <option value={0}>DPH 0%</option>
                        <option value={10}>DPH 10%</option>
                        <option value={20}>DPH 20%</option>
                    </select>

                    <input type="text" disabled value={`DPH: ${form.vat_amount} €`} />
                    <input type="text" disabled value={`Spolu: ${form.total_amount} €`} />

                    <textarea
                        placeholder="Poznámka"
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />

                    <button
                        className="save-btn"
                        onClick={save}
                        disabled={saving}
                    >
                        💾 Sačuvaj
                    </button>
                </div>
            </div>
        </div>
    );
}



