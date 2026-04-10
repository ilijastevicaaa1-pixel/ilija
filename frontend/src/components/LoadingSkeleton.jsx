import React from 'react';

function LoadingSkeleton({ rows = 8, columns = 5, height = 24 }) {
  return (
    <div data-testid="loading-skeleton" style={{ width: '100%', margin: '32px 0' }}>
      {[...Array(rows)].map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {[...Array(columns)].map((_, c) => (
            <div key={c} style={{ background: '#eee', height, flex: 1, borderRadius: 4, animation: 'pulse 1.2s infinite' }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse { 0%{opacity:1;} 50%{opacity:0.5;} 100%{opacity:1;} }`}</style>
    </div>
  );
}

export default LoadingSkeleton;
