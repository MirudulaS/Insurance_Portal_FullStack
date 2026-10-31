/* eslint-disable no-console */
// Creates (or recreates) every table from schema.sql using the credentials in
// .env, so the `mysql` command-line client is NOT needed.
//
//   npm run db:init     create / recreate all 14 tables  (WIPES existing data)
//   npm run db:reset    db:init + seed demo data
//
// The database and the application user must already exist (see the README).

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: env.db.host,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      multipleStatements: true,
    });
  } catch (err) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`\nMySQL refused the login for user "${env.db.user}". Check DB_USER and DB_PASSWORD in backend/.env.`);
    } else if (err.code === 'ER_DBACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
      console.error(
        `\nThe database "${env.db.database}" does not exist, or user "${env.db.user}" has no access to it.\n` +
          `Log in to MySQL as root and run:\n` +
          `  CREATE DATABASE ${env.db.database};\n` +
          `  GRANT ALL PRIVILEGES ON ${env.db.database}.* TO '${env.db.user}'@'localhost';\n` +
          `  FLUSH PRIVILEGES;`
      );
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\nCould not reach MySQL. Make sure the MySQL service is running (services.msc -> MySQL80 -> Start).');
    } else {
      console.error('\nCould not connect to MySQL:', err.message);
    }
    process.exit(1);
  }

  try {
    await conn.query(sql);
    const [rows] = await conn.query('SHOW TABLES');
    console.log(`Schema applied to "${env.db.database}": ${rows.length} tables created.`);
    console.log(rows.map((r) => '  - ' + Object.values(r)[0]).join('\n'));
    console.log('\nNext: npm run seed');
  } catch (err) {
    console.error('\nApplying schema.sql failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
