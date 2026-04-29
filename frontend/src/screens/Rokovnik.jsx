import React, { useState } from "react";
import "../styles/rokovnik-modern.css";

function Rokovnik() {
    const [tasks, setTasks] = useState([]);
    const [note, setNote] = useState("");
    const [date, setDate] = useState("");
    const [priority, setPriority] = useState("normal");

    const handleAdd = (e) => {
        e.preventDefault();
        if (!note.trim()) return;

        setTasks(prev => [
            ...prev,
            {
                id: Date.now(),
                note,
                date,
                priority
            }
        ]);

        setNote("");
        setDate("");
        setPriority("normal");
    };

    const handleDelete = (id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="rokovnik-bg">
            <div className="rokovnik-card">
                <h1 className="title">📘 Rokovník</h1>

                <form className="form-grid" onSubmit={handleAdd}>
                    <input
                        type="text"
                        placeholder="Poznámka"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="input"
                    />

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="input"
                    />

                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="input"
                    >
                        <option value="low">Nízka priorita</option>
                        <option value="normal">Normálna priorita</option>
                        <option value="high">Vysoká priorita</option>
                    </select>

                    <button className="btn-primary" type="submit">Pridať</button>
                </form>

                <div className="task-list">
                    {tasks.length === 0 && (
                        <p className="empty">Žiadne úlohy. Pridaj prvú vyššie.</p>
                    )}

                    {tasks.map((t) => (
                        <div key={t.id} className={`task-item ${t.priority}`}>
                            <div>
                                <strong>{t.note}</strong>
                                {t.date && <p className="date">📅 {t.date}</p>}
                            </div>

                            <button className="btn-danger" onClick={() => handleDelete(t.id)}>
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Rokovnik;
