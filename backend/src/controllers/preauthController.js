const pool = require('../db/pool');
const { asyncHandler, ApiError, nextId, addAuditLog } = require('../utils/helpers');
const { createNotification } = require('./notificationController');
const socket = require('../sockets');
const { getReadiness } = require('../utils/readiness');
const { scopeClauses, assertCanSeeRow } = require('../utils/access');

function toPreAuth(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    hospitalId: row.hospital_id,
    insurerId: row.insurer_id,
    policyNumber: row.policy_number,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    doctor: row.doctor,
    estimatedCost: row.estimated_cost === null ? null : Number(row.estimated_cost),
    admissionDate: row.admission_date,
    expectedDischargeDate: row.expected_discharge_date,
    status: row.status,
    approvedAmount: row.approved_amount === null ? null : Number(row.approved_amount),
    reviewer: row.reviewer,
    remarks: row.remarks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getHistory(id) {
  const [rows] = await pool.query('SELECT * FROM preauth_status_history WHERE preauth_id = ? ORDER BY at ASC, id ASC', [id]);
  return rows.map((r) => ({ status: r.status, at: r.at, by: r.by_name, note: r.note }));
}

async function addHistory(id, status, by, note) {
  await pool.query('INSERT INTO preauth_status_history (preauth_id, status, by_name, note) VALUES (?,?,?,?)', [id, status, by, note || '']);
  await pool.query('UPDATE preauthorizations SET status = ? WHERE id = ?', [status, id]);
}

async function findOrThrow(id) {
  const [rows] = await pool.query('SELECT * FROM preauthorizations WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Pre-authorization request not found.');
  return rows[0];
}

async function notifyPatientAndHospital(row, title, message) {
  const [patientUsers] = await pool.query('SELECT u.id FROM users u JOIN patients p ON p.user_id = u.id WHERE p.id = ?', [row.patient_id]);
  const [hospitalUsers] = await pool.query('SELECT id FROM users WHERE role = "HOSPITAL" AND linked_id = ?', [row.hospital_id]);
  const targets = [...patientUsers, ...hospitalUsers];
  await Promise.all(targets.map((u) => createNotification({ userId: u.id, type: 'PREAUTH_STATUS', title, message, relatedId: row.id })));
  socket.emit('preauthorization:statusChanged', { id: row.id, status: row.status });
  socket.emitToPatient(row.patient_id, 'preauthorization:statusChanged', { id: row.id, status: row.status });
}

const getAll = asyncHandler(async (req, res) => {
  const { hospitalId, insurerId, patientId, status, search } = req.query;
  // Forced server-side scope first: a patient login only ever gets its own rows,
  // whatever filters the client sends.
  const scope = scopeClauses(req.user, { patient: 'patient_id', hospital: 'hospital_id', insurer: 'insurer_id' });
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  if (hospitalId) { clauses.push('hospital_id = ?'); params.push(hospitalId); }
  if (insurerId) { clauses.push('insurer_id = ?'); params.push(insurerId); }
  if (patientId) { clauses.push('patient_id = ?'); params.push(patientId); }
  if (status) { clauses.push('status = ?'); params.push(status); }
  if (search) { clauses.push('(id LIKE ? OR diagnosis LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM preauthorizations ${where} ORDER BY updated_at DESC`, params);
  res.json(rows.map(toPreAuth));
});

const getById = asyncHandler(async (req, res) => {
  const row = await findOrThrow(req.params.id);
  assertCanSeeRow(req.user, row, 'Pre-authorization request not found.');
  const statusHistory = await getHistory(row.id);
  res.json({ ...toPreAuth(row), statusHistory });
});

const create = asyncHandler(async (req, res) => {
  const { patientId, hospitalId, insurerId, policyNumber, diagnosis, treatment, doctor, estimatedCost, admissionDate, expectedDischargeDate } = req.body;
  if (!patientId || !hospitalId || !insurerId) throw new ApiError(400, 'patientId, hospitalId and insurerId are required.');

  const id = await nextId(pool, 'PA', 'preauthorizations');
  await pool.query(
    `INSERT INTO preauthorizations (id, patient_id, hospital_id, insurer_id, policy_number, diagnosis, treatment, doctor, estimated_cost, admission_date, expected_discharge_date, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'DRAFT')`,
    [id, patientId, hospitalId, insurerId, policyNumber, diagnosis, treatment, doctor, estimatedCost, admissionDate, expectedDischargeDate]
  );
  await pool.query('INSERT INTO preauth_status_history (preauth_id, status, by_name, note) VALUES (?,?,?,?)', [
    id,
    'DRAFT',
    req.user.name,
    'Draft created.',
  ]);
  await addAuditLog(pool, { entityType: 'PREAUTHORIZATION', entityId: id, action: 'DRAFT_CREATED', by: req.user.name, details: 'Draft created.' });

  const row = await findOrThrow(id);
  res.status(201).json({ ...toPreAuth(row), statusHistory: await getHistory(id) });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const row = await findOrThrow(id);
  if (row.status !== 'DRAFT') throw new ApiError(400, 'Only draft requests can be edited.');

  const fields = {
    diagnosis: req.body.diagnosis ?? row.diagnosis,
    treatment: req.body.treatment ?? row.treatment,
    doctor: req.body.doctor ?? row.doctor,
    estimated_cost: req.body.estimatedCost ?? row.estimated_cost,
    admission_date: req.body.admissionDate ?? row.admission_date,
    expected_discharge_date: req.body.expectedDischargeDate ?? row.expected_discharge_date,
  };
  await pool.query(
    'UPDATE preauthorizations SET diagnosis=?, treatment=?, doctor=?, estimated_cost=?, admission_date=?, expected_discharge_date=? WHERE id=?',
    [...Object.values(fields), id]
  );

  const updated = await findOrThrow(id);
  res.json({ ...toPreAuth(updated), statusHistory: await getHistory(id) });
});

const readiness = asyncHandler(async (req, res) => {
  await findOrThrow(req.params.id).then((row) => assertCanSeeRow(req.user, row, 'Pre-authorization request not found.'));
  const result = await getReadiness(req.params.id);
  if (!result) throw new ApiError(404, 'Pre-authorization request not found.');
  res.json(result);
});

const submit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const row = await findOrThrow(id);
  const by = req.user.name;

  if (!['DRAFT', 'QUERY_RAISED'].includes(row.status)) {
    throw new ApiError(400, 'Only a draft, or a request with an open query, can be submitted.');
  }
  if (req.user.role !== 'ADMIN' && row.hospital_id !== req.user.linkedId) {
    throw new ApiError(403, 'This request belongs to another hospital.');
  }

  // Server-side readiness check: the UI disables the button too, but this
  // is what actually guarantees an incomplete request never reaches the insurer.
  const check = await getReadiness(id);
  if (!check.ready) {
    throw new ApiError(400, `Cannot submit yet. Missing: ${check.missing.join(', ')}.`);
  }

  const targetStatus = row.status === 'QUERY_RAISED' ? 'RESUBMITTED' : 'SUBMITTED';
  await addHistory(id, targetStatus, by, 'Submitted for insurer review.');
  await addHistory(id, 'UNDER_REVIEW', by, 'Assigned for insurer review.');
  await addAuditLog(pool, { entityType: 'PREAUTHORIZATION', entityId: id, action: targetStatus, by, details: 'Submitted for review.' });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Request submitted', `${id} was submitted and is now under review.`);

  const [insurerUsers] = await pool.query('SELECT id FROM users WHERE role = "INSURER" AND linked_id = ?', [updated.insurer_id]);
  await Promise.all(
    insurerUsers.map((u) => createNotification({ userId: u.id, type: 'PREAUTH_SUBMITTED', title: 'New request submitted', message: `${id} needs your review.`, relatedId: id }))
  );

  res.json({ ...toPreAuth(updated), statusHistory: await getHistory(id) });
});

const approve = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedAmount, remarks } = req.body;
  if (approvedAmount === undefined) throw new ApiError(400, 'approvedAmount is required.');

  await findOrThrow(id);
  const by = req.user.name;
  await pool.query('UPDATE preauthorizations SET approved_amount=?, remarks=?, reviewer=? WHERE id=?', [approvedAmount, remarks || '', by, id]);
  await addHistory(id, 'APPROVED', by, remarks || `Approved at Rs.${approvedAmount}.`);
  await addAuditLog(pool, { entityType: 'PREAUTHORIZATION', entityId: id, action: 'APPROVED', by, details: remarks || `Approved at Rs.${approvedAmount}.` });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Pre-authorization approved', `${id} was approved for Rs.${Number(approvedAmount).toLocaleString('en-IN')}.`);
  res.json({ ...toPreAuth(updated), statusHistory: await getHistory(id) });
});

