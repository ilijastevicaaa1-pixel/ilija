import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api.js';

// Helper za formatiranje datuma i iznosa
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sr-RS');
}

function formatAmount(amount) {
  if (amount === undefined || amount === null || amount === '') return '';
  return Number(amount).toLocaleString('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function InputInvoiceScreen() {
  const [invoices, setInvoices] = useState([]);

  const [form, setForm] = useState({
    invoice_number: '',
    issue_date: '',
    receipt_date: '',
    payment_date: '',
    amount_without_vat: '',
    vat_amount: '',
    total_amount: '',
    supplier: '',
    expense_category: '',
    pdf_path: ''
  });

  // Napredna validacija PDF uvoza
  const [unrecognized, setUnrecognized] = useState([]);

  const [filter, setFilter] = useState({
    dateFrom: '',
    dateTo: '',
    supplier: '',
    minAmount: '',
    maxAmount: ''
  });

  // AI analiza (poziv backend-a)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState('');

  const handleAiAnalyze = async () => {
    setAiLoading(true);
    setAiResult(null);
    setError('');

    try {
      const res = await apiFetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Analiziraj fakturu: dobavljač ${form.supplier}, iznos ${form.amount_without_vat}, PDV ${form.vat_amount}`
        })
      });

      const data = await res.json();
      setAiResult({ reply: data.reply });

    } catch (err) {
      setError('Greška u AI analizi.');
    }

    setAiLoading(false);
  };

  // Handle filter input
  const handleFilterChange = e => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  // Validacija forme
  function validateForm(f) {
    if (!f.invoice_number) return 'Broj fakture je obavezan';
    if (!f.issue_date) return 'Datum izdavanja je obavezan';
    if (!f.receipt_date) return 'Datum prijema je obavezan';
    if (!f.payment_date) return 'Datum plaćanja je obavezan';
    if (!f.amount_without_vat || isNaN(f.amount_without_vat) || Number(f.amount_without_vat) <= 0)
      return 'Iznos bez PDV mora biti pozitivan broj';
    if (!f.vat_amount || isNaN(f.vat_amount) || Number(f.vat_amount) < 0)
      return 'Iznos PDV mora biti broj';
    if (!f.total_amount || isNaN(f.total_amount) || Number(f.total_amount) <= 0)
      return 'Ukupno mora biti pozitivan broj';
    if (!f.supplier) return 'Dobavljač je obavezan';
    if (!f.expense_category) return 'Kategorija troška je obavezna';
    return null;
  }

  // Submit new invoice
  const handleSubmit = e => {
    e.preventDefault();
    // ... ostatak koda ...
  };

  // ... ostatak koda ...
}

export default InputInvoiceScreen;