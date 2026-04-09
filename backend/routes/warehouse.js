import express from "express";
import { getDb } from "../db.js";
import { auth } from "../authMiddleware.js";

const router = express.Router();
router.use(auth);

// GET /api/warehouse/state - stanje svih artikala
router.get("/state", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const result = await db.query(
    `SELECT i.*, w.quantity
     FROM items i
     LEFT JOIN warehouse_cards w ON i.id = w.item_id AND w.tenant_id = $1
     WHERE i.tenant_id = $1
     ORDER BY i.name`,
    [tenantId]
  );
  res.json(result.rows);
});

// GET /api/warehouse/item/:id - stanje za jedan artikal
router.get("/item/:id", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const result = await db.query(
    `SELECT i.*, w.quantity
     FROM items i
     LEFT JOIN warehouse_cards w ON i.id = w.item_id AND w.tenant_id = $1
     WHERE i.tenant_id = $1 AND i.id = $2`,
    [tenantId, id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: "Artikal ne postoji" });
  res.json(result.rows[0]);
});

export default router;
