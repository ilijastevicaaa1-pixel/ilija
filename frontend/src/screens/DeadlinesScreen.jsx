import React, { useState } from "react";
import "../styles/rokovnik-modern.css";

export default function DeadlinesScreen() {
  const [deadlines, setDeadlines] = useState([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [filter, setFilter] = useState("all");

  const addDeadline = (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const newDeadline = {
      id: Date.now(),
      title,
      date,
      priority,
    };

    setDeadlines(prev => [...prev, newDeadline]);
    setTitle("");
    setDate("");
    setPriority("normal");
  };

  const deleteDeadline = (id) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
  };

  const getUrgencyColor = (deadlineDate) => {
    const today = new Date();
    const target = new Date(deadlineDate);
    const diff = (target - today) / (1000 * 60 * 60 * 24);

    if (diff <= 2) return "high";
    if (diff <= 7) return "normal";
    return "low";
  };

  const filteredDeadlines = deadlines.filter(d => {
    if (filter === "all") return true;
    return d.priority === filter;
  });

  const grouped = filteredDeadlines.reduce((acc, d) => {
    const month = new Date(d.date).toLocaleString("sk-SK", { month: "long", year: "numeric" });
    if (!acc[month]) acc[month] = [];
    acc[month].push(d);
    return acc;
  }, {});

  return (
    <div className="rokovnik-app">
      <div className="header">
        <h1>📅 Deadlines</h1>
      </div>

      <div className="controls">
        <button className="control" onClick={() => setFilter("all")}>Všetko</button>
        <button className="control" onClick={() => setFilter("high")}>Vysoká priorita</button>
        <button className="control" onClick={() => setFilter("normal")}>Normálna</button>
        <button className="control" onClick={() => setFilter("low")}>Nízka</button>
      </div>

      <form className="add-form" onSubmit={addDeadline}>
        <input
          type="text"
          className="add-input"
          placeholder="Názov úlohy..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="date"
          className="add-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <select
          className="add-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Nízka</option>
          <option value="normal">Normálna</option>
          <option value="high">Vysoká</option>
        </select>

        <button className="add-btn" type="submit">Pridať</button>
      </form>

      <div className="kanban">
        <div className="kanban-column todo">
          <h3>Roky podľa mesiacov</h3>

          <div className="kanban-tasks">
            {Object.keys(grouped).length === 0 && (
              <p style={{ color: "white", opacity: 0.8 }}>Žiadne termíny.</p>
            )}

            {Object.keys(grouped).map(month => (
              <div key={month}>
                <h4 style={{ marginBottom: "10px", color: "white" }}>{month}</h4>

                {grouped[month]
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map(d => (
                    <div
                      key={d.id}
                      className={`task-card ${getUrgencyColor(d.date)}`}
                    >
                      <div className="task-content">
                        <h4>{d.title}</h4>
                        <p className="task-date">📅 {d.date}</p>
                        <p className="task-priority">🎯 {d.priority}</p>
                      </div>

                      <div className="task-actions">
                        <button
                          className="btn-icon danger"
                          onClick={() => deleteDeadline(d.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
