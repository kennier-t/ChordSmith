const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ChordSmith',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    charset: 'utf8mb4'
};

let pool;

function formatSqlAndValues(queryString, params = {}) {
    const values = [];
    const sqlText = queryString.replace(/@([a-zA-Z0-9_]+)/g, (_, name) => {
        if (!Object.prototype.hasOwnProperty.call(params, name)) {
            throw new Error(`Missing SQL parameter: @${name}`);
        }
        values.push(params[name]);
        return '?';
    });
    return { sqlText, values };
}

function normalizeResult(rawResult) {
    if (Array.isArray(rawResult)) {
        const [rows] = rawResult;
        if (Array.isArray(rows)) {
            return { recordset: rows, rowsAffected: [rows.length], insertId: undefined };
        }
        return { recordset: [], rowsAffected: [rows.affectedRows || 0], insertId: rows.insertId };
    }
    return { recordset: [], rowsAffected: [0], insertId: undefined };
}

async function connect() {
    try {
        if (pool) {
            return pool;
        }
        pool = mysql.createPool(config);
        await pool.query('SELECT 1');
        console.log('Connected to MySQL');
        return pool;
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
}

async function query(queryString, params) {
    const activePool = await connect();
    const { sqlText, values } = formatSqlAndValues(queryString, params);
    const rawResult = await activePool.execute(sqlText, values);
    return normalizeResult(rawResult);
}

async function beginTransaction() {
    const activePool = await connect();
    const connection = await activePool.getConnection();
    await connection.beginTransaction();

    return {
        async query(queryString, params) {
            const { sqlText, values } = formatSqlAndValues(queryString, params);
            const rawResult = await connection.execute(sqlText, values);
            return normalizeResult(rawResult);
        },
        async commit() {
            await connection.commit();
        },
        async rollback() {
            await connection.rollback();
        },
        release() {
            connection.release();
        }
    };
}

module.exports = {
    query,
    connect,
    beginTransaction
};
