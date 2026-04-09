import React from 'react';

function AIExtractionModal({ open, data, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>AI Ekstrakcija podataka</h2>

        <div style={styles.section}>
          <h4>Ekstraktovana polja</h4>
          <pre style={styles.pre}>
{JSON.stringify(data?.fields || {}, null, 2)}
          </pre>
        </div>

        <div style={styles.section}>
          <h4>OCR tekst</h4>
          <textarea
            style={styles.textarea}
            defaultValue={data?.rawText || ""}
          />
        </div>

        <div style={styles.buttons}>
          <button onClick={onClose}>Otkaži</button>
          <button onClick={() => onConfirm(data)}>Potvrdi</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0,
    width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  modal: {
    width: 500,
    background: '#fff',
    padding: 20,
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  },
  section: {
    marginBottom: 20
  },
  pre: {
    background: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
    maxHeight: 150,
    overflowY: 'auto'
  },
  textarea: {
    width: '100%',
    height: 120,
    padding: 10,
    borderRadius: 6,
    border: '1px solid #ccc'
  },
  buttons: {
    display: 'flex',
    justifyContent: 'space-between'
  }
};

export default AIExtractionModal;
