const pool = require('../db/pool');
const { asyncHandler, ApiError } = require('../utils/helpers');
const socket = require('../sockets');
const { scopeClauses, assertCanSeePreauth } = require('../utils/access');

async function attachMessages(query) {
  const [messageRows] = await pool.query('SELECT * FROM query_messages WHERE query_id = ? ORDER BY at ASC, id ASC', [query.id]);
  return {
    id: query.id,
    preAuthorizationId: query.preauthorization_id,
    question: query.question,
    raisedBy: query.raised_by,
    raisedByRole: query.raised_by_role,
    raisedDate: query.raised_date,
    status: query.status,
    messages: messageRows.map((m) => ({
      id: m.id,
      from: m.from_name,
      role: m.role,
      text: m.text,
      attachments: m.attachments || [],
      at: m.at,
    })),
  };
}

const getAll = asyncHandler(async (req, res) => {
  const { preAuthorizationId, status } = req.query;
  // Only queries on requests this user is a party to.
  const scope = scopeClauses(req.user, { patient: 'p.patient_id', hospital: 'p.hospital_id', insurer: 'p.insurer_id' });
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  if (preAuthorizationId) { clauses.push('q.preauthorization_id = ?'); params.push(preAuthorizationId); }
  if (status) { clauses.push('q.status = ?'); params.push(status); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT q.* FROM queries q JOIN preauthorizations p ON p.id = q.preauthorization_id ${where} ORDER BY q.raised_date DESC`,
    params
  );
  res.json(await Promise.all(rows.map(attachMessages)));
});

const getById = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM queries WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Query not found.');
  await assertCanSeePreauth(req.user, rows[0].preauthorization_id, 'Query not found.');
  res.json(await attachMessages(rows[0]));
});

const respond = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text, attachments = [] } = req.body;
  if (!text) throw new ApiError(400, 'Response text is required.');

  const [rows] = await pool.query('SELECT * FROM queries WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Query not found.');
  const pa = await assertCanSeePreauth(req.user, rows[0].preauthorization_id, 'Query not found.');

  await pool.query('INSERT INTO query_messages (query_id, from_name, role, text, attachments) VALUES (?,?,?,?,?)', [
    id,
    req.user.name,
    req.user.role,
    text,
    JSON.stringify(attachments),
  ]);
  await pool.query('UPDATE queries SET status = "RESPONDED" WHERE id = ?', [id]);

  const [updatedRows] = await pool.query('SELECT * FROM queries WHERE id = ?', [id]);
  const query = await attachMessages(updatedRows[0]);
  socket.emitToParties({ patientId: pa.patient_id, hospitalId: pa.hospital_id, insurerId: pa.insurer_id }, 'query:updated', query);
  res.json(query);
});

const resolve = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM queries WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Query not found.');
  const pa = await assertCanSeePreauth(req.user, rows[0].preauthorization_id, 'Query not found.');

  await pool.query('UPDATE queries SET status = "RESOLVED" WHERE id = ?', [id]);
  const [updatedRows] = await pool.query('SELECT * FROM queries WHERE id = ?', [id]);
  const query = await attachMessages(updatedRows[0]);
  socket.emitToParties({ patientId: pa.patient_id, hospitalId: pa.hospital_id, insurerId: pa.insurer_id }, 'query:updated', query);
  res.json(query);
});

module.exports = { getAll, getById, respond, resolve };
