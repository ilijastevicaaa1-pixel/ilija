import React, { useEffect, useState } from 'react';
import TravelOrderDetails from './TravelOrderDetails';
import InstantSearchInput from '../components/InstantSearchInput';
import VirtualizedTable from '../components/VirtualizedTable';
import TableWithSum from '../components/TableWithSum';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { apiFetch } from '../api.js';

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

function TravelOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({
    text: '',
    employee: '',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: ''
  });
  const [sort, setSort] = useState({ field: 'date_start', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [groupBy, setGroupBy] = useState("");
  const [groupBy2, setGroupBy2] = useState("");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/travel-orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setEmpty(!data.length);
        setLoading(false);
      })
      .catch(() => {
        setOrders([]);
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
    setFilter({ text: '', employee: '', dateFrom: '', dateTo: '', amountFrom: '', amountTo: '' });
  }

  let filtered = orders.filter(o => {
    if (filter.text && !(
      (o.employee || '').toLowerCase().includes(filter.text.toLowerCase()) ||
      (o.route || '').toLowerCase().includes(filter.text.toLowerCase()) ||
      (o.purpose || '').toLowerCase().includes(filter.text.toLowerCase())
    )) return false;
    if (filter.employee && !(o.employee || '').toLowerCase().includes(filter.employee.toLowerCase())) return false;
    if (filter.dateFrom && o.date_start < filter.dateFrom) return false;
    if (filter.dateTo && o.date_start > filter.dateTo) return false;
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

  const groupFields = [groupBy, groupBy2].filter(Boolean);
  const grouped = groupData(filtered, groupFields);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  async function exportCSV() {
    setExporting(true);
    const header = ['Zaposleni','Relacija','Iznos','Polazak','Povratak','Svrha'];
    const rows = filtered.map(o => [o.employee, o.route, o.amount, o.date_start, o.date_end, o.purpose]);
    const csv = [header, ...rows].map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'putni_nalozi.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function exportXLSX() {
    setExporting(true);
    const [{ utils, writeFile }] = await Promise.all([
      import('xlsx'),
    ]);
    const header = ['Zaposleni','Relacija','Iznos','Polazak','Povratak','Svrha'];
    const rows = filtered.map(o => [o.employee, o.route, o.amount, o.date_start, o.date_end, o.purpose]);
    const ws = utils.aoa_to_sheet([header, ...rows]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Putni nalozi');
    writeFile(wb, 'putni_nalozi.xlsx');
    setExporting(false);
  }

  async function exportPDF() {
    setExporting(true);
    const [{ jsPDF }] = await Promise.all([
      import('jspdf'),
    ]);
    const doc = new jsPDF();
    doc.text('Putni nalozi', 10, 10);
    const header = ['Zaposleni','Relacija','Iznos','Polazak','Povratak','Svrha'];
    const rows = filtered.map(o => [o.employee, o.route, o.amount, o.date_start, o.date_end, o.purpose]);
    let y = 20;
    doc.text(header.join(' | '), 10, y);
    y += 8;
    rows.forEach(row => {
      doc.text(row.join(' | '), 10, y);
      y += 8;
    });
    doc.save('putni_nalozi.pdf');
    setExporting(false);
  }

  const columns = [
    { field: 'employee', label: 'Zaposleni' },
    { field: 'route', label: 'Relacija' },
    { field: 'amount', label: 'Iznos' },
    { field: 'date_start', label: 'Polazak' },
    { field: 'date_end', label: 'Povratak' },
    { field: 'purpose', label: 'Svrha' },
  ];
  const sumFields = ['amount'];

  return (
    <div style={{maxWidth:900,margin:'40px auto',display:'flex',gap:32}}>
      <div style={{flex:1}}>
        <h2>Putni nalozi (istorija)</h2>
        <div style={{marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <InstantSearchInput name="text" value={filter.text} onChange={v => handleFilterChange({ target: { name: 'text', value: v } })} placeholder="Pretraga..." style={{ width: 120 }} />
          <InstantSearchInput name="employee" value={filter.employee} onChange={v => handleFilterChange({ target: { name: 'employee', value: v } })} placeholder="Zaposleni" style={{ width: 100 }} />
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
            <option value="employee">Po zaposlenom</option>
            <option value="date">Po datumu</option>
          </select>
          {groupBy && (
            <select value={groupBy2} onChange={e=>setGroupBy2(e.target.value)} style={{marginLeft:8}}>
              <option value="">Bez podgrupisanja</option>
              {['employee','date'].filter(g=>g!==groupBy).map(g=>(<option key={g} value={g}>{g==='employee'?'Po zaposlenom':'Po datumu'}</option>))}
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
          <LoadingSkeleton rows={8} columns={6} />
        ) : empty ? (
          <div style={{margin:'32px 0',color:'#888',textAlign:'center'}}>
            <span style={{fontSize:32,display:'block'}}>🗒️</span>
            <div>Nema podataka za prikaz.</div>
          </div>
        ) : groupBy ? (
          Object.keys(grouped).map(g1 => (
            <div key={g1} style={{marginBottom:16}}>
              <div style={{fontWeight:'bold',margin:'8px 0'}}>{groupBy==='employee'?'Zaposleni':'Datum'}: {g1}</div>
              {groupBy2 && grouped[g1] && Object.keys(grouped[g1]).length > 0 ? (
                Object.keys(grouped[g1]).map(g2 => (
                  <div key={g2} style={{marginLeft:16,marginBottom:8}}>
                    <div style={{fontWeight:'bold',margin:'4px 0'}}>{groupBy2==='employee'?'Zaposleni':'Po datumu'}: {g2}</div>
                    <VirtualizedTable
                      columns={columns}
                      data={grouped[g1][g2]}
                      onRowClick={row => setSelected(row)}
                      selectedId={selected && selected.id}
                      height={400}
                    />
                    <table style={{width:'100%',borderCollapse:'collapse',marginTop:4}}><tbody><TableWithSum data={grouped[g1][g2]} columns={columns} sumFields={sumFields} /></tbody></table>
                  </div>
                ))
              ) : (
                <>
                  <VirtualizedTable
                    columns={columns}
                    data={grouped[g1].items||grouped[g1]}
                    onRowClick={row => setSelected(row)}
                    selectedId={selected && selected.id}
                    height={400}
                  />
                  <table style={{width:'100%',borderCollapse:'collapse',marginTop:4}}><tbody><TableWithSum data={grouped[g1].items||grouped[g1]} columns={columns} sumFields={sumFields} /></tbody></table>
                </>
              )}
              <div style={{fontWeight:'bold',margin:'4px 0',color:'#1976d2'}}>Ukupno za grupu: {((groupBy2 && grouped[g1]) ? Object.values(grouped[g1]).flat().reduce((s, o) => s+Number(o.amount||0),0) : (grouped[g1].items||grouped[g1]).reduce((s,o)=>s+Number(o.amount||0),0)).toLocaleString()}</div>
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
      </div>
      <div style={{flex:1,minWidth:320}}>
        <TravelOrderDetails order={selected} />
      </div>
    </div>
  );
}
export default TravelOrdersScreen;
