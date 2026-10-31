const pool = require('../db/pool');
const { asyncHandler, ApiError, nextId, addAuditLog } = require('../utils/helpers');
const { createNotification } = require('./notificationController');
const socket = require('../sockets');
const { scopeClauses, assertCanSeeRow } = require('../utils/access');

function toClaim(row) {
  return {
    id: row.id,
    preAuthorizationId: row.preauthorization_id,
    patientId: row.patient_id,
    hospitalId: row.hospital_id,
    insurerId: row.insurer_id,
    treatmentCost: row.treatment_cost === null ? null : Number(row.treatment_cost),
    approvedAmount: row.approved_amount === null ? null : Number(row.approved_amount),
    claimedAmount: row.claimed_amount === null ? null : Number(row.claimed_amount),
    settlementAmount: row.settlement_amount === null ? null : Number(row.settlement_amount),
    claimDate: row.claim_date,
    status: row.status,
    reviewer: row.reviewer,
    remarks: row.remarks,
  };
}

async function getHistory(id) {
  const [rows] = await pool.query('SELECT * FROM claim_status_history WHERE claim_id = ? ORDER BY at ASC, id ASC', [id]);
  return rows.map((r) => ({ status: r.status, at: r.at, by: r.by_name, note: r.note }));
}

async function addHistory(id, status, by, note) {
  await pool.query('INSERT INTO claim_status_history (claim_id, status, by_name, note) VALUES (?,?,?,?)', [id, status, by, note || '']);
  await pool.query('UPDATE claims SET status = ? WHERE id = ?', [status, id]);
}

async function findOrThrow(id) {
  const [rows] = await pool.query('SELECT * FROM claims WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Claim not found.');
  return rows[0];
}

async function notifyPatientAndHospital(row, title, message) {
  const [patientUsers] = await pool.query('SELECT u.id FROM users u JOIN patients p ON p.user_id = u.id WHERE p.id = ?', [row.patient_id]);
  const [hospitalUsers] = await pool.query('SELECT id FROM users WHERE role = "HOSPITAL" AND linked_id = ?', [row.hospital_id]);
  const targets = [...patientUsers, ...hospitalUsers];
  await Promise.all(targets.map((u) => createNotification({ userId: u.id, type: 'CLAIM_STATUS', title, message, relatedId: row.id })));
  socket.emit('claim:statusChanged', { id: row.id, status: row.status });
  socket.emitToPatient(row.patient_id, 'claim:statusChanged', { id: row.id, status: row.status });
}

