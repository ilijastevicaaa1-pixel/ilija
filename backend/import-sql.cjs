const fs = require('fs');
const { Client } = require('pg');

async function importSQL() {
    const sql = fs.readFileSync('knjigovodstvo.sql', 'utf8');

    const statements = sql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    for (const statement of statements) {
        try {
            await client.query(statement);
        } catch (err) {
            console.error("SQL error in statement:", statement);
            throw err;
        }
    }

    await client.end();

    return "SQL import završen!";
}

module.exports = importSQL;
