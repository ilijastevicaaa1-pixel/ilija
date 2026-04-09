import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import InternalRecordDetails from './InternalRecordDetails';
import InstantSearchInput from '../components/InstantSearchInput';
import VirtualizedTable from '../components/VirtualizedTable';
import TableWithSum from '../components/TableWithSum';
import LoadingSkeleton from '../components/LoadingSkeleton';

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

function InternalRecordsScreen() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({
    text: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    description: ''
  });
  const [sort, setSort] = useState({ field: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [groupBy, setGroupBy] = useState("");
  const [groupBy2, setGroupBy2] = useState("");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/internal-records')
      .then(res => res.json())
      .then(data => {
        setRecords(data);
        setEmpty(!data.length);
        setLoading(false);
      })
      .catch(() => {
        setRecords([]);
        setEmpty(true);
        setLoading(false);
      });
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
    setFilter({ text: '', type: '', dateFrom: '', dateTo: '', description: '' });
  }

  let filtered = records.filter(r => {
    if (filter.text && !(
      (r.record_type || '').toLowerCase().includes(filter.text.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(filter.text.toLowerCase()) ||
      (r.related_entities || '').toLowerCase().includes(filter.text.toLowerCase())
    )) return false;
    if (filter.type && !(r.record_type || '').toLowerCase().includes(filter.type.toLowerCase())) return false;
    if (filter.dateFrom && r.date < filter.dateFrom) return false;
    if (filter.dateTo && r.date > filter.dateTo) return false;
    if (filter.description && !(r.description || '').toLowerCase().includes(filter.description.toLowerCase())) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    let v1 = a[sort.field], v2 = b[sort.field];
    if (v1 === undefined || v1 === null) return 1;
    if (v2 === undefined || v2 === null) return -1;
    if (v1 < v2) return sort.dir === 'asc' ? -1 : 1;
    if (v1 > v2) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const groupFields = [groupBy, groupBy2].filter(Boolean);
  const grouped = groupFields.length ? groupData(filtered, groupFields) : null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  async function exportCSV() {
    setExporting(true);
    const header = ['Tip','Datum','Opis','Povezani entiteti'];
    const rows = filtered.map(r => [r.record_type, r.date, r.description, r.related_entities]);
    const csv = [header, ...rows].map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interne_evidencije.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function exportXLSX() {
    setExporting(true);
    const [{ utils, writeFile }] = await Promise.all([
      import('xlsx'),
    ]);
    const header = ['Tip','Datum','Opis','Povezani entiteti'];
    const rows = filtered.map(r => [r.record_type, r.date, r.description, r.related_entities]);
    const ws = utils.aoa_to_sheet([header, ...rows]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Interne evidencije');
    writeFile(wb, 'interne_evidencije.xlsx');
    setExporting(false);
  }

  async function exportPDF() {
    setExporting(true);
    const [{ jsPDF }] = await Promise.all([
      import('jspdf'),
    ]);
    const doc = new jsPDF();
    doc.text('Interne evidencije', 10, 10);
    const header = ['Tip','Datum','Opis','Povezani entiteti'];
    const rows = filtered.map(r => [r.record_type, r.date, r.description, r.related_entities]);
    let y = 20;
    doc.text(header.join(' | '), 10, y);
    y += 8;
    rows.forEach(row => {
      doc.text(row.join(' | '), 10, y);
      y += 8;
    });
    doc.save('interne_evidencije.pdf');
    setExporting(false);
  }

  const columns = [
    { field: 'internal_record_number', label: 'Broj' },
    { field: 'record_type', label: 'Tip' },
    { field: 'amount', label: 'Iznos' },
    { field: 'date', label: 'Datum' },
    { field: 'description', label: 'Opis' },
  ];
  const sumFields = ['amount'];

  return (
    <div style={{maxWidth:900,margin:'40px auto',display:'flex',gap:32}}>
      <div style={{flex:1}}>
        <h2>Interne evidencije (istorija)</h2>
        <div style={{marginBottom:16,display:'flex',gap:8,flexWrap:'wrap'}}>
          <InstantSearchInput
            name="text"
            value={filter.text}
            onChange={v => handleFilterChange({ target: { name: 'text', value: v } })}
            placeholder="Pretraga..."
            style={{ width: 120 }}
          />
          <InstantSearchInput
            name="type"
            value={filter.type}
            onChange={v => handleFilterChange({ target: { name: 'type', value: v } })}
            placeholder="Tip"
            style={{ width: 100 }}
          />
          <input name="dateFrom" value={filter.dateFrom} onChange={handleFilterChange} type="date" style={{width: 120}} />
          <input name="dateTo" value={filter.dateTo} onChange={handleFilterChange} type="date" style={{width: 120}} />
          <input name="amountFrom" value={filter.amountFrom} onChange={handleFilterChange} type="number" placeholder="Iznos od" style={{width: 90}} />
          <input name="amountTo" value={filter.amountTo} onChange={handleFilterChange} type="number" placeholder="Iznos do" style={{width: 90}} />
          <button onClick={resetFilters}>Reset</button>
          <button onClick={exportCSV}>CSV</button>
          <button onClick={exportXLSX}>Excel</button>
          <button onClick={exportPDF}>PDF</button>
          <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setGroupBy2('');}} style={{marginLeft:8}}>
            <option value="">Bez grupisanja</option>
            <option value="type">Po tipu</option>
            <option value="date">Po datumu</option>
          </select>
          {groupBy && (
            <select value={groupBy2} onChange={e=>setGroupBy2(e.target.value)} style={{marginLeft:8}}>
              <option value="">Bez podgrupisanja</option>
              {['type','date'].filter(g=>g!==groupBy).map(g=>(<option key={g} value={g}>{g==='type'?'Po tipu':'Po datumu'}</option>))}
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
        ) : empty ? (
          <div style={{margin:'32px 0',color:'#888',textAlign:'center'}}>
            <span style={{fontSize:32,display:'block'}}>📚</span>
            <div>Nema podataka za prikaz.</div>
          </div>
        ) : groupFields.length ? (
          grouped.map(g1 => (
            <div key={g1.key} style={{marginBottom:16}}>
              <div style={{fontWeight:'bold',margin:'8px 0'}}>{groupBy==='type'?'Tip':'Datum'}: {g1.key}</div>
              {groupBy2 && g1.items && Array.isArray(g1.items) && g1.items.length && typeof g1.items[groupBy2] !== undefined ? (
                groupData(g1.items, [groupBy2]).map(g2 => (
                  <div key={g2.key} style={{marginLeft:16,marginBottom:8}}>
                    <div style={{fontWeight:'bold',margin:'4px 0'}}>{groupBy2==='type'?'Tip':'Datum'}: {g2.key}</div>
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
// ...existing code...
      </div>
      <div style={{flex:1,minWidth:320}}>
        <InternalRecordDetails record={selected} />
      </div>
    </div>
  );
}

export default InternalRecordsScreen;
