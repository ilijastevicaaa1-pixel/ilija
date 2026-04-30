// bankAccounts.js - API pre správu bankových účtov
import express from "express";
import { getDb } from "../db.js";
import { auth } from "../authMiddleware.js";

const router = express.Router();

// GET /api/bank-accounts - Zoznam všetkých účtov pre tenant-a
router.get("/", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;

        const result = await db.query(
            "SELECT * FROM bank_accounts WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC",
            [tenantId]
        );

        res.json({ accounts: result.rows });
    } catch (err) {
        console.error("Error fetching bank accounts:", err);
        res.status(500).json({ error: "Chyba pri načítaní účtov", details: err.message });
    }
});

// POST /api/bank-accounts - Pridať nový účet
router.post("/", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;

        const {
            name,
            iban,
            bic,
            account_number,
            currency = "EUR"
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Názov účtu je povinný" });
        }

        const result = await db.query(
            `INSERT INTO bank_accounts (tenant_id, name, iban, bic, account_number, currency)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [tenantId, name, iban, bic, account_number, currency]
        );

        res.status(201).json({
            message: "Účet úspešne pridaný",
            account: result.rows[0]
        });
    } catch (err) {
        console.error("Error creating bank account:", err);
        res.status(500).json({ error: "Chyba pri vytváraní účtu", details: err.message });
    }
});

// PUT /api/bank-accounts/:id - Aktualizovať účet
router.put("/:id", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;
        const { id } = req.params;

        const {
            name,
            iban,
            bic,
            account_number,
            currency,
            is_active
        } = req.body;

        const result = await db.query(
            `UPDATE bank_accounts 
             SET name = COALESCE($1, name),
                 iban = COALESCE($2, iban),
                 bic = COALESCE($3, bic),
                 account_number = COALESCE($4, account_number),
                 currency = COALESCE($5, currency),
                 is_active = COALESCE($6, is_active)
             WHERE id = $7 AND tenant_id = $8
             RETURNING *`,
            [name, iban, bic, account_number, currency, is_active, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Účet nebol nájdený" });
        }

        res.json({
            message: "Účet aktualizovaný",
            account: result.rows[0]
        });
    } catch (err) {
        console.error("Error updating bank account:", err);
        res.status(500).json({ error: "Chyba pri aktualizácii účtu", details: err.message });
    }
});

// DELETE /api/bank-accounts/:id - Vymazať účet (soft delete)
router.delete("/:id", auth, async (req, res) => {
    try {
        const db = await getDb();
        const tenantId = req.user.tenantId || req.user.company_id;
        const { id } = req.params;

        const result = await db.query(
            "UPDATE bank_accounts SET is_active = false WHERE id = $1 AND tenant_id = $2 RETURNING id",
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Účet nebol nájdený" });
        }

        res.json({ message: "Účet vymazaný" });
    } catch (err) {
        console.error("Error deleting bank account:", err);
        res.status(500).json({ error: "Chyba pri mazaní účtu", details: err.message });
    }
});

export default router;
