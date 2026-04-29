import React, { useState } from "react";
import "../styles/rokovnik-modern-v2.css";

const getDeadlineColor = (dateStr) => {
    const taskDate = new Date(dateStr);
    const now = new Date();
    const diffTime = taskDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'danger';
    if (diffDays === 1) return 'warning';
    if (diffDays <= 2) return 'caution';
    return '';
};

function Rokovnik() {
    const [tasks, setTasks] = useState([]);
    const [showEdit, setShowEdit] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [note, setNote] = useState("");
    const [date, setDate] = useState("");
    const [priority, setPriority] = useState("normal");
    const [showCompleted, setShowCompleted] = useState(true);

    const addTask = (e) => {
        e.preventDefault();
        if (!note.trim()) return;

        const newTask = {
            id: Date.now(),
            note,
            date,
            priority,
            status: "todo",
            completed: false
        };

        setTasks(prev => [...prev, newTask]);
        setNote("");
        setDate("");
        setPriority("normal");
    };

    const moveTask = (id, newStatus) => {
        setTasks(prev =>
            prev.map(t =>
                t.id === id ? { ...t, status: newStatus } : t
            )
        );
    };

    const deleteTask = (id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const toggleComplete = (id) => {
        setTasks(prev =>
            prev.map(t =>
                t.id === id ? { ...t, completed: !t.completed } : t
            )
        );
    };

    const renderTask = (task) => {
        if (showEdit === task.id) {
            return (
                <div key={task.id} className="task-card edit-mode">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...editForm } : t));
                        setShowEdit(null);
                    }}>
                        <textarea
                            value={editForm.note || task.note}
                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                            placeholder="Edit note"
                            className="edit-textarea"
                        />
                        <input
                            type="date"
                            value={editForm.date || task.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="edit-date"
                        />
                        <div className="edit-buttons">
                            <button type="submit" className="btn-small primary">Uložiť</button>
                            <button type="button" onClick={() => setShowEdit(null)} className="btn-small secondary">Zrušiť</button>
                        </div>
                    </form>
                </div>
            );
        }

        return (
            <div
                key={task.id}
                className={`task-card ${task.priority} ${task.completed ? "completed" : ""} ${getDeadlineColor(task.date)}`}
            >
                <div className="task-content">
                    <h4>{task.note}</h4>
                    {task.date && (
                        <p className="task-date">
                            📅 {task.date}
                            <span className="deadline-badge">
                                {(() => {
                                    const taskDate = new Date(task.date);
                                    const now = new Date();
                                    const diffDays = Math.ceil((taskDate - now) / (1000 * 60 * 60 * 24));
                                    if (diffDays <= 0) return "⏰ PROŠLO";
                                    if (diffDays === 1) return "🔥 SUTRA";
                                    if (diffDays <= 2) return "⚠️ SKORO";
                                    return "✅ OK";
                                })()}
                            </span>
                        </p>
                    )}
                    <p className="task-priority">🎯 {task.priority.toUpperCase()}</p>
                </div>

                <div className="task-actions">
                    <button className="btn-icon" onClick={() => setShowEdit(task.id)}>
                        ✏️
                    </button>
                    <button className="btn-icon" onClick={() => toggleComplete(task.id)}>
                        ✔
                    </button>
                    <button className="btn-icon" onClick={() => moveTask(task.id, "todo")}>
                        📥
                    </button>
                    <button className="btn-icon" onClick={() => moveTask(task.id, "progress")}>
                        🔄
                    </button>
                    <button className="btn-icon" onClick={() => moveTask(task.id, "done")}>
                        ✅
                    </button>
                    <button className="btn-icon danger" onClick={() => deleteTask(task.id)}>
                        🗑️
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="rokovnik-app">
            <div className="header">
                <h1>📘 Rokovník</h1>

                <div className="stats">
                    <div className="stat">Úlohy: {tasks.length}</div>
                    <div className="stat completed">
                        Hotové: {tasks.filter(t => t.completed).length}
                    </div>
                </div>
            </div>

            <div className="controls">
                <label className="checkbox-control">
                    <input
                        type="checkbox"
                        checked={showCompleted}
                        onChange={() => setShowCompleted(!showCompleted)}
                    />
                    Zobraziť dokončené
                </label>
            </div>

            <form className="add-form" onSubmit={addTask}>
                <input
                    type="text"
                    className="add-input"
                    placeholder="Nová poznámka..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
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
                    <h3>To Do</h3>
                    <div className="kanban-tasks">
                        {tasks
                            .filter(t => t.status === "todo" && (showCompleted || !t.completed))
                            .map(renderTask)}
                    </div>
                </div>

                <div className="kanban-column progress">
                    <h3>In Progress</h3>
                    <div className="kanban-tasks">
                        {tasks
                            .filter(t => t.status === "progress" && (showCompleted || !t.completed))
                            .map(renderTask)}
                    </div>
                </div>

                <div className="kanban-column done">
                    <h3>Done</h3>
                    <div className="kanban-tasks">
                        {tasks
                            .filter(t => t.status === "done" && (showCompleted || !t.completed))
                            .map(renderTask)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Rokovnik;