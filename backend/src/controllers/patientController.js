const pool = require('../db/pool');
const { asyncHandler, ApiError, nextId } = require('../utils/helpers');
const { createPatientAccount } = require('../utils/patientAccount');

function toPatient(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    address: row.address,
    policyNumber: row.policy_number,
    insurerId: row.insurer_id,
    primaryHospitalId: row.primary_hospital_id,
    bloodGroup: row.blood_group,
    hasLogin: !!row.user_id,
  };
}

const getAll = asyncHandler(async (req, res) => {
  const { hospitalId, search } = req.query;
  const clauses = [];
  const params = [];

  // Server-side scope: a patient login can only ever list their own record.
  if (req.user.role === 'PATIENT') {
    clauses.push('id = ?');
    params.push(req.user.linkedId || '');
  } else if (req.user.role === 'HOSPITAL') {
    clauses.push('primary_hospital_id = ?');
    params.push(req.user.linkedId || '');
  } else if (req.user.role === 'INSURER') {
    clauses.push('id IN (SELECT patient_id FROM preauthorizations WHERE insurer_id = ?)');
    params.push(req.user.linkedId || '');
  }

  if (hospitalId) {
    clauses.push('primary_hospital_id = ?');
    params.push(hospitalId);
  }
  if (search) {
    clauses.push('(name LIKE ? OR id LIKE ? OR policy_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM patients ${where} ORDER BY name`, params);
  res.json(rows.map(toPatient));
});

async function canViewPatient(user, patient) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'PATIENT') return patient.id === user.linkedId;
  if (user.role === 'HOSPITAL') return patient.primary_hospital_id === user.linkedId;
  if (user.role === 'INSURER') {
    const [pa] = await pool.query('SELECT id FROM preauthorizations WHERE patient_id = ? AND insurer_id = ? LIMIT 1', [patient.id, user.linkedId]);
    return pa.length > 0;
  }
  return false;
}

const getById = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  // 404 (not 403) so one patient can't probe which other patient ids exist.
  if (!rows[0] || !(await canViewPatient(req.user, rows[0]))) throw new ApiError(404, 'Patient not found.');
  res.json(toPatient(rows[0]));
});

// A hospital can register a patient AND (optionally, in the same step) give
// that patient their own login by sending loginEmail + loginPassword.
const create = asyncHandler(async (req, res) => {
  const { name, age, gender, phone, email, address, policyNumber, insurerId, bloodGroup, loginEmail, loginPassword } = req.body;
  if (!name) throw new ApiError(400, 'Patient name is required.');
  // A hospital user can only register patients under their own hospital.
  const primaryHospitalId = req.user.role === 'HOSPITAL' ? req.user.linkedId : req.body.primaryHospitalId;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = await nextId(conn, 'PAT', 'patients');
    await conn.query(
      `INSERT INTO patients (id, user_id, name, age, gender, phone, email, address, policy_number, insurer_id, primary_hospital_id, blood_group)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, null, name, age, gender, phone, email, address, policyNumber, insurerId, primaryHospitalId, bloodGroup]
    );
    if (loginEmail || loginPassword) {
      await createPatientAccount(conn, { id, name, phone, user_id: null }, { email: loginEmail || email, password: loginPassword, phone });
    }
    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);
    res.status(201).json(toPatient(rows[0]));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// Give an existing patient their own login (hospital: own patients only; admin: any).
const createAccount = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  const patient = rows[0];
  if (!patient || (req.user.role === 'HOSPITAL' && patient.primary_hospital_id !== req.user.linkedId)) {
    throw new ApiError(404, 'Patient not found.');
  }
  const { email, password } = req.body;
  await createPatientAccount(pool, patient, { email: email || patient.email, password, phone: patient.phone });
  const [updated] = await pool.query('SELECT * FROM patients WHERE id = ?', [patient.id]);
  res.status(201).json(toPatient(updated[0]));
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [existing] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);
  if (!existing[0]) throw new ApiError(404, 'Patient not found.');
  if (req.user.role === 'HOSPITAL' && existing[0].primary_hospital_id !== req.user.linkedId) {
    throw new ApiError(404, 'Patient not found.');
  }

  const fields = {
    name: req.body.name ?? existing[0].name,
    age: req.body.age ?? existing[0].age,
    gender: req.body.gender ?? existing[0].gender,
    phone: req.body.phone ?? existing[0].phone,
    email: req.body.email ?? existing[0].email,
    address: req.body.address ?? existing[0].address,
    policy_number: req.body.policyNumber ?? existing[0].policy_number,
    insurer_id: req.body.insurerId ?? existing[0].insurer_id,
    primary_hospital_id: req.body.primaryHospitalId ?? existing[0].primary_hospital_id,
    blood_group: req.body.bloodGroup ?? existing[0].blood_group,
  };

  await pool.query(
    `UPDATE patients SET name=?, age=?, gender=?, phone=?, email=?, address=?, policy_number=?, insurer_id=?, primary_hospital_id=?, blood_group=? WHERE id=?`,
    [...Object.values(fields), id]
  );

  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);
  res.json(toPatient(rows[0]));
});

module.exports = { getAll, getById, create, createAccount, update, toPatient };
