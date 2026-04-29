import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api.js";
import AssistantChatWindow from "../components/chat/AssistantChatWindow.jsx";
import "../styles/dashboard.css";

function DashboardScreen() {
    const { logout } = useAuth();
    const [dashboard, setDashboard] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showChat, setShowChat] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const handleLogout = () => {
        logout();
        window.location.href = "/login";
    };

    // Live clock
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch dashboard data
    async function fetchData() {
        try {
            setLoading(true);
            const data = await apiFetch("/api/dashboard");
            if (data.error) throw new Error(data.error);
            setDashboard(data);
        } catch (err) {
            console.error("FETCH ERROR:", err);
            setError("Chyba pri načítavaní údajov");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        document.body.classList.add("dashboard-background");
        fetchData();
        return () => document.body.classList.remove("dashboard-background");
    }, []);

    if (loading) {
        return <div style={{ margin: 40, opacity: 0.7 }}>Načítavam nástenku...</div>;
    }

    if (error) {
        return <div style={{ color: "red", margin: 40 }}>{error}</div>;
    }

    return (
        <>
            {/* Banka button */}
            <a
                href="/bank"
                style={{
                    position: "fixed",
                    top: "30px",
                    left: "30px",
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #4CAF50, #45a049)",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    boxShadow: "0 4px 14px rgba(76,175,80,0.4)",
                    transition: "0.3s",
                    zIndex: 999
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            >
                Banka
            </a>

            {/* Rokovník button (NOVO DUGME) */}
            <a
                href="/rokovnik"
                style={{
                    position: "fixed",
                    top: "100px",
                    left: "30px",
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #03A9F4, #0288D1)",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    boxShadow: "0 4px 14px rgba(3,169,244,0.4)",
                    transition: "0.3s",
                    zIndex: 999
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            >
                Rokovník
            </a>

            {/* Termíny button */}
            <a
                href="/deadlines"
                style={{
                    position: "fixed",
                    bottom: "30px",
                    left: "30px",
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #FF9800, #F57C00)",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    boxShadow: "0 4px 14px rgba(255,152,0,0.4)",
                    transition: "0.3s",
                    zIndex: 999
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            >
                Termíny
            </a>

            {/* Logout + Budget */}
            <div
                style={{
                    position: "fixed",
                    top: "30px",
                    right: "30px",
                    zIndex: 999,
                    display: "flex",
                    gap: "10px"
                }}
            >
                <button
                    onClick={handleLogout}
                    style={{
                        padding: "12px 24px",
                        background: "linear-gradient(135deg, #ff6b6b, #ee5a52)",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        boxShadow: "0 4px 14px rgba(255,107,107,0.4)",
                        transition: "0.3s",
                        cursor: "pointer"
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                >
                    Odhlásiť sa
                </button>

                <a
                    href="/rozpocet"
                    style={{
                        padding: "12px 24px",
                        background: "linear-gradient(135deg, #667eea, #764ba2)",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
                        transition: "0.3s"
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                >
                    Rozpočet
                </a>
            </div>

            {/* Clock */}
            <div
                style={{
                    position: "fixed",
                    bottom: "30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "white",
                    padding: "15px 25px",
                    borderRadius: "20px",
                    textAlign: "center",
                    boxShadow: "0 10px 30px rgba(102,126,234,0.4)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    zIndex: 100,
                    minWidth: "250px"
                }}
            >
                <div style={{ fontSize: "1.1rem", marginBottom: "5px", opacity: 0.95 }}>
                    {currentTime.toLocaleDateString("sk-SK", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                    })}
                </div>

                <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {currentTime.toLocaleTimeString("sk-SK", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    })}
                </div>
            </div>

            {/* Chat FAB */}
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
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,123,255,0.4)",
                    zIndex: 1000
                }}
                onClick={() => setShowChat(true)}
                title="Otvoriť asistenta"
            >
                🤖
            </button>

            {showChat && <AssistantChatWindow onClose={() => setShowChat(false)} />}
        </>
    );
}

export default DashboardScreen;