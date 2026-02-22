require('dotenv').config();

const mssql = require('mssql');
const mysql = require('mysql2/promise');

const targetDatabase = process.env.DB_NAME || 'Chordsmith Studio';

const sourceConfig = {
  server: process.env.SRC_MSSQL_SERVER,
  port: parseInt(process.env.SRC_MSSQL_PORT || '1433', 10),
  database: process.env.SRC_MSSQL_DATABASE,
  user: process.env.SRC_MSSQL_USER,
  password: process.env.SRC_MSSQL_PASSWORD,
  options: {
    encrypt: String(process.env.SRC_MSSQL_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.SRC_MSSQL_TRUST_CERT || 'true').toLowerCase() === 'true'
  }
};

const mysqlConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: targetDatabase,
  charset: 'utf8mb4'
};

const tableConfigs = [
  {
    table: 'Users',
    pk: 'id',
    columns: ['id', 'username', 'email', 'first_name', 'last_name', 'password_hash', 'language_pref', 'user_type', 'is_verified', 'created_at']
  },
  {
    table: 'UserVerificationTokens',
    pk: 'id',
    columns: ['id', 'user_id', 'token', 'expires_at', 'used_at', 'created_at']
  },
  {
    table: 'PasswordResetTokens',
    pk: 'id',
    columns: ['id', 'user_id', 'token', 'expires_at', 'used_at', 'created_at']
  },
  {
    table: 'Families',
    pk: 'Id',
    columns: ['Id', 'Name', 'CreatedDate']
  },
  {
    table: 'Chords',
    pk: 'Id',
    columns: ['Id', 'Name', 'BaseFret', 'IsOriginal', 'IsDefault', 'creator_id', 'created_at', 'updated_at', 'CreatedDate']
  },
  {
    table: 'ChordFingerings',
    pk: 'Id',
    columns: ['Id', 'ChordId', 'StringNumber', 'FretNumber', 'FingerNumber']
  },
  {
    table: 'ChordBarres',
    pk: 'Id',
    columns: ['Id', 'ChordId', 'FretNumber']
  },
  {
    table: 'ChordFamilyMapping',
    pk: 'Id',
    columns: ['Id', 'ChordId', 'FamilyId']
  },
  {
    table: 'Folders',
    pk: 'Id',
    columns: ['Id', 'Name', 'creator_id', 'CreatedDate']
  },
  {
    table: 'Songs',
    pk: 'Id',
    columns: ['Id', 'Title', 'SongDate', 'Notes', 'SongKey', 'Capo', 'BPM', 'Effects', 'LayoutColumnCount', 'LayoutDividerRatio', 'ContentTextColumn1', 'ContentTextColumn2', 'SongContentFontSizePt', 'creator_id', 'created_at', 'updated_at', 'CreatedDate', 'ModifiedDate']
  },
  {
    table: 'SongChordDiagrams',
    pk: 'Id',
    columns: ['Id', 'SongId', 'ChordId', 'DisplayOrder']
  },
  {
    table: 'SongFolderMapping',
    pk: 'Id',
    columns: ['Id', 'SongId', 'FolderId']
  },
  {
    table: 'UserSongs',
    pk: 'id',
    columns: ['id', 'user_id', 'song_id', 'assigned_at', 'is_creator']
  },
  {
    table: 'UserChords',
    pk: 'id',
    columns: ['id', 'user_id', 'chord_id', 'assigned_at', 'is_creator']
  },
  {
    table: 'SongShares',
    pk: 'id',
    columns: ['id', 'song_id', 'sender_user_id', 'recipient_username', 'recipient_user_id', 'sent_at', 'status', 'payload']
  },
  {
    table: 'ChordShares',
    pk: 'id',
    columns: ['id', 'chord_id', 'sender_user_id', 'recipient_username', 'recipient_user_id', 'sent_at', 'status', 'payload']
  }
];

function validateSourceConfig() {
  const required = ['server', 'database', 'user', 'password'];
  const missing = required.filter(k => !sourceConfig[k]);
  if (missing.length > 0) {
    throw new Error(`Missing SQL Server source config vars: ${missing.map(k => `SRC_MSSQL_${k.toUpperCase()}`).join(', ')}`);
  }
}

function normalizeValue(value) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return value;
}

async function fetchRows(sourcePool, cfg) {
  const columnList = cfg.columns.map(c => `[${c}]`).join(', ');
  const result = await sourcePool.request().query(`SELECT ${columnList} FROM [${cfg.table}] ORDER BY [${cfg.pk}]`);
  return result.recordset;
}

async function clearTarget(connection) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const cfg of [...tableConfigs].reverse()) {
    await connection.query(`DELETE FROM \`${cfg.table}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function insertRows(connection, cfg, rows) {
  if (rows.length === 0) {
    return;
  }

  const placeholders = cfg.columns.map(() => '?').join(', ');
  const columnList = cfg.columns.map(c => `\`${c}\``).join(', ');
  const sql = `INSERT INTO \`${cfg.table}\` (${columnList}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = cfg.columns.map(col => normalizeValue(row[col]));
    await connection.execute(sql, values);
  }

  const [maxRows] = await connection.query(`SELECT COALESCE(MAX(\`${cfg.pk}\`), 0) AS maxId FROM \`${cfg.table}\``);
  const nextId = (maxRows[0]?.maxId || 0) + 1;
  await connection.query(`ALTER TABLE \`${cfg.table}\` AUTO_INCREMENT = ${nextId}`);
}

async function verifyCounts(sourcePool, targetConnection) {
  const mismatches = [];

  for (const cfg of tableConfigs) {
    const sourceResult = await sourcePool.request().query(`SELECT COUNT(1) AS c FROM [${cfg.table}]`);
    const sourceCount = sourceResult.recordset[0].c;

    const [targetRows] = await targetConnection.query(`SELECT COUNT(1) AS c FROM \`${cfg.table}\``);
    const targetCount = targetRows[0].c;

    if (sourceCount !== targetCount) {
      mismatches.push({ table: cfg.table, sourceCount, targetCount });
    }
  }

  return mismatches;
}

async function run() {
  validateSourceConfig();

  let sourcePool;
  let targetConnection;

  try {
    console.log('Connecting to SQL Server source...');
    sourcePool = await mssql.connect(sourceConfig);

    console.log(`Connecting to MySQL target database "${targetDatabase}"...`);
    targetConnection = await mysql.createConnection(mysqlConfig);

    await targetConnection.beginTransaction();

    console.log('Clearing MySQL target tables...');
    await clearTarget(targetConnection);

    for (const cfg of tableConfigs) {
      console.log(`Migrating ${cfg.table}...`);
      const rows = await fetchRows(sourcePool, cfg);
      await insertRows(targetConnection, cfg, rows);
      console.log(`  ${cfg.table}: ${rows.length} rows`);
    }

    const mismatches = await verifyCounts(sourcePool, targetConnection);
    if (mismatches.length > 0) {
      throw new Error(`Verification failed: ${JSON.stringify(mismatches)}`);
    }

    await targetConnection.commit();
    console.log('Migration completed successfully. Row counts verified.');
  } catch (error) {
    if (targetConnection) {
      try {
        await targetConnection.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError.message);
      }
    }
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (sourcePool) {
      await sourcePool.close();
    }
    if (targetConnection) {
      await targetConnection.end();
    }
  }
}

run();
