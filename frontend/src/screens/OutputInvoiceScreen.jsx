import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sr-RS');
}
function formatAmount(amount) {
  if (amount === undefined || amount === null || amount === '') return '';
  return Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const initialForm = {
  date: '',
  customer: '',
  invoice_number: '',
  amount: '',
  vat: '',
  description: ''
};

function OutputInvoiceScreen() {
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState({
    dateFrom: '',
    dateTo: '',
    customer: '',
    minAmount: '',
    maxAmount: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  // Napredna validacija PDF uvoza
  const [unrecognized, setUnrecognized] = useState([]);
  // Automatsko povezivanje sa bankom
  const [bankTransactions, setBankTransactions] = useState([]);
  const [bankMatches, setBankMatches] = useState([]);

  useEffect(() => {
    apiFetch('/api/izlazne-fakture')
      .then(res => res.json())
      .then(data => setInvoices(data));
    apiFetch('/api/banka')
      .then(res => res.json())
      .then(data => setBankTransactions(data));
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // PDF upload
  const handlePdfUpload = async e => {
    setMessage('');
    setError('');
    setUnrecognized([]);
    setBankMatches([]);
    const file = e.target.files[0];
    // ...rest of implementation...
  };

  return (
    <div>OutputInvoiceScreen (implementacija skraćena)</div>
  );
}

export default OutputInvoiceScreen;
