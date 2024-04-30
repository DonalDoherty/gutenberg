const Pool = require('pg').Pool
require('dotenv').config();

const pool = new Pool({
    user: process.env.pgUser,
    password: process.env.pgPassword,
    host: process.env.pgHost,
    port: process.env.pgPort,
    database: process.env.pgDatabase,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;