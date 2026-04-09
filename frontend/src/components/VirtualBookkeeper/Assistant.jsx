import React from "react";

export default function Assistant({ message }) {
  return (
    <div
      style={{
        background: "#e6f7ff",
        border: "1px solid #91d5ff",
        borderRadius: 8,
        padding: 16,
        margin: "16px 0",
        color: "#0050b3",
        fontWeight: "bold",
        fontSize: 18,
      }}
    >
      🤖 Asistentka: {message || "Čakám na vašu správu..."}
    </div>
  );
}