import React, { useEffect, useState } from 'react';
import OfferDetails from './OfferDetails';
import InstantSearchInput from '../components/InstantSearchInput';
import VirtualizedTable from '../components/VirtualizedTable';
import TableWithSum from '../components/TableWithSum';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { apiFetch } from '../api.js';

function OffersScreen() {
  const [offers, setOffers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({
    text: '',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
    customer: ''
  });
  const [sort, setSort] = useState({ field: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [groupBy, setGroupBy] = useState('');
  const [groupBy2, setGroupBy2] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/offers')
      .then(res => res.json())
      .then(data => setOffers(data))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  function handleFilterChange(e) {
    setFilter(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSort(field) {
    setSort(s => ({
      field,
      dir: s.field === field ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
  }

  function resetFilters() {
    setFilter({ text: '', dateFrom: '', dateTo: '', amountFrom: '', amountTo: '', customer: '' });
    setPage(1);
  }

  let filtered = offers.filter(o => {
    if (filter.text && !(
      (o.offer_number || '').toLowerCase().includes(filter.text.toLowerCase()) ||
      (o.customer || '').toLowerCase().includes(filter.text.toLowerCase()) ||
      (o.description || '').toLowerCase().includes(filter.text.toLowerCase())
    )) return false;
    if (filter.customer && !(o.customer || '').toLowerCase().includes(filter.customer.toLowerCase())) return false;
    if (filter.dateFrom && o.date < filter.dateFrom) return false;
    if (filter.dateTo && o.date > filter.dateTo) return false;
    if (filter.amountFrom && Number(o.amount) < Number(filter.amountFrom)) return false;
    if (filter.amountTo && Number(o.amount) > Number(filter.amountTo)) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    let v1 = a[sort.field], v2 = b[sort.field];
    if (sort.field === 'amount') {
      v1 = Number(v1); v2 = Number(v2);
    }
    if (v1 === undefined || v1 === null) return 1;
    if (v2 === undefined || v2 === null) return -1;
    if (v1 < v2) return sort.dir === 'asc' ? -1 : 1;
    if (v1 > v2) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  // Grupisanje
  function groupData(data, groupFields) {
    if (!groupFields.length) return [{ key: '', items: data }];
    const groups = {};
    data.forEach(item => {
      let key = groupFields.map(f => item[f] || '').join(' | ');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.entries(groups).map(([key, items]) => ({ key, items }));
  }
  const groupFields = [groupBy, groupBy2].filter(Boolean);
  const grouped = groupFields.length ? groupData(filtered, groupFields) : null;

  // Paginacija
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  // Eksport u CSV/XLSX/PDF
  async function exportCSV() {
    setExporting(true);
    const data = filtered;
    const header = ['Broj','Kupac','Iznos','Datum','Opis'];
    const rows = data.map(o => [o.offer_number, o.customer, o.amount, o.date, o.description]);
    const csv = [header, ...rows].map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ponude.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }
  async function exportXLSX() {
    setExporting(true);
    const data = filtered;
    const header = ['Broj','Kupac','Iznos','Datum','Opis'];
    const rows = data.map(o => [o.offer_number, o.customer, o.amount, o.date, o.description]);
    const xlsxRows = [header, ...rows];
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(xlsxRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ponude');
    XLSX.writeFile(wb, 'ponude.xlsx');
    setExporting(false);
  }
  async function exportPDF() {
    setExporting(true);
    const data = filtered;
    const header = ['Broj','Kupac','Iznos','Datum','Opis'];
    const rows = data.map(o => [o.offer_number, o.customer, o.amount, o.date, o.description]);
    const docRows = [header, ...rows];
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    autoTable(doc, { head: [header], body: rows });
    doc.save('ponude.pdf');
    setExporting(false);
  }

  const columns = [
    { field: 'offer_number', label: 'Broj' },
    { field: 'customer', label: 'Kupac' },
    { field: 'amount', label: 'Iznos' },
    { field: 'date', label: 'Datum' },
    { field: 'description', label: 'Opis' },
  ];
  const sumFields = ['amount'];
  return (
    <div style={{maxWidth: 900, margin: '40px auto', display: 'flex', gap: 32}}>
      <div style={{flex: 1}}>
        <h2>Ponude (istorija)</h2>
        <div style={{marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <InstantSearchInput name="text" value={filter.text} onChange={v => handleFilterChange({ target: { name: 'text', value: v } })} placeholder="Pretraga..." style={{ width: 120 }} />
          <InstantSearchInput name="customer" value={filter.customer} onChange={v => handleFilterChange({ target: { name: 'customer', value: v } })} placeholder="Kupac" style={{ width: 100 }} />
          <input name="dateFrom" value={filter.dateFrom} onChange={handleFilterChange} type="date" style={{width: 120}} />
          <input name="dateTo" value={filter.dateTo} onChange={handleFilterChange} type="date" style={{width: 120}} />
          <InstantSearchInput name="amountFrom" value={filter.amountFrom} onChange={v => handleFilterChange({ target: { name: 'amountFrom', value: v } })} placeholder="Iznos od" type="number" style={{width: 90}} />
          <InstantSearchInput name="amountTo" value={filter.amountTo} onChange={v => handleFilterChange({ target: { name: 'amountTo', value: v } })} placeholder="Iznos do" type="number" style={{width: 90}} />
          <button onClick={resetFilters}>Reset</button>
          <button onClick={exportCSV} disabled={exporting}>CSV</button>
          <button onClick={exportXLSX} disabled={exporting}>Excel</button>
          <button onClick={exportPDF} disabled={exporting}>PDF</button>
          <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setGroupBy2('');}} style={{marginLeft:8}}>
            <option value="">Bez grupisanja</option>
            <option value="customer">Po kupcu</option>
            <option value="date">Po datumu</option>
          </select>
          {groupBy && (
            <select value={groupBy2} onChange={e=>setGroupBy2(e.target.value)} style={{marginLeft:8}}>
              <option value="">Bez podgrupisanja</option>
              {['customer','date'].filter(g=>g!==groupBy).map(g=>(<option key={g} value={g}>{g==='customer'?'Po kupcu':'Po datumu'}</option>))}
            </select>
          )}
          <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}} style={{marginLeft:8}}>
            <option value={10}>10/str</option>
            <option value={20}>20/str</option>
            <option value={50}>50/str</option>
            <option value={filtered.length}>Sve</option>
          </select>
          <span style={{marginLeft: 8, color: '#888'}}>Prikazano: {filtered.length}</span>
        </div>
        {loading ? (
          <LoadingSkeleton rows={8} columns={5} />
        ) : filtered.length === 0 ? (
          <div style={{margin:'32px 0',color:'#888',textAlign:'center'}}>
            <span style={{fontSize:32,display:'block'}}>📄</span>
            <div>Nema podataka za prikaz.</div>
          </div>
        ) : groupFields.length ? (
          grouped.map(g1 => (
            <div key={g1.key} style={{marginBottom:16}}>
              <div style={{fontWeight:'bold',margin:'8px 0'}}>{groupBy==='customer'?'Kupac':'Datum'}: {g1.key}</div>
              {groupBy2 && g1.items && Array.isArray(g1.items) && g1.items.length && typeof g1.items[0] === 'object' && g1.items[0][groupBy2] !== undefined ? (
                groupData(g1.items, [groupBy2]).map(g2 => (
                  <div key={g2.key} style={{marginLeft:16,marginBottom:8}}>
                    <div style={{fontWeight:'bold',margin:'4px 0'}}>{groupBy2==='customer'?'Kupac':'Datum'}: {g2.key}</div>
                    <VirtualizedTable
                      columns={columns}
                      data={g2.items}
                      onRowClick={row => setSelected(row)}
                      selectedId={selected && selected.id}
                      height={400}
                    />
                    <table style={{width:'100%',borderCollapse:'collapse',marginTop:4}}><tbody><TableWithSum data={g2.items} columns={columns} sumFields={sumFields} /></tbody></table>
                  </div>
                ))
              ) : (
                <>
                  <VirtualizedTable
                    columns={columns}
                    data={g1.items}
                    onRowClick={row => setSelected(row)}
                    selectedId={selected && selected.id}
                    height={400}
                  />
                  <table style={{width:'100%',borderCollapse:'collapse',marginTop:4}}><tbody><TableWithSum data={g1.items} columns={columns} sumFields={sumFields} /></tbody></table>
                </>
              )}
              <div style={{fontWeight:'bold',margin:'4px 0',color:'#1976d2'}}>Ukupno za grupu: {g1.items.reduce((s,o)=>s+Number(o.amount||0),0).toLocaleString()}</div>
            </div>
          ))
        ) : (
          <>
            <VirtualizedTable
              columns={columns}
              data={paged}
              onRowClick={row => setSelected(row)}
              selectedId={selected && selected.id}
              height={400}
            />
            <table style={{width:'100%',borderCollapse:'collapse',marginTop:4}}><tbody><TableWithSum data={paged} columns={columns} sumFields={sumFields} /></tbody></table>
            <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center',justifyContent:'center'}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>{'<'}</button>
              <span>Strana {page} / {totalPages}</span>
              <input type="number" min={1} max={totalPages} value={page} onChange={e=>setPage(Math.max(1,Math.min(totalPages,Number(e.target.value))))} style={{width:50}} />
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>{'>'}</button>
              <button onClick={()=>setPage(1)} disabled={page===1}>Prva</button>
              <button onClick={()=>setPage(totalPages)} disabled={page===totalPages}>Zadnja</button>
            </div>
          </>
        )}
        <div style={{fontWeight:'bold',margin:'8px 0',color:'#388e3c'}}>Ukupno: {filtered.reduce((s,o)=>s+Number(o.amount||0),0).toLocaleString()}</div>
      </div>
      <div style={{flex: 1, minWidth: 320}}>
        <OfferDetails offer={selected} />
      </div>
    </div>
  );
}

export default OffersScreen;
