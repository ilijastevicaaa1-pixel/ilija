import React from 'react';
import { FixedSizeList as List } from 'react-window';

// Virtualizovana tabela za velike podatke
function VirtualizedTable({ columns, data, rowHeight = 36, width = 900, height = 400, onRowClick, selectedId }) {
  const Row = ({ index, style }) => {
    const row = data[index];
    return (
      <div
        style={{ ...style, display: 'flex', background: selectedId === row.id ? '#e3f2fd' : undefined, cursor: 'pointer' }}
        onClick={() => onRowClick && onRowClick(row)}
      >
        {columns.map(col => (
          <div key={col.field} style={{ flex: 1, padding: '4px 8px', borderBottom: '1px solid #eee' }}>
            {row[col.field]}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width, height, border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ display: 'flex', background: '#f5f5f5', fontWeight: 'bold' }}>
        {columns.map(col => (
          <div key={col.field} style={{ flex: 1, padding: '4px 8px' }}>{col.label}</div>
        ))}
      </div>
      <List height={height - rowHeight} itemCount={data.length} itemSize={rowHeight} width={width}>
        {Row}
      </List>
    </div>
  );
}

export default VirtualizedTable;
