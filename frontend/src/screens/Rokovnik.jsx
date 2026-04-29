import React, { useState, useEffect, useCallback } from "react";
"../styles/rokovnik-modern-v2.css";

function Rokovnik() {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState({ note: "", date: "", priority: "normal", category: "todo" });
    const [filter, setFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date");
    const [showCompleted, setShowCompleted] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editTask, setEditTask] = useState({});

    // LocalStorage persistence
    useEffect(() => {
        const saved = localStorage.getItem("rokovnik-tasks");
        if (saved) setTasks(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem("rokovnik-tasks", JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (e) => {
        e.preventDefault();
        if (!newTask.note.trim()) return;

        setTasks(prev => [...prev, {
            id: Date.now(),
            ...newTask,
            completed: false,
            createdAt: new Date().toISOString()
        }]);
        setNewTask({ note: "", date: "", priority: "normal", category: "todo" });
    };

    const deleteTask = useCallback((id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const toggleComplete = useCallback((id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    }, []);

    const startEdit = useCallback((task) => {
        setEditingId(task.id);
        setEditTask(task);
    }, []);

    const saveEdit = useCallback((e) => {
        e.preventDefault();
        setTasks(prev => prev.map(t => t.id === editingId ? editTask : t));
        setEditingId(null);
        setEditTask({});
    }, [editingId, editTask]);

    const moveTask = useCallback((id, newCategory) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
    }, []);

    // Filter & Sort
    const filteredTasks = tasks
        .filter(t => filter === "all" || t.priority === filter)
        .filter(t => showCompleted || !t.completed)
        .sort((a, b) => {
            if (sortBy === "date") return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
            if (sortBy === "priority") return ["high", "normal", "low"].indexOf(a.priority) - ["high", "normal", "low"].indexOf(b.priority);
            return 0;
        });

    const categories = ["todo", "progress", "done"];

    return (
        <div className="rokovnik-app">
            <header className="header">
                <h1>📘 Moderný Rokovník</h1>
                <div className="stats">
                    <span className="stat">📝 {tasks.filter(t => !t.completed).length}</span>
                    <span className="stat completed">{tasks.filter(t => t.completed).length}</span>
                </div>
            </header>

            {/* Controls */}
            <div className="controls">
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="control">
                    <option value="all">Všetky priority</option>
                    <option value="high">Vysoká</option>
                    <option value="normal">Normálna</option>
                    <option value="low">Nízka</option>
                </select>

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="control">
                    <option value="date">Podľa dátumu</option>
                    <option value="priority">Podľa priority</option>
                </select>

                <label className="checkbox-control">
                    <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
                    Zobraziť dokončené
                </label>
            </div>

            {/* Add Task Form */}
            <form onSubmit={addTask} className="add-form">
                <input
                    type="text"
                    placeholder="Nová poznámka..."
                    value={newTask.note}
                    onChange={(e) => setNewTask({ ...newTask, note: e.target.value })}
                    className="add-input"
                />
                <input
                    type="date"
                    value={newTask.date}
                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                    className="add-input small"
                />
                <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="add-select"
                >
                    <option value="low">🟢 Nízka</option>
                    <option value="normal">🟡 Normálna</option>
                    <option value="high">🔴 Vysoká</option>
                </select>
                <button type="submit" className="add-btn">➕ Pridať</button>
            </form>

            {/* Kanban Board */}
            <div className="kanban">
                {categories.map(category => (
                    <div key={category} className={`kanban-column ${category}`}>
                        <h3>{category === 'todo' ? '📋 To Do' : category === 'progress' ? '⚡ In Progress' : '✅ Done'}</h3>
                        <div className="kanban-tasks">
                            {filteredTasks
                                .filter(t => t.category === category)
                                .map(task => (
                                    <div key={task.id} className={`task-card ${task.priority} ${task.completed ? 'completed' : ''}`}>
                                        {editingId === task.id ? (
                                            <form onSubmit={saveEdit} className="edit-form">
                                                <textarea
                                                    value={editTask.note}
                                                    onChange={(e) => setEditTask({ ...editTask, note: e.target.value })}
                                                    className="edit-textarea"
                                                />
                                                <div className="edit-actions">
                                                    <button type="submit" className="btn-small primary">✓ Uložiť</button>
                                                    <button type="button" onClick={() => setEditingId(null)} className="btn-small secondary">✕ Zrušiť</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <>
                                                <div className="task-content">
                                                    <h4>{task.note}</h4>
                                                    {task.date && <span className="task-date">📅 {task.date}</span>}
                                                    <span className="task-priority">{task.priority === 'high' ? '🔴' : task.priority === 'normal' ? '🟡' : '🟢'}</span>
                                                </div>
                                                <div className="task-actions">
                                                    <button onClick={() => startEdit(task)} className="btn-icon">✏️</button>
                                                    <button onClick={() => toggleComplete(task.id)} className="btn-icon">
                                                        {task.completed ? '↶' : '✓'}
                                                    </button>
                                                    <button onClick={() => deleteTask(task.id)} className="btn-icon danger">🗑️</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Rokovnik;

