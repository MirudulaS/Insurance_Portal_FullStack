const bcrypt = require('bcryptjs');
const { ApiError, nextId } = require('./helpers');

const MIN_PASSWORD_LENGTH = 6;

// Creates a personal login for ONE patient record and links the two:
//   users.linked_id = patients.id   and   patients.user_id = users.id
// Each patient therefore gets their own email + password and can only ever
// see their own data. Pass a connection to run inside a transaction.
async function createPatientAccount(db, patient, { email, password, phone }) {
  const loginEmail = (email || '').trim().toLowerCase();
  if (!loginEmail) throw new ApiError(400, 'An email address is required for the patient login.');
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (patient.user_id) throw new ApiError(409, 'This patient already has a login.');

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [loginEmail]);
  if (existing.length > 0) throw new ApiError(409, 'An account with this email already exists.');

  const id = await nextId(db, 'USR', 'users');
  const passwordHash = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO users (id, name, email, password_hash, role, linked_id, phone, avatar_color) VALUES (?,?,?,?,?,?,?,?)',
    [id, patient.name, loginEmail, passwordHash, 'PATIENT', patient.id, phone || patient.phone || null, '#1F4E5F']
  );
  await db.query('UPDATE patients SET user_id = ?, email = COALESCE(email, ?) WHERE id = ?', [id, loginEmail, patient.id]);
  return id;
}

module.exports = { createPatientAccount, MIN_PASSWORD_LENGTH };
