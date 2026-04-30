// bankTransactionsFull.js - FULL API pre bankové transakcie (SK bankovníctvo)
import express from "express";
import { getDb } from "../db.js";
import { auth } from "../authMiddleware.js";

const router = express.Router();

// GET /api/bank/transactions - Zoznam transakcií s filtrom podľa účtu
router.get("/", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;
        const { account_id, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT bt.*, ba.name as account_name, ba.iban as account_iban
            FROM bank_transactions bt
            LEFT JOIN bank_accounts ba ON bt.account_id = ba.id
            WHERE bt.tenant_id = $1
        `;
        const params = [tenantId];

        // Filtrovanie podľa účtu
        if (account_id) {
            params.push(account_id);
            query += ` AND bt.account_id = $${params.length}`;
        }

        query += ` ORDER BY bt.transaction_date DESC, bt.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            transactions: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        console.error("Error fetching transactions:", err);
        res.status(500).json({ error: "Chyba pri načítaní transakcií", details: err.message });
    }
});

// GET /api/bank/transactions/:id - Detail jednej transakcie
router.get("/:id", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;
        const { id } = req.params;

        const result = await db.query(
            `SELECT bt.*, ba.name as account_name, ba.iban as account_iban
             FROM bank_transactions bt
             LEFT JOIN bank_accounts ba ON bt.account_id = ba.id
             WHERE bt.id = $1 AND bt.tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transakcia nebola nájdená" });
        }

        res.json({ transaction: result.rows[0] });
    } catch (err) {
        console.error("Error fetching transaction:", err);
        res.status(500).json({ error: "Chyba pri načítaní transakcie", details: err.message });
    }
});

// POST /api/bank/transactions - Pridať novú transakciu (FULL forma)
router.post("/", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;

        const {
            account_id,
            transaction_date,
            amount,
            type,
            description,
            variable_symbol,
            specific_symbol,
            constant_symbol,
            counter_iban,
            category
        } = req.body;

        // Validácia povinných polí
        if (!transaction_date || !amount || !type) {
            return res.status(400).json({
                error: "Povinné polia: transaction_date, amount, type"
            });
        }

        if (!["priliv", "odliv", "prijem", "vydavok"].includes(type)) {
            return res.status(400).json({
                error: "Neplatný typ. Povolené: priliv, odliv, prijem, vydavok"
            });
        }

        const result = await db.query(
            `INSERT INTO bank_transactions 
             (tenant_id, account_id, transaction_date, amount, type, description, 
              variable_symbol, specific_symbol, constant_symbol, counter_iban, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                tenantId,
                account_id,
                transaction_date,
                amount,
                type,
                description,
                variable_symbol || null,
                specific_symbol || null,
                constant_symbol || null,
                counter_iban || null,
                category || null
            ]
        );

        res.status(201).json({
            message: "Transakcia pridaná",
            transaction: result.rows[0]
        });
    } catch (err) {
        console.error("Error creating transaction:", err);
        res.status(500).json({ error: "Chyba pri vytváraní transakcie", details: err.message });
    }
});

// PUT /api/bank/transactions/:id - Aktualizovať transakciu
router.put("/:id", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;
        const { id } = req.params;

        const {
            account_id,
            transaction_date,
            amount,
            type,
            description,
            variable_symbol,
            specific_symbol,
            constant_symbol,
            counter_iban,
            category
        } = req.body;

        const result = await db.query(
            `UPDATE bank_transactions 
             SET account_id = COALESCE($1, account_id),
                 transaction_date = COALESCE($2, transaction_date),
                 amount = COALESCE($3, amount),
                 type = COALESCE($4, type),
                 description = COALESCE($5, description),
                 variable_symbol = COALESCE($6, variable_symbol),
                 specific_symbol = COALESCE($7, specific_symbol),
                 constant_symbol = COALESCE($8, constant_symbol),
                 counter_iban = COALESCE($9, counter_iban),
                 category = COALESCE($10, category)
             WHERE id = $11 AND tenant_id = $12
             RETURNING *`,
            [
                account_id,
                transaction_date,
                amount,
                type,
                description,
                variable_symbol,
                specific_symbol,
                constant_symbol,
                counter_iban,
                category,
                id,
                tenantId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transakcia nebola nájdená" });
        }

        res.json({
            message: "Transakcia aktualizovaná",
            transaction: result.rows[0]
        });
    } catch (err) {
        console.error("Error updating transaction:", err);
        res.status(500).json({ error: "Chyba pri aktualizácii transakcie", details: err.message });
    }
});

// DELETE /api/bank/transactions/:id - Vymazať transakciu
router.delete("/:id", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;
        const { id } = req.params;

        const result = await db.query(
            "DELETE FROM bank_transactions WHERE id = $1 AND tenant_id = $2 RETURNING id",
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transakcia nebola nájdená" });
        }

        res.json({ message: "Transakcia vymazaná" });
    } catch (err) {
        console.error("Error deleting transaction:", err);
        res.status(500).json({ error: "Chyba pri mazaní transakcie", details: err.message });
    }
});

// POST /api/bank/transactions/bulk - Hromadný import transakcií
router.post("/bulk", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: "Položka transactions musí byť neprázdne pole" });
        }

        const inserted = [];
        const errors = [];

        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            try {
                const result = await db.query(
                    `INSERT INTO bank_transactions 
                     (tenant_id, account_id, transaction_date, amount, type, description, 
                      variable_symbol, specific_symbol, constant_symbol, counter_iban, category)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     RETURNING *`,
                    [
                        tenantId,
                        tx.account_id,
                        tx.transaction_date,
                        tx.amount,
                        tx.type,
                        tx.description,
                        tx.variable_symbol || null,
                        tx.specific_symbol || null,
                        tx.constant_symbol || null,
                        tx.counter_iban || null,
                        tx.category || null
                    ]
                );
                inserted.push(result.rows[0]);
            } catch (err) {
                errors.push({ index: i, error: err.message });
            }
        }

        res.json({
            message: `Import dokončený: ${inserted.length} úspešných, ${errors.length} chýb`,
            inserted,
            errors
        });
    } catch (err) {
        console.error("Error bulk import:", err);
        res.status(500).json({ error: "Chyba pri hromadnom importovaní", details: err.message });
    }
});

export default router;
