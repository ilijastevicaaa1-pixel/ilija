
import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'test' || process.env.VITEST ? './.env.test' : './.env' });
import pg from 'pg';
const { Pool } = pg;

// PostgreSQL konekcija (Pool)
console.log('PG_USER iz .env:', process.env.PG_USER);
console.log('PG_PASSWORD iz .env:', process.env.PG_PASSWORD);
console.log('Tip PG_PASSWORD:', typeof process.env.PG_PASSWORD, process.env.PG_PASSWORD);
console.log('PG_DATABASE iz .env:', process.env.PG_DATABASE);
console.log('PG_HOST iz .env:', process.env.PG_HOST);
console.log('PG_PORT iz .env:', process.env.PG_PORT);

const poolConfig = process.env.TEST_DB_URL
  ? { connectionString: process.env.TEST_DB_URL }
  : {
      host: process.env.PG_HOST || 'localhost',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: process.env.PG_DATABASE || 'knjigovodstvo',
      port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
    };

console.log('DEBUG POOL CONFIG:');
for (const [key, value] of Object.entries(poolConfig)) {
  console.log(`  ${key}:`, value, '| type:', typeof value);
}

const pool = new Pool(poolConfig);

// Otvara konekciju i omogućava async/await rad
export async function getDb() {
  return pool;
}

// Automatski teardown pool konekcije za testove
export async function closeDb() {
  await pool.end();
}
