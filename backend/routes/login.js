import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getDb } from "../db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: "Korisnik ne postoji" });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: "Pogrešna lozinka" });
    }
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        tenantId: user.tenantid || user.tenant_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      message: "Uspešna prijava",
      token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Greška na serveru" });
  }
});

export default router;
