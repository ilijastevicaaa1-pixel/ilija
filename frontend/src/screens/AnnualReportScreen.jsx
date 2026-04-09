import React, { useState, useEffect } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sr-RS');
}

const initialForm = {
  year: '',
  status: '',
  submit_date: '',
  note: ''
};

function AnnualReportScreen() {
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState({
    year: '',
    status: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);

  // ...rest of implementation...

  return (
    <div>AnnualReportScreen (implementacija skraćena)</div>
  );
}

export default AnnualReportScreen;
