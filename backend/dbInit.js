
import { getDb } from './db.js';
import bcrypt from 'bcrypt';

async function initializeDatabase() {
  try {
    // 1) Kreiranje minimalnih tabela koje backend koristi.
    //    Ovo je posebno bitno na produkciji (Render/Neon) gde schema možda nije prethodno importovana.
    const db = await getDb();

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      );
    `);

    // Izlazne fakture (dashboard/trends)
    await db.query(`
      CREATE TABLE IF NOT EXISTS output_invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(255),
        issue_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        amount_without_vat NUMERIC,
        vat_amount NUMERIC,
        total_amount NUMERIC,
        customer VARCHAR(255),
        status VARCHAR(50)
      );
    `);

    // Ulazne fakture (dashboard/trends)
    await db.query(`
      CREATE TABLE IF NOT EXISTS input_invoices (
        id SERIAL PRIMARY KEY,
        company_id INTEGER,
        invoice_number VARCHAR(255),
        issue_date DATE DEFAULT CURRENT_DATE,
        receipt_date DATE,
        payment_date DATE,
        amount_without_vat NUMERIC,
        vat_amount NUMERIC,
        total_amount NUMERIC,
        supplier VARCHAR(255),
        expense_category VARCHAR(255),
        pdf_path TEXT
      );
    `);

    // Bankovne transakcije (dashboard/trends)
    await db.query(`
      CREATE TABLE IF NOT EXISTS bank_transactions (
        id SERIAL PRIMARY KEY,
        transaction_date DATE DEFAULT CURRENT_DATE,
        amount NUMERIC,
        description TEXT,
        category VARCHAR(255),
        invoice_id INTEGER
      );
    `);

    console.log("Minimalna schema (users/output_invoices/input_invoices/bank_transactions) proverena / kreirana.");


    // 2. Provera da li admin postoji
    const adminCheck = await db.query(
      "SELECT * FROM users WHERE email = 'admin@firma.com';"
    );

    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash("admin123", 10); // default lozinka

      await db.query(
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
