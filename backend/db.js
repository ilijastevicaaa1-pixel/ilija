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
  ? (() => {
    const databaseUrl = process.env.DATABASE_URL;
    return {
      connectionString: databaseUrl,
      ssl: databaseUrl.toLowerCase().includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    };
  })()
  : (() => {
    const pgHost = process.env.PG_HOST;
    const pgUser = process.env.PG_USER;
    const pgPassword = process.env.PG_PASSWORD;
    const pgDatabase = process.env.PG_DATABASE;

    const hasAllCreds = pgHost && pgUser && typeof pgPassword === 'string' && pgPassword.length > 0 && pgDatabase;

    if (!hasAllCreds) {
      // Avoid pg-pool throwing during startup if credentials are missing.
      // Use a clearly invalid password type so pg-pool won't crash while parsing.
      return {
        host: pgHost,
        user: pgUser,
        password: '',
        database: pgDatabase,
        port: Number(process.env.PG_PORT) || 5432,
      };
    }


    return {
      host: pgHost,
      user: pgUser,
      password: pgPassword,
      database: pgDatabase,
      port: Number(process.env.PG_PORT) || 5432,
      ssl: undefined,
    };
  })();

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