const partialApprove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedAmount, remarks } = req.body;
  if (approvedAmount === undefined) throw new ApiError(400, 'approvedAmount is required.');

  await findOrThrow(id);
  const by = req.user.name;
  await pool.query('UPDATE preauthorizations SET approved_amount=?, remarks=?, reviewer=? WHERE id=?', [approvedAmount, remarks || '', by, id]);
  await addHistory(id, 'PARTIALLY_APPROVED', by, remarks || `Partially approved at Rs.${approvedAmount}.`);
  await addAuditLog(pool, { entityType: 'PREAUTHORIZATION', entityId: id, action: 'PARTIALLY_APPROVED', by, details: remarks || `Partially approved at Rs.${approvedAmount}.` });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Pre-authorization partially approved', `${id} was partially approved for Rs.${Number(approvedAmount).toLocaleString('en-IN')}.`);
  res.json({ ...toPreAuth(updated), statusHistory: await getHistory(id) });
});

const reject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;

  await findOrThrow(id);
  const by = req.user.name;
  await pool.query('UPDATE preauthorizations SET remarks=?, reviewer=? WHERE id=?', [remarks || '', by, id]);
  await addHistory(id, 'REJECTED', by, remarks || 'Rejected.');
  await addAuditLog(pool, { entityType: 'PREAUTHORIZATION', entityId: id, action: 'REJECTED', by, details: remarks || 'Rejected.' });

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Pre-authorization rejected', `${id} was rejected. See remarks for details.`);
  res.json({ ...toPreAuth(updated), statusHistory: await getHistory(id) });
});

