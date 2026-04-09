import React, { useState, useEffect } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sr-RS');
}

const initialForm = {
  name: '',
  date: '',
  status: '',
  note: ''
};

function DeadlinesScreen() {
  const [deadlines, setDeadlines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState({
    dateFrom: '',
    dateTo: '',
    status: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);

  // ...rest of implementation...

  return (
    <div>DeadlinesScreen (implementacija skraćena)</div>
  );
}

export default DeadlinesScreen;
