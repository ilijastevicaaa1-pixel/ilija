import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import AssistantChatWindow from "../components/chat/AssistantChatWindow.jsx";
import "../styles/dashboard.css";
import { apiFetch } from "../api.js";

// import WarehouseMenu from "../components/WarehouseMenu";
// import SimpleBarChart from "../components/SimpleBarChart";

function DashboardScreen() {
  const { logout } = useAuth();
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Live clock update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await apiFetch("/api/dashboard");
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Greška pri učitavanju podataka");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.body.classList.add('dashboard-background');
    fetchData();
  }, []);

  useEffect(() => {
    return () => document.body.classList.remove('dashboard-background');
  }, []);

  if (loading) return <div style={{ margin: 40, opacity: 0.7 }}>Loading dashboard...</div>;
  if (error) return <div style={{ color: "red", margin: 40 }}>{error}</div>;

  return (
    <>
      {/* Banka button - top left */}
      <a href="/bank" style={{
        position: 'fixed',
        top: '30px',
        left: '30px',
        display: 'inline-block',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 14px rgba(76, 175, 80, 0.4)',
        transition: 'all 0.3s ease',
        zIndex: 999
      }}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        Banka
      </a>

      {/* Država button - bottom left */}
      <a href="/drzava" style={{
        position: 'fixed',
        bottom: '30px',
        left: '30px',
        display: 'inline-block',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 14px rgba(255, 152, 0, 0.4)',
        transition: 'all 0.3s ease',
        zIndex: 999
      }}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        Država
      </a>

      {/* Logout and Budget buttons - top right */}
      <div style={{ position: 'fixed', top: '30px', right: '30px', zIndex: 999, display: 'flex', gap: '10px' }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
            color: 'white',
            border: 'none',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '1rem',
            boxShadow: '0 4px 14px rgba(255, 107, 107, 0.4)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          Odjavi se
        </button>
        <a href="/budget" style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '12px',
          fontWeight: 'bold',
          fontSize: '1rem',
          boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          Rozpočet
        </a>
      </div>

      {/* Modern Live Clock - Center bottom, smaller */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 100,
        minWidth: '250px'
      }}>
        <div style={{ fontSize: '1.1rem', marginBottom: '5px', fontWeight: '400', opacity: 0.95 }}>
          {currentTime.toLocaleDateString('sr-RS', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '-0.02em' }}>
          {currentTime.toLocaleTimeString('sr-RS', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      {/* Chat FAB Button */}
      <button
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#007bff',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,123,255,0.4)',
          zIndex: 1000
        }}
        onClick={() => setShowChat(true)}
        title="Otvoriti asistenta"
        aria-label="Asistent chat"
      >
        🤖
      </button>

      {showChat && (
        <AssistantChatWindow onClose={() => setShowChat(false)} />
      )}
    </>
  );
}

export default DashboardScreen;
