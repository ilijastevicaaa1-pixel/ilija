const fs = require('fs');
const { Client } = require('pg');

async function importSQL() {
    try {
        const sql = fs.readFileSync('knjigovodstvo.sql', 'utf8');

        // Better split for PostgreSQL dumps
        const statements = sql
            .split(/\r?\n\s*--|(?=CREATE|ALTER|INSERT|DROP|UPDATE)/i)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                await client.query(statement);
            } catch (stmtErr) {
                console.log(`Statement ${i + 1} error:`, stmtErr.message);
                continue;
            }
        }

        await client.end();
        return `SQL import završen (${statements.length} statements)`;
    } catch (err) {
        console.error('Import error:', err);
        throw err;
    }
}

module.exports = importSQL;
