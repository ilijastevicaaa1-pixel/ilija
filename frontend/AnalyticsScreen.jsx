import React, { useEffect, useState } from 'react';
import Chart from './Chart';
import PieChart from './PieChart';
import { apiFetch } from './api.js'; // ✔️ Ispravljena putanja

const CheckIcon = () => (
  <span style={{ color: 'green', marginRight: 6 }}>✔️</span>
);
const WarningIcon = () => (
  <span style={{ color: '#ff9800', marginRight: 6 }}>⚠️</span>
);
const ErrorIcon = () => (
  <span style={{ color: 'red', marginRight: 6 }}>❗</span>
);

const AnalyticsScreen = () => {
  const [predictions, setPredictions] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    apiFetch('/api/predikcije')
      .then(res => res.json())
      .then(data => setPredictions(data));

    apiFetch('/api/anomalije')
      .then(res => res.json())
      .then(data => setAnomalies(data));

    apiFetch('/api/recommendations')
      .then(res => res.json())
      .then(data => setRecommendations(data));

    apiFetch('/api/alerts')
      .then(res => res.json())
      .then(data => setAlerts(data));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Analitika</h2>

      {/* PREDIKCIJE */}
      <div style={{ marginBottom: 32 }}>
        <h3>Predikcije</h3>

        {predictions ? (
          <>
            <div style={{ display: 'flex', gap: 24 }}>
              <Chart
                title="Prihodi - Predikcija"
                labels={[...predictions.months, ...Array(6).fill('Predikcija')]}
                data={[...predictions.income, ...predictions.predIncome]}
                color="#4caf50"
              />

              <Chart
                title="Rashodi - Predikcija"
                labels={[...predictions.months, ...Array(6).fill('Predikcija')]}
                data={[...predictions.expense, ...predictions.predExpense]}
                color="#f44336"
              />

              <Chart
                title="Profit - Predikcija"
                labels={[...predictions.months, ...Array(6).fill('Predikcija')]}
                data={[...predictions.profit, ...predictions.predProfit]}
                color="#2196f3"
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <b>Trend prihoda:</b> {predictions.trendIncome}<br />
              <b>Trend rashoda:</b> {predictions.trendExpense}<br />
              <b>Trend profita:</b> {predictions.trendProfit}<br />
              <b>Interval pouzdanosti prihoda:</b> {predictions.ciIncome.min} - {predictions.ciIncome.max}<br />
              <b>Interval pouzdanosti rashoda:</b> {predictions.ciExpense.min} - {predictions.ciExpense.max}<br />
              <b>Interval pouzdanosti profita:</b> {predictions.ciProfit.min} - {predictions.ciProfit.max}<br />
            </div>
          </>
        ) : (
          <div>Učitavanje predikcija...</div>
        )}
      </div>

      {/* ANOMALIJE */}
      <div>
        <h3>Anomalije</h3>

        {anomalies ? (
          <>
            <div>
              <b>Outliers (z-score):</b> {anomalies.zOutliers.length}<br />
              <b>Outliers (IQR):</b> {anomalies.iqrOutliers.length}<br />
              <b>Kašnjenja:</b> {anomalies.delayed.length}<br />
              <b>Abnormalne transakcije:</b> {anomalies.abnormal.length}<br />
            </div>

            <table style={{ marginTop: 16, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Iznos</th>
                  <th>Datum</th>
                  <th>Tip</th>
                </tr>
              </thead>

              <tbody>
                {anomalies.zOutliers.map(a => (
                  <tr key={a.id} style={{ background: '#ffe0e0' }}>
                    <td>{a.id}</td>
                    <td>{a.total_amount}</td>
                    <td>{a.issue_date}</td>
                    <td>Z-score outlier</td>
                  </tr>
                ))}

                {anomalies.iqrOutliers.map(a => (
                  <tr key={a.id + '-iqr'} style={{ background: '#fffbe0' }}>
                    <td>{a.id}</td>
                    <td>{a.total_amount}</td>
                    <td>{a.issue_date}</td>
                    <td>IQR outlier</td>
                  </tr>
                ))}

                {anomalies.delayed.map(a => (
                  <tr key={a.id + '-delayed'} style={{ background: '#e0f7fa' }}>
                    <td>{a.id}</td>
                    <td>{a.total_amount}</td>
                    <td>{a.issue_date}</td>
                    <td>Kašnjenje</td>
                  </tr>
                ))}

                {anomalies.abnormal.map(a => (
                  <tr key={a.id + '-abnormal'} style={{ background: '#e0ffe0' }}>
                    <td>{a.id}</td>
                    <td>{a.total_amount}</td>
                    <td>{a.issue_date}</td>
                    <td>Abnormalna transakcija</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div>Učitavanje anomalija...</div>
        )}
      </div>

      {/* AI PREPORUKE */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ color: 'green', display: 'flex', alignItems: 'center' }}>
          <span style={{ background: '#1976d2', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold', marginRight: 8 }}>AI</span>
          AI Preporuke
        </h3>

        {recommendations ? (
          <ul style={{ background: '#e8f5e9', borderRadius: 8, padding: 16 }}>
            {recommendations.advice.length === 0 && (
              <li><CheckIcon />Nema posebnih saveta za trenutni period.</li>
            )}

            {recommendations.advice.map((rec, i) => (
              <li key={i} style={{ color: 'green', fontWeight: 'bold', marginBottom: 8 }}>
                <CheckIcon />{rec}
              </li>
            ))}
          </ul>
        ) : (
          <div>Učitavanje preporuka...</div>
        )}
      </div>

      {/* UPOZORENJA */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: '#d32f2f', display: 'flex', alignItems: 'center' }}>
          <span style={{ background: '#ff9800', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold', marginRight: 8 }}>Fallback</span>
          Upozorenja
        </h3>

        {alerts ? (
          <ul style={{ background: '#fffde7', borderRadius: 8, padding: 16 }}>
            {alerts.alerts.length === 0 && (
              <li><WarningIcon />Nema kritičnih upozorenja.</li>
            )}

            {alerts.alerts.map((alert, i) => {
              const isError =
                alert.toLowerCase().includes('negativan keš flou') ||
                alert.toLowerCase().includes('kritično');

              return (
                <li
                  key={i}
                  style={{
                    color: isError ? 'red' : '#ff9800',
                    fontWeight: 'bold',
                    marginBottom: 8
                  }}
                >
                  {isError ? <ErrorIcon /> : <WarningIcon />}
                  {isError ? '[PRIORITET: Visok] ' : '[PRIORITET: Srednji] '}
                  {alert}
                </li>
              );
            })}
          </ul>
        ) : (
          <div>Učitavanje upozorenja...</div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsScreen;