import express from 'express';
import { getDb } from '../db.js';
import { auth } from '../authMiddleware.js';

const router = express.Router();

// POST /api/manual-entry - Ručni unos (manual entry)
// Contract:
// {
//   category: 'fakturacia' | 'banka' | ...,
//   suboption: 'vytvaranie faktur' | ...,
//   data: { ... }
// }
router.post('/', auth, async (req, res) => {
    const { category, suboption, data } = req.body || {};

    if (!category || !suboption || !data) {
        return res.status(400).json({ message: 'Missing fields: category, suboption, data' });
    }

    const errors = [];

    // --- helpers ---
    const requireFields = (obj, fields, label = 'data') => {
        for (const f of fields) {
            if (obj?.[f] === undefined || obj?.[f] === null || obj?.[f] === '') {
                errors.push(`Missing ${label}.${f}`);
            }
        }
    };

    const requireNumber = (obj, field, label = 'data') => {
        const v = obj?.[field];
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n)) errors.push(`Invalid ${label}.${field}`);
    };

    // --- FACTURACIA ---
    if (category === 'fakturacia' && suboption === 'vytvaranie faktur') {
        requireFields(
            data,
            ['invoice_number', 'issue_date', 'due_date', 'supplier', 'customer', 'items', 'total', 'note'],
            'data'
        );

        if (Array.isArray(data.items)) {
            for (const [idx, it] of data.items.entries()) {
                requireFields(it, ['name', 'qty', 'price', 'vat'], `items[${idx}]`);
                requireNumber(it, 'qty', `items[${idx}]`);
                requireNumber(it, 'price', `items[${idx}]`);
                requireNumber(it, 'vat', `items[${idx}]`);
            }
        } else {
            errors.push('data.items must be array');
        }

        requireNumber(data, 'total');
    }

    // --- BANKA ---
    if (category === 'banka' && suboption === 'parovanie platieb') {
        requireFields(
            data,
            ['transaction_date', 'amount', 'variable_symbol', 'iban', 'description', 'invoice_id', 'type_trans'],
            'data'
        );
        requireNumber(data, 'amount');
    }

    // Fallback: za sve druge podopcije (trenutno minimalno proveri samo da je data objekat)
    if (
        errors.length === 0 &&
        !(
            (category === 'fakturacia' && suboption === 'vytvaranie faktur') ||
            (category === 'banka' && suboption === 'parovanie platieb')
        )
    ) {
        if (typeof data !== 'object' || Array.isArray(data)) {
            errors.push('data must be object');
        }
    }

    if (errors.length) {
        return res.status(400).json({ message: 'Invalid payload', errors });
    }

    // Ovde ide DB upis / ažuriranje.
    // Za sada samo OK (kako je traženo).
    return res.json({ message: 'OK' });
});

// POST /api/manual-entry/banka - Manual bank transaction entry
router.post('/banka', auth, async (req, res) => {
    try {
        const { datum, opis, iznos, tip } = req.body; // tip: 'prihod' ili 'rashod'

        if (!datum || !opis || !iznos || !tip) {
            return res
                .status(400)
                .json({ error: 'Obavezna polja: datum, opis, iznos, tip' });
        }

        const db = await getDb();
        const result = await db.query(
            `INSERT INTO transakcije (datum, opis, iznos, tip, manual_entry)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
            [datum, opis, parseFloat(iznos), tip]
        );

        res.json({
            message: 'Manualna transakcija uspe9no sa9uvana',
            transakcija: result.rows[0],
        });
    } catch (err) {
        console.error('Manual entry error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/manual-entry/transactions - List recent manual transactions
router.get('/transactions', auth, async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query(
            `SELECT * FROM transakcije
       WHERE manual_entry = true OR manual_entry IS NULL
       ORDER BY datum DESC LIMIT 20`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;

