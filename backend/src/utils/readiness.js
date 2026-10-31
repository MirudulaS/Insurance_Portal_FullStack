const pool = require('../db/pool');
const { LABELS, VAULT_TYPES, PREAUTH_REQUIRED_TYPES } = require('../config/documentTypes');

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function docSummary(row, fileUrlPrefix = '/uploads/') {
  return {
    id: row.id,
    type: row.type,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    uploadedAt: row.uploaded_at,
    expiryDate: row.expiry_date || null,
    fileUrl: row.file_path ? `${fileUrlPrefix}${row.file_path}` : null,
  };
}

/**
 * Pre-Authorization Readiness Check.
 * Reads current data from MySQL and reports, item by item, whether the
 * request can be sent to the insurer. Used by GET /:id/readiness (for the
 * UI panel) AND by POST /:id/submit (so the rule cannot be bypassed).
 *
 * Vault documents are reused automatically: if the patient already has a
 * valid (non-expired) Government ID / Insurance Card / Policy Document,
 * nothing has to be uploaded again for this request.
 */
async function getReadiness(preAuthId) {
  const [paRows] = await pool.query('SELECT * FROM preauthorizations WHERE id = ?', [preAuthId]);
  const pa = paRows[0];
  if (!pa) return null;

  const [patientRows] = await pool.query('SELECT * FROM patients WHERE id = ?', [pa.patient_id]);
  const patient = patientRows[0] || {};
  const [vaultRows] = await pool.query('SELECT * FROM patient_documents WHERE patient_id = ?', [pa.patient_id]);
  const [requestDocRows] = await pool.query('SELECT * FROM documents WHERE preauthorization_id = ?', [preAuthId]);

  const items = [];

  // 1. Patient + insurance + treatment details
  const patientOk = ['name', 'age', 'gender', 'phone'].every((k) => !isBlank(patient[k]));
  items.push({ key: 'PATIENT_DETAILS', label: 'Patient details', group: 'DETAILS', satisfied: patientOk,
    hint: patientOk ? null : 'Name, age, gender and phone must be filled in on the patient record.' });

  const insuranceOk = !isBlank(pa.policy_number) && !isBlank(pa.insurer_id);
  items.push({ key: 'INSURANCE_DETAILS', label: 'Insurance details', group: 'DETAILS', satisfied: insuranceOk,
    hint: insuranceOk ? null : 'Policy number and insurer are required.' });

  const treatmentOk = ['diagnosis', 'treatment', 'doctor', 'estimated_cost', 'admission_date', 'expected_discharge_date'].every((k) => !isBlank(pa[k]));
  items.push({ key: 'TREATMENT_DETAILS', label: 'Treatment details', group: 'DETAILS', satisfied: treatmentOk,
    hint: treatmentOk ? null : 'Diagnosis, treatment, doctor, cost and dates are required.' });

  // 2. Reusable documents from the Patient Document Vault
  const today = todayString();
  for (const type of VAULT_TYPES) {
    const row = vaultRows.find((r) => r.type === type);
    const expired = !!(row && row.expiry_date && String(row.expiry_date).slice(0, 10) < today);
    items.push({
      key: type, label: LABELS[type], group: 'VAULT',
      satisfied: !!row && !expired, expired,
      document: row ? docSummary(row) : null,
      hint: !row ? 'Not in the patient\'s Document Vault yet.' : expired ? 'Expired - upload a current copy to the vault.' : null,
    });
  }

  // 3. Documents specific to this treatment
  for (const type of PREAUTH_REQUIRED_TYPES) {
    const row = requestDocRows.find((r) => r.type === type);
    items.push({
      key: type, label: LABELS[type], group: 'REQUEST',
      satisfied: !!row, expired: false,
      document: row ? docSummary(row) : null,
      hint: row ? null : 'Upload for this request.',
    });
  }

  const missing = items.filter((i) => !i.satisfied).map((i) => i.label);
  return {
    preAuthorizationId: preAuthId,
    status: pa.status,
    patientId: pa.patient_id,
    ready: missing.length === 0,
    items,
    missing,
    additionalDocuments: requestDocRows.filter((r) => r.type === 'ADDITIONAL_DOCUMENT').map((r) => docSummary(r)),
  };
}

module.exports = { getReadiness, docSummary };
