import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BankaEntry() {
    const [form, setForm] = useState({ datum: '', opis: '', iznos: '', tip: 'prihod' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [token, setToken] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const t = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (t) setToken(t);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/api/manual-entry/banka', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`Uspešno sačuvano: ${data.transakcija.opis}`);
                setForm({ datum: '', opis: '', iznos: '', tip: 'prihod' });
                setTimeout(() => navigate('/manual-entry'), 2000);
            } else {
                setMessage(`Greška: ${data.error}`);
            }
        } catch (err) {
            setMessage('Greška u konekciji');
        }
        setLoading(false);
    };

    return (
        <div className="banka-entry-screen">
            <button onClick={() => navigate('/manual-entry')} className="btn-back">← Nazad</button>
            <h1>🏦 Manualna banka transakcija</h1>
            {message && <div className={`message ${message.includes('Uspešno') ? 'success' : 'error'}`}>{message}</div>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Datum:</label>
                    <input type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} required />
                </div>
                <div>
                    <label>Opis:</label>
                    <input type="text" value={form.opis} onChange={(e) => setForm({ ...form, opis: e.target.value })} required />
                </div>
                <div>
                    <label>Iznos:</label>
                    <input type="number" step="0.01" value={form.iznos} onChange={(e) => setForm({ ...form, iznos: e.target.value })} required />
                </div>
                <div>
                    <label>TIP:</label>
                    <select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
                        <option value="prihod">Prihod</option>
                        <option value="rashod">Rashod</option>
                    </select>
                </div>
                <button type="submit" disabled={loading} className="btn-primary">Sačuvaj transakciju</button>
            </form>
            <style jsx>{`
        .banka-entry-screen { max-width: 500px; margin: 0 auto; padding: 20px; }
        .btn-back { background: #eee; padding: 10px; margin-bottom: 20px; }
        form div { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .btn-primary { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .message { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
      `}</style>
        </div>
    );
}

