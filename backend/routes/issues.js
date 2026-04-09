import express from "express";
import { getDb } from "../db.js";
import { auth } from "../authMiddleware.js";

const router = express.Router();
router.use(auth);

// GET /api/issues - sve výdajke
router.get("/", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const result = await db.query(
    `SELECT v.*, i.name as item_name, i.unit FROM issues v JOIN items i ON v.item_id = i.id WHERE v.tenant_id = $1 ORDER BY v.date DESC, v.id DESC`,
    [tenantId]
  );
  res.json(result.rows);
});

// POST /api/issues - nova výdajka
router.post("/", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const { item_id, quantity, date, document, note } = req.body;
  // 1. Proveri zalihu
  const state = await db.query(
    `SELECT quantity FROM warehouse_cards WHERE tenant_id = $1 AND item_id = $2`,
    [tenantId, item_id]
  );
  const current = state.rows[0]?.quantity || 0;
  if (Number(current) < Number(quantity)) {
    return res.status(400).json({ message: "Nedovoljno zaliha!" });
  }
  // 2. Upis u issues
  await db.query(
    `INSERT INTO issues (tenant_id, item_id, quantity, date, document, note) VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, item_id, quantity, date || new Date(), document, note]
  );
  // 3. Smanji zalihu
  await db.query(
    `UPDATE warehouse_cards SET quantity = quantity - $1 WHERE tenant_id = $2 AND item_id = $3`,
    [quantity, tenantId, item_id]
  );
  res.json({ success: true });
});

export default router;
