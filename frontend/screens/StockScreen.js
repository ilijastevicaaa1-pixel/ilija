import React, { useEffect, useState } from 'react';
import StockDetails from './StockDetails';
import VirtualizedTable from '../components/VirtualizedTable';
import InstantSearchInput from '../components/InstantSearchInput';
import TableWithSum from '../components/TableWithSum';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { apiFetch } from '../../api.js';
function StockScreen() {
  const [stock, setStock] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({
    text: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    quantityFrom: '',
    quantityTo: ''
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
      apiFetch('/api/stock')
        .then(res => res.json())
        .then(data => {
          setStock(data);
          setLoading(false);
          setEmpty(!data || data.length === 0);
        });
    }, []);

    const handleFilterChange = e => {
      const { name, value } = e.target;
      setFilter(f => ({ ...f, [name]: value }));
      setPage(1);
    };

    const resetFilters = () => {
      setFilter({ text: '', location: '', dateFrom: '', dateTo: '', quantityFrom: '', quantityTo: '' });
      setPage(1);
    };

    // Filtering
    const filtered = stock.filter(s => {
      if (filter.text && !(
        (s.item_name || '').toLowerCase().includes(filter.text.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(filter.text.toLowerCase())
      )) return false;
      if (filter.location && (s.location || '').toLowerCase() !== filter.location.toLowerCase()) return false;
      if (filter.dateFrom && s.date < filter.dateFrom) return false;
      if (filter.dateTo && s.date > filter.dateTo) return false;
      if (filter.quantityFrom && Number(s.quantity) < Number(filter.quantityFrom)) return false;
      if (filter.quantityTo && Number(s.quantity) > Number(filter.quantityTo)) return false;
      return true;
    });

    // Grouping
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
    const grouped = groupData(filtered, groupFields);

    // Sorting
    const handleSort = field => {
      setSort(s => ({
        field,
        dir: s.field === field ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc',
      }));
    };
    const sorted = [...filtered].sort((a, b) => {
      if (sort.dir === 'asc') return (a[sort.field] > b[sort.field] ? 1 : -1);
      return (a[sort.field] < b[sort.field] ? 1 : -1);
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

    // Export CSV
    const exportCSV = () => {
      setExporting(true);
      const header = ['Artikal','Količina','Lokacija','Datum','Opis'];
      const rows = filtered.map(s => [s.item_name, s.quantity, s.location, s.date, s.description]);
      const csv = [header, ...rows].map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zalihe.csv';
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    };

    // Export XLSX
    const exportXLSX = async () => {
      setExporting(true);
      const [{ utils, writeFile }] = await Promise.all([
        import('xlsx'),
      ]);
      const header = ['Artikal','Količina','Lokacija','Datum','Opis'];
      const rows = filtered.map(s => [s.item_name, s.quantity, s.location, s.date, s.description]);
      const ws = utils.aoa_to_sheet([header, ...rows]);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Zalihe');
      writeFile(wb, 'zalihe.xlsx');
      setExporting(false);
    };

    // Export PDF
    const exportPDF = async () => {
      setExporting(true);
      const [{ jsPDF }] = await Promise.all([
        import('jspdf'),
      ]);
      const doc = new jsPDF();
      doc.text('Zalihe', 10, 10);
      const header = ['Artikal','Količina','Lokacija','Datum','Opis'];
      const rows = filtered.map(s => [s.item_name, s.quantity, s.location, s.date, s.description]);
      let y = 20;
      doc.text(header.join(' | '), 10, y);
      y += 8;
      rows.forEach(row => {
        doc.text(row.join(' | '), 10, y);
        y += 8;
      });
      doc.save('zalihe.pdf');
      setExporting(false);
    };

    const columns = [
      { field: 'item_name', label: 'Artikal' },
      { field: 'quantity', label: 'Količina' },
      { field: 'location', label: 'Lokacija' },
      { field: 'date', label: 'Datum' },
      { field: 'description', label: 'Opis' },
    ];

    const sumFields = ['quantity'];
    return (
      <div style={{maxWidth:900,margin:'40px auto',display:'flex',gap:32}}>
        <div style={{flex:1}}>
          <h2>Zalihe / Magacin (istorija)</h2>
          <div style={{marginBottom:16,display:'flex',gap:8,flexWrap:'wrap'}}>
            <InstantSearchInput name="text" value={filter.text} onChange={v => handleFilterChange({ target: { name: 'text', value: v } })} placeholder="Pretraga..." style={{width:120}} />
            <InstantSearchInput name="location" value={filter.location} onChange={v => handleFilterChange({ target: { name: 'location', value: v } })} placeholder="Lokacija" style={{width:100}} />
            <input name="dateFrom" value={filter.dateFrom} onChange={handleFilterChange} type="date" style={{width:120}} />
            <input name="dateTo" value={filter.dateTo} onChange={handleFilterChange} type="date" style={{width:120}} />
            <InstantSearchInput name="quantityFrom" value={filter.quantityFrom} onChange={v => handleFilterChange({ target: { name: 'quantityFrom', value: v } })} placeholder="Količina od" type="number" style={{width:90}} />
            <InstantSearchInput name="quantityTo" value={filter.quantityTo} onChange={v => handleFilterChange({ target: { name: 'quantityTo', value: v } })} placeholder="Količina do" type="number" style={{width:90}} />
            <button onClick={resetFilters}>Reset</button>
            <button onClick={exportCSV} disabled={exporting}>Eksport CSV</button>
            <button onClick={exportXLSX} disabled={exporting}>Eksport Excel</button>
            <button onClick={exportPDF} disabled={exporting}>Eksport PDF</button>
            <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setGroupBy2('');}} style={{marginLeft:8,minWidth:120}}>
              <option value="">Bez grupisanja</option>
              <option value="location">Lokacija</option>
              <option value="date">Datum</option>
            </select>
            {groupBy && (
              <select value={groupBy2} onChange={e=>setGroupBy2(e.target.value)} style={{marginLeft:8,minWidth:120}}>
                <option value="">Bez podgrupisanja</option>
                {['location','date'].filter(g=>g!==groupBy).map(g=>(<option key={g} value={g}>{g==='location'?'Lokacija':'Datum'}</option>))}
              </select>
            )}
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
              <span style={{fontSize:32,display:'block'}}>📦</span>
              <div>Nema podataka za prikaz.</div>
            </div>
          ) : groupBy ? (
            grouped.map(g1 => (
              <div key={g1.key} style={{marginBottom:16}}>
                <div style={{fontWeight:'bold',margin:'8px 0'}}>{groupBy==='location'?'Lokacija':'Datum'}: {g1.key}</div>
                {groupBy2 && g1.items && Array.isArray(g1.items) && g1.items.length && typeof g1.items[0] === 'object' && g1.items[0][groupBy2] !== undefined ? (
                  groupData(g1.items, [groupBy2]).map(g2 => (
                    <div key={g2.key} style={{marginLeft:16,marginBottom:8}}>
                      <div style={{fontWeight:'bold',margin:'4px 0'}}>{groupBy2==='location'?'Lokacija':'Datum'}: {g2.key}</div>
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
                <div style={{fontWeight:'bold',margin:'4px 0',color:'#1976d2'}}>Ukupno za grupu: {g1.items.reduce((s,o)=>s+Number(o.quantity||0),0).toLocaleString()}</div>
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
          <StockDetails stock={selected} />
        </div>
      </div>
    );
    }

    export default StockScreen;
