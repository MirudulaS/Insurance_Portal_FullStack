const pool = require('../db/pool');
const { asyncHandler } = require('../utils/helpers');
const { toSafeUser } = require('./authController');

const getAllUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const clauses = [];
  const params = [];
  if (role) {
    clauses.push('role = ?');
    params.push(role);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM users ${where} ORDER BY created_at DESC`, params);
  res.json(rows.map(toSafeUser));
});

function toAuditLog(row) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    by: row.by_name,
    at: row.at,
    details: row.details,
  };
}

const getAuditLogs = asyncHandler(async (req, res) => {
  const { entityType } = req.query;
  const clauses = [];
  const params = [];
  if (entityType) {
    clauses.push('entity_type = ?');
    params.push(entityType);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM audit_logs ${where} ORDER BY at DESC`, params);
  res.json(rows.map(toAuditLog));
});

module.exports = { getAllUsers, getAuditLogs };
