// AI Chat 4-NIVO WIZARD SYSTEM
// Glavni menu → Podmenu → Wizard koraci → DB akcija

export const wizardHandlers = {
    // 1️⃣ FAKTURÁCIA - Vytváranie faktúr
    'fakturacia_1': {
        nazov: {
            prompt: '📄 Upišite názov faktúry:',
            validate: (v) => v.length > 2,
            next: 'suma'
        },
        suma: {
            prompt: '💰 Suma bez DPH (npr. 1000):',
            validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
            next: 'dph'
        },
        dph: {
            prompt: '📊 DPH satz (20% = 0.20):',
            default: '0.20',
            validate: (v) => !isNaN(parseFloat(v)),
            next: 'datum'
        },
        datum: {
            prompt: '📅 Datum (YYYY-MM-DD):',
            validate: (v) => !isNaN(Date.parse(v)),
            next: 'odberatel'
        },
        odberatel: {
            prompt: '👤 Odberateľ (firma/meno):',
            validate: (v) => v.length > 2,
            async complete(data, db) {
                const result = await db.query(`
          INSERT INTO faktury (nazov, suma, dph_satz, datum, odberatel, stav) 
          VALUES ($1,$2,$3,$4,$5,'vytvorena') RETURNING *
        `, [data.nazov, parseFloat(data.suma), parseFloat(data.dph), data.datum, data.odberatel]);

                return `✅ Faktúra "${data.nazov}" uspešne vytvorená!\nID: ${result.rows[0].id}\nSuma: ${data.suma}€ (+${data.dph_satz * 100}%)`;
            }
        }
    },

    // 1️⃣ FAKTURÁCIA - OCR
    'fakturacia_2': {
        async complete(data, db) {
            return `🔍 OCR processing started...\nUpload image/PDF via file input.\nStatus: Processing...`;
        }
    },

    // 2️⃣ BANKA - Zadávanie transakcií  
    'banka_1': {
        manual_transakcia: {
            prompt: '💳 Ručná transakcia (opis):',
            next: 'datum'
        },
        datum: {
            prompt: '📅 Datum (YYYY-MM-DD):',
            next: 'iznos'
        },
        iznos: {
            prompt: '💰 Iznos:',
            validate: (v) => !isNaN(parseFloat(v)),
            next: 'tip'
        },
        tip: {
            prompt: 'Tip (prihod/rashod):',
            async complete(data, db) {
                const result = await db.query(`
          INSERT INTO transakcije (opis, datum, iznos, tip, manual_entry) 
          VALUES ($1,$2,$3,$4,true) RETURNING *
        `, [data.opis, data.datum, parseFloat(data.iznos), data.tip]);

                return `✅ Transakcija "${data.opis}" dodata!\n${data.iznos} RSD (${data.tip})`;
            }
        }
    },

    // 3️⃣ DPH - Výpočet DPH
    'dph_1': {
        suma_bez_dph: {
            prompt: '💰 Suma bez DPH:',
            validate: (v) => !isNaN(parseFloat(v)),
            async complete(data, db) {
                const suma = parseFloat(data.suma_bez_dph);
                const dph20 = suma * 0.20;
                const ukupno = suma + dph20;
                return `📊 DPH kalkulácia:\nSuma: ${suma}€\nDPH 20%: ${dph20.toFixed(2)}€\nCELKOM: ${ukupno.toFixed(2)}€`;
            }
        }
    },

    // 4️⃣ VÝDAVKY - Zadávanie
    'vydavky_1': {
        opis: {
            prompt: '💸 Opis výdavku:',
            next: 'suma'
        },
        suma: {
            prompt: '💰 Suma:',
            validate: (v) => !isNaN(parseFloat(v)),
            async complete(data, db) {
                // Logika za kategorizáciu (AI ili manual)
                const result = await db.query(`
          INSERT INTO vydavky (opis, suma, datum) 
          VALUES ($1,$2,CURRENT_DATE) RETURNING *
        `, [data.opis, parseFloat(data.suma)]);
                return `✅ Výdavok "${data.opis}" za ${data.suma}€ dodan!`;
            }
        }
    },

    // Ostali moduli (skraćeno)
    'prijmy_1': { complete: () => '📈 Príjmy prehlad (implementovať...)' },
    'reporty_1': { complete: () => '📊 Měsíční report (implementovať...)' },
    'dokumenty_1': { complete: () => '📁 Dokument upload/OCR' },
    'zakaznici_1': { complete: () => '👥 Pridať zákazníka' },
    'projekty_1': { complete: () => '📋 Projekt analýza' },
    'sklad_1': { complete: () => '📦 Stav skladu' }
};

export function getWizardPrompt(state, data = {}) {
    const parts = state.split('_');
    const module = parts[0];
    const submenu = parts.slice(1).join('_');

    const handler = wizardHandlers[`${module}_${submenu}`];
    if (!handler) return null;

    const step = Object.keys(handler).find(key => !data[key]);
    if (!step) return null;

    const config = handler[step];
    return {
        prompt: typeof config.prompt === 'function' ? config.prompt(data) : config.prompt,
        state: state,
        nextStep: config.next,
        data
    };
}
