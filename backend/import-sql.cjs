const fs = require('fs');
const { Client } = require('pg');

async function importSQL() {
    const sql = fs.readFileSync('knjigovodstvo.sql').toString();

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    await client.query(sql);
    await client.end();

    return "SQL import završen!";
}

module.exports = importSQL;
