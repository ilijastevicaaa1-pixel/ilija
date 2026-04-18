import React, { useState } from "react";
import { BudgetPieChart, BudgetBarChart, BudgetLineChart } from "./components/BudgetCharts.jsx";

const defaultCategories = [
    { nazov: "Jedlo", limit: 0 },
    { nazov: "Bývanie", limit: 0 },
    { nazov: "Doprava", limit: 0 },
    { nazov: "Zábava", limit: 0 },
    { nazov: "Služby", limit: 0 },
    { nazov: "Ostatné", limit: 0 }
];

function Rozpocet() {
    // Handler za resetovanje svih podataka
    function resetAll() {
        setPlanovanyRozpocet(0);
        setInputValue("");
        setKategorie(defaultCategories.map(k => ({ ...k })));
        setLimitInputs(Array(defaultCategories.length).fill(""));
        setTransakcie([]);
        setLimitWarning("");
        setSelectedMonth(() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        });
        setNovaTrans({
            nazov: "",
            suma: "",
            kategoria: defaultCategories[0].nazov,
            datum: new Date().toISOString().slice(0, 10)
        });
    }

    // -----------------------------
    // 1) STATE
    // -----------------------------
    const [planovanyRozpocet, setPlanovanyRozpocet] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const [kategorie, setKategorie] = useState(defaultCategories);
    const [limitInputs, setLimitInputs] = useState(Array(defaultCategories.length).fill(""));
    const [transakcie, setTransakcie] = useState([]);
    const [limitWarning, setLimitWarning] = useState("");
    // Novo: izbor meseca
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [novaTrans, setNovaTrans] = useState({
        nazov: "",
        suma: "",
        kategoria: defaultCategories[0].nazov,
        datum: new Date().toISOString().slice(0, 10)
    });

    // -----------------------------
    // 2) HELPER FUNKCIJE
    // -----------------------------
    // --- Filter transakcija po izabranom mesecu ---
    const filteredTransakcie = transakcie.filter(t => {
        const [year, month] = t.datum.split('-');
        const key = `${year}-${month}`;
        return key === selectedMonth;
    });

    function vydavkyPodlaKategorie(nazov) {
        return filteredTransakcie
            .filter(t => t.kategoria === nazov)
            .reduce((sum, t) => sum + t.suma, 0);
    }

    const doterajsieVydavky = filteredTransakcie.reduce((sum, t) => sum + t.suma, 0);
    const zostava = planovanyRozpocet - doterajsieVydavky;

    // Prosečna dnevna potrošnja
    let avgPerDay = null;
    if (filteredTransakcie.length > 0) {
        const uniqueDays = Array.from(new Set(filteredTransakcie.map(t => t.datum)));
        avgPerDay = doterajsieVydavky / uniqueDays.length;
    }

    // -----------------------------
    // 3) AI ANALÝZA + SMART ALERTS
    // -----------------------------
    const aiAnalyses = [];
    const smartAlerts = [];
    // --- Napredna dnevna i anomalijska upozorenja ---
    // Dnevno upozorenje: danas vs. juče
    if (transakcie.length > 1) {
        const byDay = {};
        transakcie.forEach(t => {
            byDay[t.datum] = (byDay[t.datum] || 0) + t.suma;
        });
        const days = Object.keys(byDay).sort();
        if (days.length > 1) {
            const today = days[days.length - 1];
            const yesterday = days[days.length - 2];
            const diff = byDay[today] - byDay[yesterday];
            if (diff > 0) {
                smartAlerts.push(`Dnes si minul o ${diff.toFixed(2)} € viac ako včera.`);
            }
        }
    }
    // Anomalija: transakcija veća od proseka
    if (transakcie.length > 2) {
        const avg = transakcie.reduce((s, t) => s + t.suma, 0) / transakcie.length;
        const threshold = avg * 2.5;
        transakcie.forEach(t => {
            if (t.suma > threshold) {
                aiAnalyses.push(`Táto transakcia (${t.suma} €) je vyššia ako tvoj bežný denný priemer.`);
            }
        });
    }
    const aiTips = [];

    // Smart upozorenja (92% limita)
    kategorie.forEach(kat => {
        if (kat.limit > 0) {
            const spent = vydavkyPodlaKategorie(kat.nazov);
            const percent = (spent / kat.limit) * 100;
            if (percent >= 92) {
                smartAlerts.push(`Kategória ${kat.nazov} je na ${percent.toFixed(0)}% limitu!`);
            }
            // Savet po kategoriji
            if (spent > 0 && spent > kat.limit * 0.8 && spent < kat.limit) {
                aiTips.push(`Pozor: V kategórii ${kat.nazov} si prekročil 80% limitu. Možno by si mohol nastaviť nižší limit alebo sledovať výdavky.`);
            }
            if (spent > kat.limit) {
                aiTips.push(`V kategórii ${kat.nazov} si prekročil limit. Skús znížiť výdavky v tejto kategórii.`);
            }
        }
    });
    // Savet po navikama (najčešći dan)
    if (transakcie.length > 0) {
        const dayCounts = {};
        transakcie.forEach(t => {
            const d = new Date(t.datum);
            const day = d.toLocaleString('sk-SK', { weekday: 'long' });
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        let maxDay = null, maxDayCount = 0;
        Object.entries(dayCounts).forEach(([day, count]) => {
            if (count > maxDayCount) {
                maxDayCount = count;
                maxDay = day;
            }
        });
        if (maxDay && maxDayCount > 2) {
            aiTips.push(`Najviac míňaš v ${maxDay}. Skús si nastaviť menší denný limit na tento deň.`);
        }
    }

    // Savet po trendu (3 dana zaredom)
    if (transakcie.length > 2) {
        const sorted = [...transakcie].sort((a, b) => a.datum.localeCompare(b.datum));
        let trend = true;
        for (let i = sorted.length - 3; i < sorted.length - 1; i++) {
            if (sorted[i].suma < sorted[i + 1].suma) trend = false;
        }
        if (trend) {
            aiTips.push('Tvoja spotreba klesá posledné 3 dni. Len tak ďalej!');
        }
    }

    // Savet za optimizaciju (prebaci iz najskuplje u najjeftiniju kategoriju)
    if (transakcie.length > 0) {
        let minCat = null, minCatSum = Infinity;
        kategorie.forEach(k => {
            const sum = vydavkyPodlaKategorie(k.nazov);
            if (sum < minCatSum) {
                minCatSum = sum;
                minCat = k.nazov;
            }
        });
        if (maxCat && minCat && maxCat !== minCat && maxCatSum > 0 && minCatSum < maxCatSum) {
            aiTips.push(`Ak presunieš 20 € z kategórie ${maxCat} do ${minCat}, budeš v bezpečnej zóne.`);
        }
    }

    // --- NOVO: Predviđanje po kategorijama ---
    if (transakcie.length > 0) {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        kategorie.forEach(kat => {
            const katTrans = transakcie.filter(t => t.kategoria === kat.nazov);
            if (katTrans.length === 0) return;
            const spent = katTrans.reduce((sum, t) => sum + t.suma, 0);
            if (kat.limit > 0) {
                // Prosečna dnevna potrošnja za kategoriju
                const uniqueDays = Array.from(new Set(katTrans.map(t => t.datum)));
                const avgPerDayKat = spent / uniqueDays.length;
                if (avgPerDayKat > 0) {
                    const remaining = kat.limit - spent;
                    if (remaining <= 0) {
                        aiAnalyses.push(`Kategória ${kat.nazov}: limit je već prekoračen!`);
                    } else {
                        const daysToLimit = Math.ceil(remaining / avgPerDayKat);
                        if (daysToLimit < 4) {
                            aiAnalyses.push(`Kategória ${kat.nazov}: prekoračiš limit za ${daysToLimit} dana ako nastaviš ovim tempom.`);
                        } else if (daysToLimit > daysInMonth) {
                            aiAnalyses.push(`Kategória ${kat.nazov}: stabilno, potrošnja je niska.`);
                        } else {
                            aiAnalyses.push(`Kategória ${kat.nazov}: do limita imaš još oko ${daysToLimit} dana ovim tempom.`);
                        }
                    }
                }
            } else {
                aiAnalyses.push(`Kategória ${kat.nazov}: nema postavljen limit.`);
            }
        });
    }


    // --- ŠTA-AKO SCENARIJI ---
    if (avgPerDay !== null && planovanyRozpocet > 0) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Smanjenje dnevne potrošnje za 10%
        const reducedPerDay = avgPerDay * 0.9;
        const projectedReduced = reducedPerDay * daysInMonth;
        const ostaloReduced = planovanyRozpocet - projectedReduced;
        aiAnalyses.push(`Šta ako smanjiš dennú spotrebu za 10%: ostane ti ${ostaloReduced.toFixed(0)} € na kraju mesiaca.`);

        // Smanjenje za 2 € dnevno
        const reduced2 = avgPerDay - 2;
        if (reduced2 > 0) {
            const projectedReduced2 = reduced2 * daysInMonth;
            const ostaloReduced2 = planovanyRozpocet - projectedReduced2;
            aiAnalyses.push(`Ak znížiš dennú spotrebu o 2 €, zostane ti ${ostaloReduced2.toFixed(0)} €.`);
        }

        // Povećanje za 5 € dnevno
        const increased5 = avgPerDay + 5;
        const projectedIncreased5 = increased5 * daysInMonth;
        const prek = projectedIncreased5 - planovanyRozpocet;
        if (prek > 0) {
            aiAnalyses.push(`Ak budeš míňať o 5 € viac denne, prekročíš rozpočet o ${prek.toFixed(0)} €.`);
        }
    }


    // --- POREĐENJE SA PROŠLIM MESECOM ---
    if (transakcie.length > 0) {
        // Grupisanje po mesecu
        const transByMonth = {};
        transakcie.forEach(t => {
            const [year, month] = t.datum.split("-");
            const key = `${year}-${month}`;
            if (!transByMonth[key]) transByMonth[key] = [];
            transByMonth[key].push(t);
        });
        const months = Object.keys(transByMonth).sort();
        if (months.length >= 2) {
            const currMonth = months[months.length - 1];
            const prevMonth = months[months.length - 2];
            const sumCurr = transByMonth[currMonth].reduce((s, t) => s + t.suma, 0);
            const sumPrev = transByMonth[prevMonth].reduce((s, t) => s + t.suma, 0);
            if (sumPrev > 0) {
                const diff = sumCurr - sumPrev;
                const perc = (diff / sumPrev) * 100;
                aiAnalyses.push(
                    `Potrošnja ovog meseca (${currMonth}) je ${diff >= 0 ? 'veća' : 'manja'} za ${Math.abs(diff).toFixed(2)} € (${perc >= 0 ? '+' : ''}${perc.toFixed(1)}%) u odnosu na prošli mesec (${prevMonth}).`
                );
            }
        }
    }

    // --- VIKEND VS RADNI DANI ---
    if (transakcie.length > 0) {
        let workdaySum = 0, workdayCount = 0, weekendSum = 0, weekendCount = 0;
        transakcie.forEach(t => {
            const d = new Date(t.datum);
            const day = d.getDay(); // 0 = nedelja, 6 = subota
            if (day === 0 || day === 6) {
                weekendSum += t.suma;
                weekendCount++;
            } else {
                workdaySum += t.suma;
                workdayCount++;
            }
        });
        if (workdayCount > 0 && weekendCount > 0) {
            const avgWork = workdaySum / workdayCount;
            const avgWend = weekendSum / weekendCount;
            if (avgWork > 0 && avgWend > 0) {
                const perc = ((avgWend - avgWork) / avgWork) * 100;
                if (Math.abs(perc) > 10) {
                    aiAnalyses.push(
                        perc > 0
                            ? `Trošiš u proseku ${perc.toFixed(1)}% više po transakciji vikendom nego radnim danima.`
                            : `Trošiš u proseku ${Math.abs(perc).toFixed(1)}% manje po transakciji vikendom nego radnim danima.`
                    );
                } else {
                    aiAnalyses.push("Nema značajne razlike između vikenda i radnih dana po potrošnji.");
                }
            }
        }
    }

    // -----------------------------
    // 4) HANDLERI
    // -----------------------------
    const handleSaveBudget = () => {
        const value = Number(inputValue);
        if (!isNaN(value) && value >= 0) {
            setPlanovanyRozpocet(value);
            setInputValue("");
        }
    };

    const updateLimitInput = (index, value) => {
        const arr = [...limitInputs];
        arr[index] = value;
        setLimitInputs(arr);
    };

    const saveLimit = (index) => {
        const updated = [...kategorie];
        const value = Number(limitInputs[index]);
        if (!isNaN(value) && value >= 0) {
            updated[index].limit = value;
            setKategorie(updated);
            updateLimitInput(index, "");
        }
    };

    const handleTransInput = (field, value) => {
        setNovaTrans(prev => ({ ...prev, [field]: value }));
    };

    const addTransakcia = () => {
        const sumaNum = Number(novaTrans.suma);
        if (!novaTrans.nazov || isNaN(sumaNum) || sumaNum <= 0) return;

        const currSum = vydavkyPodlaKategorie(novaTrans.kategoria);
        const novaSuma = currSum + sumaNum;
        const katObj = kategorie.find(k => k.nazov === novaTrans.kategoria);

        let warning = "";
        if (katObj && katObj.limit > 0) {
            const percent = (novaSuma / katObj.limit) * 100;
            if (percent >= 90) {
                warning = `Táto transakcia ťa posúva na ${percent.toFixed(0)} % limitu kategórie ${katObj.nazov}.`;
            }
        }

        setTransakcie([...transakcie, {
            nazov: novaTrans.nazov,
            suma: sumaNum,
            kategoria: novaTrans.kategoria,
            datum: novaTrans.datum
        }]);

        setNovaTrans({
            nazov: "",
            suma: "",
            kategoria: defaultCategories[0].nazov,
            datum: new Date().toISOString().slice(0, 10)
        });

        setLimitWarning(warning);
    };

    // -----------------------------
    // 5) EXPORT CSV
    // -----------------------------
    function exportToCSV(transakcie, kategorie, planovanyRozpocet) {
        const rows = [
            ["Názov", "Suma (€)", "Kategória", "Dátum"],
            ...transakcie.map(t => [t.nazov, t.suma, t.kategoria, t.datum])
        ];

        const summary = [
            [],
            ["Plánovaný rozpočet", planovanyRozpocet],
            ...kategorie.map(k => ["Limit - " + k.nazov, k.limit])
        ];

        const csvContent = [...rows, ...summary]
            .map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "rozpocet_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // -----------------------------
    // 6) NAPREDNI MESEČNI REZIME (PDF-like)
    // -----------------------------
    // Ukupna potrošnja
    const totalSpent = doterajsieVydavky;
    // Najveća kategorija
    let maxCat = null, maxCatSum = 0;
    kategorie.forEach(k => {
        const sum = vydavkyPodlaKategorie(k.nazov);
        if (sum > maxCatSum) {
            maxCatSum = sum;
            maxCat = k.nazov;
        }
    });
    // Najskuplji dan
    let maxDay = null, maxDaySum = 0;
    const byDay = {};
    transakcie.forEach(t => {
        if (!byDay[t.datum]) byDay[t.datum] = 0;
        byDay[t.datum] += t.suma;
        if (byDay[t.datum] > maxDaySum) {
            maxDaySum = byDay[t.datum];
            maxDay = t.datum;
        }
    });
    // Najčešći tip troška
    let freqCat = null, freqCatCount = 0;
    const catCounts = {};
    transakcie.forEach(t => {
        catCounts[t.kategoria] = (catCounts[t.kategoria] || 0) + 1;
        if (catCounts[t.kategoria] > freqCatCount) {
            freqCatCount = catCounts[t.kategoria];
            freqCat = t.kategoria;
        }
    });
    // Trend u odnosu na prošli mesec
    let trendMsg = "";
    {
        const transByMonth = {};
        transakcie.forEach(t => {
            const [year, month] = t.datum.split("-");
            const key = `${year}-${month}`;
            if (!transByMonth[key]) transByMonth[key] = 0;
            transByMonth[key] += t.suma;
        });
        const months = Object.keys(transByMonth).sort();
        if (months.length >= 2) {
            const currMonth = months[months.length - 1];
            const prevMonth = months[months.length - 2];
            const sumCurr = transByMonth[currMonth];
            const sumPrev = transByMonth[prevMonth];
            if (sumPrev > 0) {
                const perc = ((sumCurr - sumPrev) / sumPrev) * 100;
                trendMsg = `Trend: Míňaš o ${Math.abs(perc).toFixed(1)}% ${perc < 0 ? 'menej' : 'viac'} ako minulý mesiac.`;
            }
        }
    }
    // AI komentar i preporuka (osnovno)
    let aiComment = "";
    if (maxCat && maxCatSum > 0) {
        aiComment = `Najviac míňaš na ${maxCat}. Skús znížiť výdavky v tejto kategórii o 10%.`;
    }

    // -----------------------------
    // 7) RETURN — JEDINI RETURN
    // -----------------------------
    return (
        <div style={{ maxWidth: 700, margin: "60px auto", padding: 32, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>

            {/* Naslov i izbor meseca */}
            <h1 style={{ textAlign: "center", fontSize: "2.2rem", marginBottom: 18, fontWeight: 700 }}>
                Rozpočet – Mesačný prehľad
            </h1>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
                <label style={{ fontWeight: 600, marginRight: 10 }}>Vyber mesiac:</label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1.5px solid #ccc', fontSize: '1rem' }}
                />
            </div>

            {/* Dugme za resetovanje svih podataka */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button
                    onClick={resetAll}
                    style={{
                        padding: '7px 18px',
                        borderRadius: 7,
                        background: '#e55',
                        color: '#fff',
                        fontWeight: 600,
                        border: 'none',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                    }}
                >
                    Resetuj sve
                </button>
            </div>
            {/* Napredni mesečni rezime */}
            <section style={{ background: "#f3f6fa", borderRadius: 14, padding: 28, marginBottom: 36, boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1.5px solid #e0e6ef" }}>
                <h2 style={{ fontSize: "1.18rem", marginBottom: 18, color: "#2a7", fontWeight: 700, letterSpacing: 0.5 }}>Mesačný prehľad – {(() => {
                    const now = new Date();
                    return now.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
                })()}</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 18 }}>
                    <div style={{ minWidth: 180 }}><b>Celková spotreba:</b> {totalSpent} €</div>
                    <div style={{ minWidth: 180 }}><b>Najväčšia kategória:</b> {maxCat ? `${maxCat} (${maxCatSum} €)` : "-"}</div>
                    <div style={{ minWidth: 180 }}><b>Najdrahší deň:</b> {maxDay ? `${new Date(maxDay).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' })} (${maxDaySum} €)` : "-"}</div>
                </div>
                {/* Nova statistika: broj transakcija i prosek */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 18 }}>
                    <div style={{ minWidth: 180 }}><b>Počet transakcií:</b> {filteredTransakcie.length}</div>
                    <div style={{ minWidth: 180 }}><b>Priemerná hodnota transakcie:</b> {filteredTransakcie.length > 0 ? (doterajsieVydavky / filteredTransakcie.length).toFixed(2) + ' €' : '-'}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 18 }}>
                    <div style={{ minWidth: 180 }}><b>Najčastejší typ troška:</b> {freqCat || "-"}</div>
                    <div style={{ minWidth: 180 }}><b>Zostáva:</b> {zostava} €</div>
                    <div style={{ minWidth: 180 }}><b>Prekročený rozpočet:</b> {zostava < 0 ? "Áno" : "Nie"}</div>
                </div>
                <div style={{ marginBottom: 10 }}>{trendMsg}</div>
                <div style={{ color: "#2a7", fontWeight: 600 }}>{aiComment}</div>
            </section>

            {/* UPOZORENJE: Ostalo manje od 10% budžeta */}
            {planovanyRozpocet > 0 && zostava >= 0 && zostava / planovanyRozpocet <= 0.1 && (
                <div style={{
                    background: '#fff3cd',
                    color: '#856404',
                    padding: 14,
                    borderRadius: 10,
                    marginBottom: 24,
                    fontWeight: 600,
                    textAlign: 'center',
                    fontSize: '1.08rem',
                    border: '1.5px solid #ffeeba',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}>
                    Pozor: Zostáva ti menej ako 10% mesačného rozpočtu!
                </div>
            )}

            {/* Smart upozorenje */}
            {limitWarning && (
                <div style={{
                    background: '#ffe0e0',
                    color: '#b00',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 18,
                    fontWeight: 600,
                    textAlign: 'center',
                    fontSize: '1.08rem'
                }}>
                    {limitWarning}
                </div>
            )}

            {/* AI Analýza */}
            <section style={{ background: "#f7f7fa", borderRadius: 12, padding: 24, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", marginBottom: 36 }}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: 12, color: "#444", fontWeight: 600 }}>AI Analýza</h2>

                {smartAlerts.length > 0 && (
                    <ul style={{ textAlign: "left", maxWidth: 520, margin: "0 auto 18px", color: "#e55", fontSize: "1.08rem", paddingLeft: 0, fontWeight: 600 }}>
                        {smartAlerts.map((msg, idx) => (
                            <li key={idx} style={{ marginBottom: 8, listStyle: "disc inside" }}>{msg}</li>
                        ))}
                    </ul>
                )}

                {aiAnalyses.length === 0 ? (
                    <div style={{ color: "#888", fontSize: "1.08rem" }}>
                        AI analýza tvojho rozpočtu bude dostupná čoskoro.
                    </div>
                ) : (
                    <ul style={{ textAlign: "left", maxWidth: 520, margin: "0 auto", color: "#333", fontSize: "1.08rem", paddingLeft: 0 }}>
                        {aiAnalyses.map((msg, idx) => (
                            <li key={idx} style={{ marginBottom: 8, listStyle: "disc inside" }}>{msg}</li>
                        ))}
                    </ul>
                )}
                {/* AI Saveti */}
                {aiTips.length > 0 && (
                    <div style={{ marginTop: 18, background: "#eaf7e6", borderRadius: 10, padding: 16, color: "#217a00", fontWeight: 600, fontSize: "1.07rem" }}>
                        <div style={{ marginBottom: 8, fontWeight: 700 }}>AI Saveti:</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {aiTips.map((tip, idx) => (
                                <li key={idx} style={{ marginBottom: 7 }}>{tip}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {/* Mesačný rezime */}
            <section style={{ marginBottom: 36, background: "#f7f7fa", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: 18, color: "#444", fontWeight: 600 }}>Mesačný rezime</h2>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140, textAlign: "center" }}>
                        <div style={{ fontWeight: 600, color: "#888" }}>Plánovaný rozpočet</div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#2a7" }}>{planovanyRozpocet} €</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 140, textAlign: "center" }}>
                        <div style={{ fontWeight: 600, color: "#888" }}>Doterajšie výdavky</div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e55" }}>{doterajsieVydavky} €</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 140, textAlign: "center" }}>
                        <div style={{ fontWeight: 600, color: "#888" }}>Zostáva</div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#27a" }}>{zostava} €</div>
                    </div>
                </div>

                {/* Unos budžeta */}
                <div style={{ marginTop: 24, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                    <input
                        type="number"
                        min="0"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder="Zadaj mesačný rozpočet (€)"
                        style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #ccc", fontSize: "1rem", width: 180 }}
                    />
                    <button
                        onClick={handleSaveBudget}
                        style={{ padding: "8px 18px", borderRadius: 8, background: "#2a7", color: "#fff", fontWeight: 600, border: "none", fontSize: "1rem", cursor: "pointer" }}
                    >
                        Uložiť rozpočet
                    </button>
                </div>
            </section>

            {/* Unos nove transakcije */}
            <section style={{ marginBottom: 36, background: "#f9f9fc", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: 16, color: "#444", fontWeight: 600 }}>Pridať transakciu</h2>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "center" }}>
                    <input
                        type="text"
                        value={novaTrans.nazov}
                        onChange={e => handleTransInput("nazov", e.target.value)}
                        placeholder="Názov"
                        style={{ padding: "7px 12px", borderRadius: 7, border: "1.5px solid #ccc", fontSize: "1rem", width: 140 }}
                    />

                    <input
                        type="number"
                        min="0"
                        value={novaTrans.suma}
                        onChange={e => handleTransInput("suma", e.target.value)}
                        placeholder="Suma (€)"
                        style={{ padding: "7px 12px", borderRadius: 7, border: "1.5px solid #ccc", fontSize: "1rem", width: 110 }}
                    />

                    <select
                        value={novaTrans.kategoria}
                        onChange={e => handleTransInput("kategoria", e.target.value)}
                        style={{ padding: "7px 12px", borderRadius: 7, border: "1.5px solid #ccc", fontSize: "1rem", width: 120 }}
                    >
                        {kategorie.map((kat) => (
                            <option key={kat.nazov} value={kat.nazov}>{kat.nazov}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={novaTrans.datum}
                        onChange={e => handleTransInput("datum", e.target.value)}
                        style={{ padding: "7px 12px", borderRadius: 7, border: "1.5px solid #ccc", fontSize: "1rem", width: 140 }}
                    />

                    <button
                        onClick={addTransakcia}
                        style={{ padding: "7px 18px", borderRadius: 7, background: "#27a", color: "#fff", fontWeight: 600, border: "none", fontSize: "1rem", cursor: "pointer" }}
                    >
                        Pridať transakciu
                    </button>
                </div>
            </section>

            {/* Sekcia: Kategórie */}
            <section style={{ marginBottom: 36 }}>
                <h2 style={{ textAlign: "center", fontSize: "1.2rem", marginBottom: 18, color: "#444", fontWeight: 600 }}>
                    Kategórie
                </h2>

                {/* Tlačidlá kategórií */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 24 }}>
                    {kategorie.map((cat) => (
                        <button
                            key={cat.nazov}
                            style={{
                                minWidth: 120,
                                padding: "18px 0",
                                borderRadius: 10,
                                border: "1.5px solid #e0e0e0",
                                background: "#f9f9fc",
                                fontWeight: 600,
                                fontSize: "1.05rem",
                                color: "#333",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                                cursor: "pointer"
                            }}
                            disabled
                        >
                            {cat.nazov}
                        </button>
                    ))}
                </div>

                {/* Limity kategórií */}
                <div style={{ maxWidth: 420, margin: "0 auto" }}>
                    {kategorie.map((kat, index) => (
                        <div
                            key={kat.nazov}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 14,
                                background: "#f7f7fa",
                                borderRadius: 8,
                                padding: "10px 14px"
                            }}
                        >
                            <span style={{ flex: 1, fontWeight: 600 }}>{kat.nazov}:</span>

                            <input
                                type="number"
                                min="0"
                                value={limitInputs[index]}
                                onChange={e => updateLimitInput(index, e.target.value)}
                                placeholder="Limit €"
                                style={{ width: 90, padding: "6px 10px", borderRadius: 6, border: "1.5px solid #ccc", fontSize: "1rem" }}
                            />

                            <button
                                onClick={() => saveLimit(index)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: 6,
                                    background: "#27a",
                                    color: "#fff",
                                    fontWeight: 600,
                                    border: "none",
                                    fontSize: "1rem",
                                    cursor: "pointer"
                                }}
                            >
                                Uložiť
                            </button>

                            <span style={{ marginLeft: 10, color: "#888", fontSize: "0.98rem" }}>
                                {kat.limit > 0 ? `${kat.limit} €` : ""}
                            </span>

                            <span
                                style={{
                                    marginLeft: 10,
                                    color: vydavkyPodlaKategorie(kat.nazov) > kat.limit && kat.limit > 0 ? "#e55" : "#27a",
                                    fontWeight: 600
                                }}
                            >
                                {vydavkyPodlaKategorie(kat.nazov) > 0
                                    ? `• ${vydavkyPodlaKategorie(kat.nazov)} €`
                                    : ""}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sekcia: Grafy */}
            <section style={{ background: "#f7f7fa", borderRadius: 12, padding: 24, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", marginBottom: 36 }}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: 12, color: "#444", fontWeight: 600 }}>Vizualizácia rozpočtu</h2>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "center" }}>

                    {/* Pie chart */}
                    <div style={{ width: 260, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Pie chart</div>
                        <BudgetPieChart
                            data={{
                                labels: kategorie.map(k => k.nazov),
                                datasets: [
                                    {
                                        data: kategorie.map(k =>
                                            transakcie
                                                .filter(t => t.kategoria === k.nazov)
                                                .reduce((sum, t) => sum + t.suma, 0)
                                        ),
                                        backgroundColor: ["#2a7", "#e55", "#27a", "#f7b731", "#8854d0", "#20bf6b"],
                                        borderWidth: 1
                                    }
                                ]
                            }}
                        />
                    </div>

                    {/* Bar chart */}
                    <div style={{ width: 320, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Bar chart</div>
                        <BudgetBarChart
                            data={{
                                labels: Array.from(new Set(transakcie.map(t => t.datum))).sort(),
                                datasets: [
                                    {
                                        label: "Denná spotreba (€)",
                                        data: Array.from(new Set(transakcie.map(t => t.datum)))
                                            .sort()
                                            .map(d =>
                                                transakcie
                                                    .filter(t => t.datum === d)
                                                    .reduce((sum, t) => sum + t.suma, 0)
                                            ),
                                        backgroundColor: "#27a"
                                    }
                                ]
                            }}
                        />
                    </div>

                    {/* Line chart */}
                    <div style={{ width: 320, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Line chart</div>
                        <BudgetLineChart
                            data={{
                                labels: Array.from(new Set(transakcie.map(t => t.datum))).sort(),
                                datasets: [
                                    {
                                        label: "Kumulatívna spotreba (€)",
                                        data: (() => {
                                            let cumSum = 0;
                                            return Array.from(new Set(transakcie.map(t => t.datum)))
                                                .sort()
                                                .map(d => {
                                                    cumSum += transakcie
                                                        .filter(t => t.datum === d)
                                                        .reduce((sum, t) => sum + t.suma, 0);
                                                    return cumSum;
                                                });
                                        })(),
                                        fill: false,
                                        borderColor: "#e55",
                                        tension: 0.2
                                    }
                                ]
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* Sekcia: Zoznam transakcií */}
            <section style={{ marginBottom: 36, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: 16, color: "#444", fontWeight: 600 }}>
                    Zoznam transakcií
                </h2>

                {transakcie.length === 0 ? (
                    <div style={{ color: "#888", fontSize: "1.05rem" }}>
                        Zatiaľ neboli pridané žiadne transakcie.
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1rem" }}>
                        <thead>
                            <tr style={{ background: "#f7f7fa" }}>
                                <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Názov</th>
                                <th style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>Suma (€)</th>
                                <th style={{ padding: "8px", textAlign: "center", fontWeight: 600 }}>Kategória</th>
                                <th style={{ padding: "8px", textAlign: "center", fontWeight: 600 }}>Dátum</th>
                            </tr>
                        </thead>

                        <tbody>
                            {transakcie.map((t, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                                    <td style={{ padding: "8px" }}>{t.nazov}</td>
                                    <td style={{ padding: "8px", textAlign: "right", color: "#e55", fontWeight: 600 }}>
                                        {t.suma.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "8px", textAlign: "center" }}>{t.kategoria}</td>
                                    <td style={{ padding: "8px", textAlign: "center" }}>{t.datum}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {/* Export CSV */}
            <button
                onClick={() => exportToCSV(transakcie, kategorie, planovanyRozpocet)}
                style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    background: "#2a7",
                    color: "#fff",
                    fontWeight: 600,
                    border: "none",
                    fontSize: "1rem",
                    cursor: "pointer",
                    margin: "36px 0"
                }}
            >
                Export u CSV
            </button>

        </div>
    );
}

export default Rozpocet;