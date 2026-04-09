import express from "express";
import { getDb } from "../db.js";
import { auth, requireRole } from "../authMiddleware.js";

const router = express.Router();

// Svi zahtevi zahtevaju autentifikaciju
router.use(auth);

// GET /api/items - lista svih artikala za tenant-a
router.get("/", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const result = await db.query("SELECT * FROM items WHERE tenant_id = $1 ORDER BY name", [tenantId]);
  res.json(result.rows);
});

// GET /api/items/:id - jedan artikal
router.get("/:id", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const result = await db.query("SELECT * FROM items WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  if (!result.rows[0]) return res.status(404).json({ message: "Artikal ne postoji" });
  res.json(result.rows[0]);
});

// POST /api/items - kreiraj artikal
router.post("/", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const { name, code, unit, description } = req.body;
  const result = await db.query(
    "INSERT INTO items (tenant_id, name, code, unit, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [tenantId, name, code, unit, description]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/items/:id - izmeni artikal
router.put("/:id", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { name, code, unit, description } = req.body;
  const result = await db.query(
    "UPDATE items SET name=$1, code=$2, unit=$3, description=$4 WHERE id=$5 AND tenant_id=$6 RETURNING *",
    [name, code, unit, description, id, tenantId]
  );
  if (!result.rows[0]) return res.status(404).json({ message: "Artikal ne postoji" });
  res.json(result.rows[0]);
});

// DELETE /api/items/:id - obriši artikal
router.delete("/:id", requireRole("admin"), async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const result = await db.query("DELETE FROM items WHERE id=$1 AND tenant_id=$2 RETURNING *", [id, tenantId]);
  if (!result.rows[0]) return res.status(404).json({ message: "Artikal ne postoji" });
  res.json({ success: true });
});

export default router;
