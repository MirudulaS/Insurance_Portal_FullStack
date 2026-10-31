const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const env = require('../config/env');
const { asyncHandler, ApiError, nextId } = require('../utils/helpers');
const { createPatientAccount, MIN_PASSWORD_LENGTH } = require('../utils/patientAccount');

function toSafeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    linkedId: row.linked_id,
    phone: row.phone,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, role: user.role, linkedId: user.linkedId }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
  const row = rows[0];
  if (!row) throw new ApiError(401, 'Invalid email or password.');

  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) throw new ApiError(401, 'Invalid email or password.');

  const user = toSafeUser(row);
  const token = signToken(user);
  res.json({ user, token });
});

// Public self-registration. Anyone signing up as a PATIENT gets their OWN
// patient record and their OWN login, linked together, so the account only
// ever sees that one patient's data. (Hospital / insurer / admin accounts are
// created by an administrator, not through the public form.)
const register = asyncHandler(async (req, res) => {
  const {
    name, email, password, phone,
    age, gender, address, policyNumber, insurerId, primaryHospitalId, bloodGroup,
  } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required.');
  if (password.length < MIN_PASSWORD_LENGTH) throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  const role = String(req.body.role || 'PATIENT').toUpperCase();
  if (role !== 'PATIENT') {
    throw new ApiError(403, 'Only patient accounts can be self-registered. Hospital, insurer and admin accounts are created by an administrator.');
  }

  const loginEmail = String(email).trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [loginEmail]);
  if (existing.length > 0) throw new ApiError(409, 'An account with this email already exists.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const patientId = await nextId(conn, 'PAT', 'patients');
    await conn.query(
      `INSERT INTO patients (id, user_id, name, age, gender, phone, email, address, policy_number, insurer_id, primary_hospital_id, blood_group)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [patientId, null, name, age || null, gender || null, phone || null, loginEmail, address || null,
        policyNumber || null, insurerId || null, primaryHospitalId || null, bloodGroup || null]
    );
    const userId = await createPatientAccount(conn, { id: patientId, name, phone, user_id: null }, { email: loginEmail, password, phone });

    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.status(201).json(toSafeUser(rows[0]));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// Lets a logged-in user (e.g. a patient given a temporary password by the
// hospital) set a password only they know.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current and new password are required.');
  if (newPassword.length < MIN_PASSWORD_LENGTH) throw new ApiError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) throw new ApiError(401, 'Not authenticated.');
  const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!matches) throw new ApiError(400, 'Current password is incorrect.');

  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), req.user.id]);
  res.status(204).send();
});

// Public: hospital + insurer names for the registration form's dropdowns.
const organizations = asyncHandler(async (req, res) => {
  const [hospitals] = await pool.query('SELECT id, name, city FROM hospitals ORDER BY name');
  const [insurers] = await pool.query('SELECT id, name FROM insurers ORDER BY name');
  res.json({ hospitals, insurers });
});

const logout = asyncHandler(async (req, res) => {
  // Stateless JWT: nothing to invalidate server-side without a token
  // blocklist. Left as a no-op endpoint so the frontend's call succeeds.
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) throw new ApiError(401, 'Not authenticated.');
  res.json(toSafeUser(rows[0]));
});

module.exports = { login, register, logout, me, changePassword, organizations, toSafeUser };
