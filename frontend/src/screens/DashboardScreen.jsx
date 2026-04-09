import React, { useState, useEffect } from "react";
import WarehouseMenu from "../components/WarehouseMenu";
import SimpleBarChart from "../components/SimpleBarChart";

function DashboardScreen() {
  // ------------------------------
  // STATE
  // ------------------------------
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCharts, setShowCharts] = useState(false);

  // ------------------------------
  // FETCH DATA
  // ------------------------------
  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      setError("Greška pri učitavanju podataka");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // ------------------------------
  // RENDER
  // ------------------------------
  if (loading) return <div style={{ margin: 40 }}>Učitavanje...</div>;
  if (error) return <div style={{ color: "red", margin: 40 }}>{error}</div>;

  return (
    <div style={{ margin: "40px auto 40px 40px", maxWidth: 700 }}>
      <div style={{ position: 'fixed', top: 24, left: 24, zIndex: 21, minWidth: 340 }}>

        {/* ❌ Dashboard naslov uklonjen */}
        {/* <h2 style={{ margin: 0, marginBottom: 8 }}>Dashboard</h2> */}

        {/* ✔ Dugme ostaje */}
        <button
          className="show-charts-btn modern-chart-btn"
          onClick={() => setShowCharts(v => !v)}
        >
          {showCharts ? 'Sakrij grafikone' : 'Prikaži grafikone'}
        </button>

        {showCharts && (
          <div style={{
            marginTop: 16,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            padding: 16,
            minWidth: 320
          }}>
            {dashboard.income && (
              <div style={{ marginBottom: 32 }}>
                <h4>Prihodi po mesecima</h4>
                <SimpleBarChart
                  data={dashboard.income.map(i => ({
                    month: i.month,
                    value: Number(i.income)
                  }))}
                  title="Prihodi"
                />
              </div>
            )}

            {dashboard.expense && (
              <div style={{ marginBottom: 32 }}>
                <h4>Rashodi po mesecima</h4>
                <SimpleBarChart
                  data={dashboard.expense.map(i => ({
                    month: i.month,
                    value: Number(i.expense)
                  }))}
                  title="Rashodi"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardScreen;