const getAll = asyncHandler(async (req, res) => {
  const { hospitalId, insurerId, patientId, status } = req.query;
  const scope = scopeClauses(req.user, { patient: 'patient_id', hospital: 'hospital_id', insurer: 'insurer_id' });
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  if (hospitalId) { clauses.push('hospital_id = ?'); params.push(hospitalId); }
  if (insurerId) { clauses.push('insurer_id = ?'); params.push(insurerId); }
  if (patientId) { clauses.push('patient_id = ?'); params.push(patientId); }
  if (status) { clauses.push('status = ?'); params.push(status); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM claims ${where} ORDER BY claim_date DESC`, params);
  res.json(rows.map(toClaim));
});

const getById = asyncHandler(async (req, res) => {
  const row = await findOrThrow(req.params.id);
  assertCanSeeRow(req.user, row, 'Claim not found.');
  res.json({ ...toClaim(row), statusHistory: await getHistory(row.id) });
});

const create = asyncHandler(async (req, res) => {
  const { preAuthorizationId, claimedAmount } = req.body;
  if (!preAuthorizationId) throw new ApiError(400, 'preAuthorizationId is required.');

  const [preAuthRows] = await pool.query('SELECT * FROM preauthorizations WHERE id = ?', [preAuthorizationId]);
  const preAuth = preAuthRows[0];
  if (!preAuth) throw new ApiError(404, 'Linked pre-authorization not found.');
  if (!['APPROVED', 'PARTIALLY_APPROVED'].includes(preAuth.status)) {
    throw new ApiError(400, 'A claim can only be created for an approved or partially approved pre-authorization.');
  }

  const id = await nextId(pool, 'CLM', 'claims');
  const finalClaimedAmount = claimedAmount ?? preAuth.approved_amount;

  await pool.query(
    `INSERT INTO claims (id, preauthorization_id, patient_id, hospital_id, insurer_id, treatment_cost, approved_amount, claimed_amount, status)
     VALUES (?,?,?,?,?,?,?,?,'CLAIM_SUBMITTED')`,
    [id, preAuthorizationId, preAuth.patient_id, preAuth.hospital_id, preAuth.insurer_id, preAuth.estimated_cost, preAuth.approved_amount, finalClaimedAmount]
  );
  await pool.query('INSERT INTO claim_status_history (claim_id, status, by_name, note) VALUES (?,?,?,?)', [id, 'CLAIM_SUBMITTED', req.user.name, 'Claim submitted.']);
  await addAuditLog(pool, { entityType: 'CLAIM', entityId: id, action: 'CLAIM_SUBMITTED', by: req.user.name, details: 'Claim submitted.' });

  const row = await findOrThrow(id);
  await notifyPatientAndHospital(row, 'Claim submitted', `Claim ${id} was submitted for ${preAuthorizationId}.`);

  const [insurerUsers] = await pool.query('SELECT id FROM users WHERE role = "INSURER" AND linked_id = ?', [row.insurer_id]);
  await Promise.all(
    insurerUsers.map((u) => createNotification({ userId: u.id, type: 'CLAIM_SUBMITTED', title: 'New claim submitted', message: `${id} needs verification.`, relatedId: id }))
  );

  res.status(201).json({ ...toClaim(row), statusHistory: await getHistory(id) });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const row = await findOrThrow(id);
  const claimedAmount = req.body.claimedAmount ?? row.claimed_amount;
  await pool.query('UPDATE claims SET claimed_amount = ? WHERE id = ?', [claimedAmount, id]);
  const updated = await findOrThrow(id);
  res.json({ ...toClaim(updated), statusHistory: await getHistory(id) });
});

const verify = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  const claimRow = await findOrThrow(id);
  if (claimRow.status !== 'CLAIM_SUBMITTED') throw new ApiError(400, 'Only a newly submitted claim can be sent for verification.');
  const [bills] = await pool.query("SELECT id FROM documents WHERE claim_id = ? AND type = 'HOSPITAL_BILL' LIMIT 1", [id]);
  if (!bills.length) throw new ApiError(400, 'The hospital has not uploaded the Hospital Bill for this claim yet.');
  const by = req.user.name;
  await pool.query('UPDATE claims SET reviewer = ? WHERE id = ?', [by, id]);
  await addHistory(id, 'UNDER_VERIFICATION', by, remarks || 'Verification in progress.');
  await addAuditLog(pool, { entityType: 'CLAIM', entityId: id, action: 'UNDER_VERIFICATION', by, details: remarks || 'Verification in progress.' });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Claim under verification', `${id} is being verified.`);
  res.json({ ...toClaim(updated), statusHistory: await getHistory(id) });
});

const approve = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  await findOrThrow(id);
  const by = req.user.name;
  await pool.query('UPDATE claims SET reviewer = ? WHERE id = ?', [by, id]);
  await addHistory(id, 'APPROVED', by, remarks || 'Claim approved.');
  await addAuditLog(pool, { entityType: 'CLAIM', entityId: id, action: 'APPROVED', by, details: remarks || 'Claim approved.' });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Claim approved', `${id} was approved and is pending settlement.`);
  res.json({ ...toClaim(updated), statusHistory: await getHistory(id) });
});

const reject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  await findOrThrow(id);
  const by = req.user.name;
  await pool.query('UPDATE claims SET reviewer = ? WHERE id = ?', [by, id]);
  await addHistory(id, 'REJECTED', by, remarks || 'Claim rejected.');
  await addAuditLog(pool, { entityType: 'CLAIM', entityId: id, action: 'REJECTED', by, details: remarks || 'Claim rejected.' });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Claim rejected', `${id} was rejected. See remarks for details.`);
  res.json({ ...toClaim(updated), statusHistory: await getHistory(id) });
});

const settle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { settlementAmount } = req.body;
  if (settlementAmount === undefined) throw new ApiError(400, 'settlementAmount is required.');

  await findOrThrow(id);
  const by = req.user.name;
  await pool.query('UPDATE claims SET settlement_amount = ?, reviewer = ? WHERE id = ?', [settlementAmount, by, id]);
  await addHistory(id, 'SETTLEMENT_PROCESSED', by, `Settlement of Rs.${settlementAmount} initiated.`);
  await addHistory(id, 'SETTLED', by, 'Settlement confirmed.');
  await addAuditLog(pool, { entityType: 'CLAIM', entityId: id, action: 'SETTLED', by, details: `Settled at Rs.${settlementAmount}.` });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Claim settled', `${id} has been settled for Rs.${Number(settlementAmount).toLocaleString('en-IN')}.`);
  res.json({ ...toClaim(updated), statusHistory: await getHistory(id) });
});

module.exports = { getAll, getById, create, update, verify, approve, reject, settle, toClaim };
