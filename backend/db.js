import dotenv from 'dotenv';

// Učitava .env SAMO lokalno, nikad u produkciji
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import pg from 'pg';
const { Pool } = pg;

// =========================
// DEBUG ISPIS ENV VARIJABLI
// =========================
console.log("=== RENDER ENV DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PG_HOST:", process.env.PG_HOST);
console.log("PG_USER:", process.env.PG_USER);
console.log("PG_PASSWORD:", process.env.PG_PASSWORD);
console.log("PG_DATABASE:", process.env.PG_DATABASE);
console.log("PG_PORT:", process.env.PG_PORT);
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("========================");

// =========================
// KONFIGURACIJA POOLA
// =========================
const poolConfig = process.env.DATABASE_URL
  ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
  : {
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: Number(process.env.PG_PORT) || 5432,
    ssl: { rejectUnauthorized: false }
  };

console.log("=== DEBUG POOL CONFIG ===");
console.log(poolConfig);
console.log("========================");

const pool = new Pool(poolConfig);

// =========================
// EXPORT FUNKCIJA
// =========================
export async function getDb() {
  return pool;
}

export async function closeDb() {
  await pool.end();
}