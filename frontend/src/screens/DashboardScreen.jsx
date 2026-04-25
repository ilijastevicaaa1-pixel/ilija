import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import AssistantChatWindow from "../components/chat/AssistantChatWindow.jsx";
import "../styles/dashboard.css";

function DashboardScreen() {
  const { logout } = useAuth();
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/dashboard`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      setError("Greška pri učitavanju podataka");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.body.classList.add("dashboard-background");
    fetchData();
    return () => document.body.classList.remove("dashboard-background");
  }, []);

  if (loading) return <div style={{ margin: 40, opacity: 0.7 }}>Loading dashboard...</div>;
  if (error) return <div style={{ color: "red", margin: 40 }}>{error}</div>;

  return (
    <>
      {/* Banka */}
      <a href="/bank" style={{
        position: "fixed",
        top: "30px",
        left: "30px",
        padding: "12px 24px",
        background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
        color: "white",
        borderRadius: "12px",
        fontWeight: "bold",
        boxShadow: "0 4px 14px rgba(76, 175, 80, 0.4)",
        zIndex: 999
      }}>
        Banka
      </a>

      {/* Država */}
      <a href="/drzava" style={{
        position: "fixed",
        bottom: "30px",
        left: "30px",
        padding: "12px 24px",
        background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
        color: "white",
        borderRadius: "12px",
        fontWeight: "bold",
        boxShadow: "0 4px 14px rgba(255, 152, 0, 0.4)",
        zIndex: 999
      }}>
        Država
      </a>

      {/* Logout + Budget */}
      <div style={{ position: "fixed", top: "30px", right: "30px", zIndex: 999, display: "flex", gap: "10px" }}>
        <button
          onClick={handleLogout}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)",
            color: "white",
            borderRadius: "12px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(255, 107, 107, 0.4)"
          }}
        >
          Odjavi se
        </button>

        <a href="/budget" style={{
          padding: "12px 24px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: "12px",
          fontWeight: "bold",
          boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)"
        }}>
          Rozpočet
        </a>
      </div>

      {/* Clock */}
      <div style={{
        position: "fixed",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "15px 25px",
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(102, 126, 234, 0.4)",
        minWidth: "250px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "1.1rem", marginBottom: "5px" }}>
          {currentTime.toLocaleDateString("sr-RS", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric"
          })}
        </div>
        <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
          {currentTime.toLocaleTimeString("sr-RS", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })}
        </div>
      </div>

      {/* Chat */}
      <button
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "#007bff",
          color: "white",
          fontSize: "24px",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,123,255,0.4)"
        }}
        onClick={() => setShowChat(true)}
      >
        🤖
      </button>

      {showChat && <AssistantChatWindow onClose={() => setShowChat(false)} />}
    </>
  );
}

export default DashboardScreen;
