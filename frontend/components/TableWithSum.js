import React from 'react';

function TableWithSum({ data, columns, sumFields }) {
  if (!data || !data.length || !sumFields || !sumFields.length) return null;
  const sum = {};
  sumFields.forEach(f => sum[f] = data.reduce((acc, row) => acc + Number(row[f] || 0), 0));
  return (
    <tr style={{ background: '#e0e0e0' }}>
      {columns.map(col => (
        <td key={col.field} style={{ fontWeight: 'bold' }}>
          {sumFields.includes(col.field) ? sum[col.field].toLocaleString() : ''}
        </td>
      ))}
    </tr>
  );
}

export default TableWithSum;
