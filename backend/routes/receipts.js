import express from "express";
import { getDb } from "../db.js";
import { auth } from "../authMiddleware.js";

const router = express.Router();
router.use(auth);

// GET /api/receipts - sve príjemke
router.get("/", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const result = await db.query(
    `SELECT r.*, i.name as item_name, i.unit FROM receipts r JOIN items i ON r.item_id = i.id WHERE r.tenant_id = $1 ORDER BY r.date DESC, r.id DESC`,
    [tenantId]
  );
  res.json(result.rows);
});

// POST /api/receipts - nova príjemka
router.post("/", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const { item_id, quantity, date, document, note } = req.body;
  // 1. Povećaj zalihu
  await db.query(
    `INSERT INTO receipts (tenant_id, item_id, quantity, date, document, note) VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, item_id, quantity, date || new Date(), document, note]
  );
  // 2. Upsert na warehouse_cards
  await db.query(
    `INSERT INTO warehouse_cards (tenant_id, item_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, item_id) DO UPDATE SET quantity = warehouse_cards.quantity + EXCLUDED.quantity`,
    [tenantId, item_id, quantity]
  );
  res.json({ success: true });
});

export default router;
