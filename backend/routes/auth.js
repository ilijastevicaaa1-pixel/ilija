import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDb } from "../db.js";

const router = express.Router();

// Registracija firme i admin korisnika
router.post("/register", async (req, res) => {
  const { company, email, password } = req.body;
  if (!company || !email || !password) {
    return res.status(400).json({ message: "Sva polja su obavezna." });
  }
  try {
    const db = await getDb();
    // 1. Kreiraj firmu (tenant)
    const companyRes = await db.query(
      "INSERT INTO tenants (name) VALUES ($1) RETURNING id",
      [company]
    );
    const tenantId = companyRes.rows[0].id;
    // 2. Kreiraj admin korisnika
    const hash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      "INSERT INTO users (email, password, tenant_id, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [email, hash, tenantId, "admin"]
    );
    // 3. JWT token
    const token = jwt.sign(
      { id: userRes.rows[0].id, email, tenantId, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ message: "Registracija uspešna", token, tenantId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Greška na serveru" });
  }
});

export default router;
