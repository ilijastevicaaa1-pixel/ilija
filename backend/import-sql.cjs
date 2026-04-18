const fs = require('fs');
const { Client } = require('pg');

async function importSQL() {
    const sql = fs.readFileSync('knjigovodstvo.sql').toString();

    const client = require('./db-config.js');

    await client.connect();
    await client.query(sql);
    await client.end();

    return "SQL import završen!";
}

module.exports = importSQL;
