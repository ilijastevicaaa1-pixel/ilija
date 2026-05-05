import express from 'express';
import { getDb } from '../db.js';
import { auth } from '../authMiddleware.js';

const router = express.Router();

// POST /api/manual-entry/banka - Manual bank transaction entry
router.post('/banka', auth, async (req, res) => {
    try {
        const { datum, opis, iznos, tip } = req.body;  // tip: 'prihod' or 'rashod'

        if (!datum || !opis || !iznos || !tip) {
            return res.status(400).json({ error: 'Obavezna polja: datum, opis, iznos, tip' });
        }

        const db = await getDb();
        const result = await db.query(
            `INSERT INTO transakcije (datum, opis, iznos, tip, manual_entry) 
       VALUES ($1, $2, $3, $4, true) 
       RETURNING *`,
            [datum, opis, parseFloat(iznos), tip]
        );

        res.json({
            message: 'Manualna transakcija uspešno sačuvana',
            transakcija: result.rows[0]
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