const raiseQuery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;
  if (!question) throw new ApiError(400, 'A question is required to raise a query.');

  const row = await findOrThrow(id);
  const by = req.user.name;
  await pool.query('UPDATE preauthorizations SET reviewer=? WHERE id=?', [by, id]);
  await addHistory(id, 'QUERY_RAISED', by, question);
  await addAuditLog(pool, { entityType: 'PREAUTHORIZATION', entityId: id, action: 'QUERY_RAISED', by, details: question });

  const queryId = await nextId(pool, 'QRY', 'queries');
  await pool.query('INSERT INTO queries (id, preauthorization_id, question, raised_by, raised_by_role, status) VALUES (?,?,?,?,?,"OPEN")', [
    queryId,
    id,
    question,
    by,
    'INSURER',
  ]);
  await pool.query('INSERT INTO query_messages (query_id, from_name, role, text, attachments) VALUES (?,?,?,?,JSON_ARRAY())', [queryId, by, 'INSURER', question]);

  const [queryRows] = await pool.query('SELECT * FROM queries WHERE id = ?', [queryId]);
  const [messageRows] = await pool.query('SELECT * FROM query_messages WHERE query_id = ? ORDER BY at ASC', [queryId]);
  const query = {
    id: queryRows[0].id,
    preAuthorizationId: queryRows[0].preauthorization_id,
    question: queryRows[0].question,
    raisedBy: queryRows[0].raised_by,
    raisedByRole: queryRows[0].raised_by_role,
    raisedDate: queryRows[0].raised_date,
    status: queryRows[0].status,
    messages: messageRows.map((m) => ({ id: m.id, from: m.from_name, role: m.role, text: m.text, attachments: m.attachments || [], at: m.at })),
  };
  socket.emitToParties({ patientId: row.patient_id, hospitalId: row.hospital_id, insurerId: row.insurer_id }, 'query:new', query);

  const updated = await findOrThrow(id);
  await notifyPatientAndHospital(updated, 'Query raised', `Insurer raised a query on ${id}.`);

  res.status(201).json({ request: { ...toPreAuth(updated), statusHistory: await getHistory(id) }, query });
});

module.exports = { getAll, getById, create, update, readiness, submit, approve, partialApprove, reject, raiseQuery, toPreAuth };
