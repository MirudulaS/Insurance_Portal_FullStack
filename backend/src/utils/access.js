const pool = require('../db/pool');
const { ApiError } = require('./helpers');

// Central place for "may this logged-in user see this record?".
//
// Every login belongs to exactly one record (users.linked_id):
//   PATIENT  -> one patient   (PAT-xxxx)  - sees ONLY that patient's data
//   HOSPITAL -> one hospital  (HOS-xxxx)  - sees only its own patients/requests
//   INSURER  -> one insurer   (INR-xxxx)  - sees only requests addressed to it
//   ADMIN    -> everything
//
// The frontend also filters, but the filters below are what actually protect
// the data: they are applied on the server and cannot be bypassed by editing
// a query string or calling the API directly.

// Columns to force into a list query's WHERE clause for this user.
// Returns { clauses, params } to be AND-ed with whatever the caller built.
function scopeClauses(user, { patient, hospital, insurer }) {
  const clauses = [];
  const params = [];
  if (user.role === 'ADMIN') return { clauses, params };
  const owner = {
    PATIENT: patient,
    HOSPITAL: hospital,
    INSURER: insurer,
  }[user.role];
  // A non-admin user with no linked record (or an unknown role) matches nothing.
  if (!owner || !user.linkedId) return { clauses: ['1 = 0'], params: [] };
  return { clauses: [`${owner} = ?`], params: [user.linkedId] };
}

// Does this user own / participate in a row that has patient_id, hospital_id, insurer_id?
function canSeeRow(user, row) {
  if (user.role === 'ADMIN') return true;
  if (!user.linkedId) return false;
  if (user.role === 'PATIENT') return row.patient_id === user.linkedId;
  if (user.role === 'HOSPITAL') return row.hospital_id === user.linkedId;
  if (user.role === 'INSURER') return row.insurer_id === user.linkedId;
  return false;
}

// Throws 404 (not 403) so a patient can't even confirm that another
// patient's record id exists.
function assertCanSeeRow(user, row, notFoundMessage) {
  if (!row || !canSeeRow(user, row)) throw new ApiError(404, notFoundMessage);
}

async function assertCanSeePreauth(user, preauthId, notFoundMessage = 'Pre-authorization request not found.') {
  const [rows] = await pool.query('SELECT * FROM preauthorizations WHERE id = ?', [preauthId]);
  assertCanSeeRow(user, rows[0], notFoundMessage);
  return rows[0];
}

async function assertCanSeeClaim(user, claimId, notFoundMessage = 'Claim not found.') {
  const [rows] = await pool.query('SELECT * FROM claims WHERE id = ?', [claimId]);
  assertCanSeeRow(user, rows[0], notFoundMessage);
  return rows[0];
}

module.exports = { scopeClauses, canSeeRow, assertCanSeeRow, assertCanSeePreauth, assertCanSeeClaim };
