import React from 'react';

export default function LoadingScreen() {
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            zIndex: 99999
        }}>
            <div style={{ width: 60, height: 60, border: '4px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTopColor: 'white', animation: 'spin 1s ease-in-out infinite' }} />
            <h2 style={{ marginTop: 24, fontSize: 28, fontWeight: 600 }}>Učitavanje aplikacije...</h2>
            <p style={{ marginTop: 8, opacity: 0.9 }}>Knjigovodstvo AI</p>
        </div>
    );
}
