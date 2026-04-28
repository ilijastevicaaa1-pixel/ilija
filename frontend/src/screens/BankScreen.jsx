import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sr-RS');
}

function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  return Number(amount).toLocaleString('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const initialForm = {
  date: '',
  description: '',
  amount: '',
  account: '',
  type: '' // priliv / odliv
};

function BankScreen() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  const [filter, setFilter] = useState({
    dateFrom: '',
    dateTo: '',
    account: '',
    minAmount: '',
    maxAmount: '',
    type: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [unrecognizedRows, setUnrecognizedRows] = useState([]);
  const [invoiceMatches, setInvoiceMatches] = useState([]);
  const [inputInvoices, setInputInvoices] = useState([]);

  // ---------------------------------------------------------
  // 1) UČITAVANJE TRANSAKCIJA (placeholder dok ne dodamo /api/banka)
  // ---------------------------------------------------------
  useEffect(() => {
    // Kada dodamo backend:
    // apiFetch('/api/banka').then(res => res.json()).then(setTransactions);

    setTransactions([]); // placeholder
  }, []);

  // ---------------------------------------------------------
  // 2) HANDLERI
  // ---------------------------------------------------------
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFilterChange = e => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  // ---------------------------------------------------------
  // 3) DODAVANJE / IZMJENA TRANSAKCIJE
  // ---------------------------------------------------------
  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!form.date || !form.description || !form.amount || !form.account || !form.type) {
      setError('Sva polja su obavezna.');
      return;
    }

    const newTx = { ...form, amount: Number(form.amount) };

    if (editId) {
      // Kada dodamo backend:
      // await apiFetch(`/api/banka/${editId}`, { method: 'PUT', body: JSON.stringify(newTx) });

      setTransactions(prev =>
        prev.map(t => (t.id === editId ? { ...newTx, id: editId } : t))
      );
      setMessage('Transakcija izmenjena.');
    } else {
      // Kada dodamo backend:
      // await apiFetch('/api/banka', { method: 'POST', body: JSON.stringify(newTx) });

      setTransactions(prev => [...prev, { ...newTx, id: Date.now() }]);
      setMessage('Transakcija dodata.');
    }

    setForm(initialForm);
    setEditId(null);
  };

  // ---------------------------------------------------------
  // 4) BRISANJE
  // ---------------------------------------------------------
  const handleDelete = async id => {
    // await apiFetch(`/api/banka/${id}`, { method: 'DELETE' });
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // ---------------------------------------------------------
  // 5) CSV / EXCEL UPLOAD
  // ---------------------------------------------------------
  const handleUpload = async e => {
    setMessage('');
    setError('');
    setUnrecognizedRows([]);

    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/api/upload/bank', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.unrecognized) setUnrecognizedRows(data.unrecognized);
      if (data.transactions) setTransactions(prev => [...prev, ...data.transactions]);

      setMessage('CSV/Excel uspešno uvezen.');
    } catch (err) {
      setError('Greška pri uvozu.');
    }
  };

  // ---------------------------------------------------------
  // 6) MATCHING SA FAKTURAMA
  // ---------------------------------------------------------
  const handleMatch = async () => {
    try {
      const res = await apiFetch('/api/matching/bank-invoice');
      const data = await res.json();

      setInvoiceMatches(data.matches || []);
      setInputInvoices(data.invoices || []);
      setMessage('Povezivanje završeno.');
    } catch (err) {
      setError('Greška pri povezivanju.');
    }
  };

  // ---------------------------------------------------------
  // 7) POVEZIVANJE SA BANKOM (Nordigen)
  // ---------------------------------------------------------
  const connectBank = async () => {
    try {
      const res = await apiFetch('/api/bank/connect');
      const data = await res.json();
      window.open(data.link, '_blank');
    } catch (err) {
      setError('Greška pri povezivanju banke.');
    }
  };

  // ---------------------------------------------------------
  // 8) FILTRIRANJE
  // ---------------------------------------------------------
  const filtered = transactions.filter(t => {
    if (filter.dateFrom && t.date < filter.dateFrom) return false;
    if (filter.dateTo && t.date > filter.dateTo) return false;
    if (filter.account && t.account !== filter.account) return false;
    if (filter.type && t.type !== filter.type) return false;
    if (filter.minAmount && t.amount < Number(filter.minAmount)) return false;
    if (filter.maxAmount && t.amount > Number(filter.maxAmount)) return false;
    return true;
  });

  // ---------------------------------------------------------
  // 9) UI
  // ---------------------------------------------------------
  return (
    <div className="bank-screen">
      <h2>Bankovne transakcije</h2>

      {message && <div className="msg success">{message}</div>}
      {error && <div className="msg error">{error}</div>}

      {/* Poveži banku */}
      <button onClick={connectBank} className="btn-primary">Poveži banku</button>

      {/* Upload */}
      <div>
        <label>Uvezi CSV/Excel:</label>
        <input type="file" onChange={handleUpload} />
      </div>

      {/* Forma */}
      <form onSubmit={handleSubmit} className="bank-form">
        <input type="date" name="date" value={form.date} onChange={handleChange} />
        <input type="text" name="description" placeholder="Opis" value={form.description} onChange={handleChange} />
        <input type="number" name="amount" placeholder="Iznos" value={form.amount} onChange={handleChange} />
        <input type="text" name="account" placeholder="Račun" value={form.account} onChange={handleChange} />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="">Tip</option>
          <option value="priliv">Priliv</option>
          <option value="odliv">Odliv</option>
        </select>

        <button type="submit">{editId ? 'Sačuvaj izmene' : 'Dodaj transakciju'}</button>
      </form>

      {/* Filteri */}
      <div className="filters">
        <input type="date" name="dateFrom" value={filter.dateFrom} onChange={handleFilterChange} />
        <input type="date" name="dateTo" value={filter.dateTo} onChange={handleFilterChange} />
        <input type="text" name="account" placeholder="Račun" value={filter.account} onChange={handleFilterChange} />
        <input type="number" name="minAmount" placeholder="Min iznos" value={filter.minAmount} onChange={handleFilterChange} />
        <input type="number" name="maxAmount" placeholder="Max iznos" value={filter.maxAmount} onChange={handleFilterChange} />
        <select name="type" value={filter.type} onChange={handleFilterChange}>
          <option value="">Tip</option>
          <option value="priliv">Priliv</option>
          <option value="odliv">Odliv</option>
        </select>
      </div>

      {/* Tabela */}
      <table className="bank-table">
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
          {filtered.map(t => (
            <tr key={t.id}>
              <td>{formatDate(t.date)}</td>
              <td>{t.description}</td>
              <td>{formatAmount(t.amount)}</td>
              <td>{t.account}</td>
              <td>{t.type}</td>
              <td>
                <button onClick={() => { setForm(t); setEditId(t.id); }}>Izmeni</button>
                <button onClick={() => handleDelete(t.id)}>Obriši</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Matching */}
      <button onClick={handleMatch}>Poveži sa fakturama</button>
    </div>
  );
}

export default BankScreen;