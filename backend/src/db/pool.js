const fs = require('node:fs');
const mysql = require('mysql2/promise');
const env = require('../config/env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: {
     ca: fs.readFileSync('/etc/secrets/ca.pem', 'utf8'),
  },
});

module.exports = pool;

// const mysql = require('mysql2/promise');
// const env = require('../config/env');

// const pool = mysql.createPool({
//   host: env.db.host,
//   user: env.db.user,
//   password: env.db.password,
//   database: env.db.database,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   dateStrings: true,
// });

// module.exports = pool;
