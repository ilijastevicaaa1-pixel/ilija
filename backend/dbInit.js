const pool = require('./db'); // prilagodi putanju ako treba
const bcrypt = require('bcrypt');

async function initializeDatabase() {
  try {
    // 1. Kreiranje tabele ako ne postoji
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      );
    `);

    console.log("Tabela 'users' proverena / kreirana.");

    // 2. Provera da li admin postoji
    const adminCheck = await pool.query(
      "SELECT * FROM users WHERE email = 'admin@firma.com';"
    );

    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash("admin123", 10); // default lozinka

      await pool.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4);`,
        ['admin', 'admin@firma.com', hash, 'admin']
      );

      console.log("Default admin kreiran.");
    } else {
      console.log("Admin već postoji.");
    }

  } catch (err) {
    console.error("Greška u inicijalizaciji baze:", err);
  }
}

export default initializeDatabase;
