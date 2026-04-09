import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import SalaryDetails from './SalaryDetails';
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

function SalariesScreen() {
  const [salaries, setSalaries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({
    text: '',
    employee: '',
    month: '',
    grossFrom: '',
    grossTo: '',
    netFrom: '',
    netTo: ''
  });
  const [sort, setSort] = useState({ field: 'month', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [groupBy, setGroupBy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/salaries')
      .then(res => res.json())
      .then(data => {
        setSalaries(data);
        setEmpty(!data.length);
        setLoading(false);
      })
      .catch(() => {
        setSalaries([]);
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
    setFilter({ text: '', employee: '', month: '', grossFrom: '', grossTo: '', netFrom: '', netTo: '' });
  }

  let filtered = salaries.filter(s => {
    if (filter.text && !(
      (s.employee || '').toLowerCase().includes(filter.text.toLowerCase()) ||
      (s.month || '').toLowerCase().includes(filter.text.toLowerCase())
    )) return false;
    if (filter.employee && !(s.employee || '').toLowerCase().includes(filter.employee.toLowerCase())) return false;
    if (filter.month && !(s.month || '').includes(filter.month)) return false;
    if (filter.grossFrom && Number(s.gross) < Number(filter.grossFrom)) return false;
    if (filter.grossTo && Number(s.gross) > Number(filter.grossTo)) return false;
    if (filter.netFrom && Number(s.net) < Number(filter.netFrom)) return false;
    if (filter.netTo && Number(s.net) > Number(filter.netTo)) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    let v1 = a[sort.field], v2 = b[sort.field];
    if (["gross","net"].includes(sort.field)) {
      v1 = Number(v1); v2 = Number(v2);
    }
    if (v1 === undefined || v1 === null) return 1;
    if (v2 === undefined || v2 === null) return -1;
    if (v1 < v2) return sort.dir === 'asc' ? -1 : 1;
    if (v1 > v2) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const groupFields = groupBy;
  const grouped = groupData(filtered, groupFields);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  async function exportCSV() {
    setExporting(true);
    const header = ['Zaposleni','Mesec','Bruto','Neto'];
    const rows = filtered.map(s => [s.employee, s.month, s.gross, s.net]);
    const csv = [header, ...rows].map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plate.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function exportXLSX() {
    setExporting(true);
    const [{ utils, writeFile }] = await Promise.all([
      import('xlsx'),
    ]);
    const header = ['Zaposleni','Mesec','Bruto','Neto'];
    const rows = filtered.map(s => [s.employee, s.month, s.gross, s.net]);
    const ws = utils.aoa_to_sheet([header, ...rows]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Plate');
    writeFile(wb, 'plate.xlsx');
    setExporting(false);
  }

  async function exportPDF() {
    setExporting(true);
    const [{ jsPDF }] = await Promise.all([
      import('jspdf'),
    ]);
    const doc = new jsPDF();
    doc.text('Plate', 10, 10);
    const header = ['Zaposleni','Mesec','Bruto','Neto'];
    const rows = filtered.map(s => [s.employee, s.month, s.gross, s.net]);
    let y = 20;
    doc.text(header.join(' | '), 10, y);
    y += 8;
    rows.forEach(row => {
      doc.text(row.join(' | '), 10, y);
      y += 8;
    });
    doc.save('plate.pdf');
    setExporting(false);
  }

  const columns = [
    { field: 'employee', label: 'Zaposleni' },
    { field: 'month', label: 'Mesec' },
    { field: 'gross', label: 'Bruto' },
    { field: 'net', label: 'Neto' },
  ];
  const sumFields = ['gross','net'];

  return (
    <div style={{maxWidth:900,margin:'40px auto',display:'flex',gap:32}}>
      <div style={{flex:1}}>
        <h2>Obračuni plata (istorija)</h2>
        <div style={{marginBottom:16,display:'flex',gap:8,flexWrap:'wrap'}}>
          <InstantSearchInput name="text" value={filter.text} onChange={v => handleFilterChange({ target: { name: 'text', value: v } })} placeholder="Pretraga..." style={{width:120}} />
          <InstantSearchInput name="employee" value={filter.employee} onChange={v => handleFilterChange({ target: { name: 'employee', value: v } })} placeholder="Zaposleni" style={{width:100}} />
          <InstantSearchInput name="month" value={filter.month} onChange={v => handleFilterChange({ target: { name: 'month', value: v } })} placeholder="Mesec (YYYY-MM)" style={{width:120}} />
          <InstantSearchInput name="grossFrom" value={filter.grossFrom} onChange={v => handleFilterChange({ target: { name: 'grossFrom', value: v } })} placeholder="Bruto od" type="number" style={{width:90}} />
          <InstantSearchInput name="grossTo" value={filter.grossTo} onChange={v => handleFilterChange({ target: { name: 'grossTo', value: v } })} placeholder="Bruto do" type="number" style={{width:90}} />
          <InstantSearchInput name="netFrom" value={filter.netFrom} onChange={v => handleFilterChange({ target: { name: 'netFrom', value: v } })} placeholder="Neto od" type="number" style={{width:90}} />
          <InstantSearchInput name="netTo" value={filter.netTo} onChange={v => handleFilterChange({ target: { name: 'netTo', value: v } })} placeholder="Neto do" type="number" style={{width:90}} />
          <button onClick={resetFilters}>Reset</button>
          <button onClick={exportCSV} disabled={exporting}>Eksport CSV</button>
          <button onClick={exportXLSX} disabled={exporting}>Eksport Excel</button>
          <button onClick={exportPDF} disabled={exporting}>Eksport PDF</button>
          <select multiple value={groupBy} onChange={e=>setGroupBy(Array.from(e.target.selectedOptions).map(o=>o.value))} style={{marginLeft:8,minWidth:120}}>
            <option value="employee">Zaposleni</option>
            <option value="month">Mesec</option>
          </select>
          <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}} style={{marginLeft:8}}>
            <option value={10}>10/str</option>
            <option value={20}>20/str</option>
            <option value={50}>50/str</option>
            <option value={filtered.length}>Sve</option>
          </select>
          <span style={{marginLeft:8,color:'#888'}}>Prikazano: {filtered.length}</span>
        </div>
        {loading ? (
          <LoadingSkeleton rows={8} columns={5} />
        ) : empty ? (
          <div style={{margin:'32px 0',color:'#888',textAlign:'center'}}>
            <span style={{fontSize:32,display:'block'}}>🗒️</span>
            <div>Nema podataka za prikaz.</div>
          </div>
        ) : groupFields.length ? (
          grouped.map(group => (
            <div key={group.key} style={{marginBottom:16}}>
              <div style={{fontWeight:'bold',margin:'8px 0'}}>{group.key}</div>
              <VirtualizedTable
                columns={[
                  { field: 'salary_number', label: 'Broj' },
                  { field: 'employee', label: 'Zaposleni' },
                  { field: 'amount', label: 'Iznos' },
                  { field: 'date', label: 'Datum' },
                  { field: 'description', label: 'Opis' },
                ]}
                data={group.items}
                onRowClick={row => setSelected(row)}
                selectedId={selected && selected.id}
                height={400}
              />
              <table style={{width:'100%',borderCollapse:'collapse',marginTop:4}}><tbody><TableWithSum data={group.items} columns={columns} sumFields={sumFields} /></tbody></table>
            </div>
          ))
        ) : (
          <>
            <VirtualizedTable
              columns={[
                { field: 'salary_number', label: 'Broj' },
                { field: 'employee', label: 'Zaposleni' },
                { field: 'amount', label: 'Iznos' },
                { field: 'date', label: 'Datum' },
                { field: 'description', label: 'Opis' },
              ]}
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
        <SalaryDetails salary={selected} />
      </div>
    </div>
  );
}

export default SalariesScreen;
