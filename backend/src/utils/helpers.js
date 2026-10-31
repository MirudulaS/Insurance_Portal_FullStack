// Wraps an async route handler so rejected promises reach Express's error
// middleware instead of crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// A small typed error so controllers can throw with an intended HTTP status;
// errorHandler.js turns this into the { message } shape the frontend expects.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Generates the next sequential ID for a given prefix (e.g. "PA-1006") by
// looking at the current max in the given table/column.
async function nextId(pool, prefix, table, column = 'id') {
  const [rows] = await pool.query(
    `SELECT ${column} FROM ${table} WHERE ${column} LIKE ? ORDER BY CAST(SUBSTRING_INDEX(${column}, '-', -1) AS UNSIGNED) DESC LIMIT 1`,
    [`${prefix}-%`]
  );
  if (rows.length === 0) return `${prefix}-1001`;
  const lastNumber = Number(rows[0][column].split('-')[1]);
  return `${prefix}-${lastNumber + 1}`;
}

async function addAuditLog(pool, { entityType, entityId, action, by, details }) {
  const id = await nextId(pool, 'AUD', 'audit_logs');
  await pool.query('INSERT INTO audit_logs (id, entity_type, entity_id, action, by_name, details) VALUES (?,?,?,?,?,?)', [
    id,
    entityType,
    entityId,
    action,
    by,
    details || null,
  ]);
}

module.exports = { asyncHandler, ApiError, nextId, addAuditLog };
