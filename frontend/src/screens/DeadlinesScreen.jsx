// frontend/src/screens/DeadlineScreen.jsx
import React, { useState, useEffect } from "react";
import "../styles/deadlines.css";

const STATUS_OPTIONS = ["NOVÉ", "V PROCESE", "HOTOVÉ"];
const PRIORITY_OPTIONS = ["NÍZKA", "STREDNÁ", "VYSOKÁ"];

export default function DeadlineScreen() {
  const [tasks, setTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("NOVÉ");
  const [priority, setPriority] = useState("STREDNÁ");
  const [note, setNote] = useState("");

  // LocalStorage load
  useEffect(() => {
    const stored = localStorage.getItem("deadlines_tasks");
    if (stored) {
      setTasks(JSON.parse(stored));
    }
  }, []);

  // LocalStorage save
  useEffect(() => {
    localStorage.setItem("deadlines_tasks", JSON.stringify(tasks));
  }, [tasks]);

  const resetForm = () => {
    setTitle("");
    setDueDate("");
    setStatus("NOVÉ");
    setPriority("STREDNÁ");
    setNote("");
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    const newTask = {
      id: Date.now(),
      title,
      dueDate,
      status,
      priority,
      note,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setTasks((prev) => [newTask, ...prev]);
    resetForm();
  };

  const handleDelete = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleStatusChange = (id, newStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterDateFrom && t.dueDate < filterDateFrom) return false;
    if (filterDateTo && t.dueDate > filterDateTo) return false;
    return true;
  });

   return (
     <div className="rokovnik-background">
       <div className="deadlines-screen">
         <div className="deadlines-header">
           <h1>Úlohy a termíny</h1>
           <p className="deadlines-subtitle">
             Jednoduchý prehľad úloh, termínov a priorít.
           </p>
         </div>

         {/* FORM */}
         <div className="deadlines-card">
           <h2>Pridať úlohu</h2>
           <form className="deadlines-form" onSubmit={handleAddTask}>
             <div className="form-row">
               <div className="form-field">
                 <label>Názov úlohy</label>
                 <input
                   type="text"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   placeholder="Např. DPH za apríl, Faktúry, Kontrola banky..."
                 />
               </div>
               <div className="form-field">
                 <label>Termín</label>
                 <input
                   type="date"
                   value={dueDate}
                   onChange={(e) => setDueDate(e.target.value)}
                 />
               </div>
             </div>

             <div className="form-row">
               <div className="form-field">
                 <label>Status</label>
                 <select
                   value={status}
                   onChange={(e) => setStatus(e.target.value)}
                 >
                   {STATUS_OPTIONS.map((s) => (
                     <option key={s} value={s}>
                       {s}
                     </option>
                   ))}
                 </select>
               </div>
               <div className="form-field">
                 <label>Priorita</label>
                 <select
                   value={priority}
                   onChange={(e) => setPriority(e.target.value)}
                 >
                   {PRIORITY_OPTIONS.map((p) => (
                     <option key={p} value={p}>
                       {p}
                     </option>
                   ))}
                 </select>
               </div>
             </div>

             <div className="form-field">
               <label>Poznámka</label>
               <textarea
                 value={note}
                 onChange={(e) => setNote(e.target.value)}
                 rows={2}
                 placeholder="Doplňujúce info, klient, typ dane, podklady..."
               />
             </div>

             <div className="form-actions">
               <button type="submit" className="btn-primary">
                 Pridať úlohu
               </button>
             </div>
           </form>
         </div>

         {/* FILTERS */}
         <div className="deadlines-card">
           <h2>Filter</h2>
           <div className="deadlines-filters">
             <div className="form-field">
               <label>Status</label>
               <select
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
               >
                 <option value="">Všetko</option>
                 {STATUS_OPTIONS.map((s) => (
                   <option key={s} value={s}>
                     {s}
                   </option>
                 ))}
               </select>
             </div>
             <div className="form-field">
               <label>Termín od</label>
               <input
                 type="date"
                 value={filterDateFrom}
                 onChange={(e) => setFilterDateFrom(e.target.value)}
               />
             </div>
             <div className="form-field">
               <label>Termín do</label>
               <input
                 type="date"
                 value={filterDateTo}
                 onChange={(e) => setFilterDateTo(e.target.value)}
               />
             </div>
           </div>
         </div>

         {/* LIST */}
         <div className="deadlines-card">
           <h2>Zoznam úloh</h2>
           {filteredTasks.length === 0 ? (
             <p className="deadlines-empty">Zatiaľ nemáte žiadne úlohy.</p>
           ) : (
             <table className="deadlines-table">
               <thead>
                 <tr>
                   <th>Termín</th>
                   <th>Názov</th>
                   <th>Status</th>
                   <th>Priorita</th>
                   <th>Poznámka</th>
                   <th>Akcie</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredTasks.map((t) => (
                   <tr key={t.id}>
                     <td>{t.dueDate}</td>
                     <td>{t.title}</td>
                     <td>
                       <select
                         value={t.status}
                         onChange={(e) =>
                           handleStatusChange(t.id, e.target.value)
                         }
                       >
                         {STATUS_OPTIONS.map((s) => (
                           <option key={s} value={s}>
                             {s}
                           </option>
                         ))}
                       </select>
                     </td>
                     <td>{t.priority}</td>
                     <td>{t.note}</td>
                     <td>
                       <button
                         className="btn-danger"
                         onClick={() => handleDelete(t.id)}
                       >
                         🗑
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </div>
       </div>
     </div>
   );
}
