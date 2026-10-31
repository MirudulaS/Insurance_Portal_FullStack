const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { asyncHandler, ApiError, nextId } = require('../utils/helpers');
const { uploadPath } = require('../middleware/upload');
const { VAULT_TYPES, LABELS } = require('../config/documentTypes');
const { docSummary } = require('../utils/readiness');

function toVaultDocument(row) {
  return { ...docSummary(row), patientId: row.patient_id, uploadedBy: row.uploaded_by };
}

// Who may touch a patient's vault?
//  PATIENT  - only their own record (read + write)
//  HOSPITAL - patients registered under their hospital (read + write)
//  INSURER  - read only, and only for patients with a request addressed to them
//  ADMIN    - everything
async function assertAccess(user, patientId, { write }) {
  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [patientId]);
  const patient = rows[0];
  if (!patient) throw new ApiError(404, 'Patient not found.');

  if (user.role === 'ADMIN') return patient;
  if (user.role === 'PATIENT' && user.linkedId === patientId) return patient;
  if (user.role === 'HOSPITAL' && patient.primary_hospital_id === user.linkedId) return patient;
  if (user.role === 'INSURER' && !write) {
    const [pa] = await pool.query('SELECT id FROM preauthorizations WHERE patient_id = ? AND insurer_id = ? LIMIT 1', [patientId, user.linkedId]);
    if (pa.length) return patient;
  }
  throw new ApiError(403, 'You do not have permission to access these documents.');
}

function removeFile(filePath) {
  if (!filePath) return;
  const full = path.join(uploadPath, filePath);
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

const getAll = asyncHandler(async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) throw new ApiError(400, 'patientId is required.');
  await assertAccess(req.user, patientId, { write: false });
  const [rows] = await pool.query('SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY type', [patientId]);
  res.json(rows.map(toVaultDocument));
});

// One document per type per patient: uploading again REPLACES the old copy.
const upload = asyncHandler(async (req, res) => {
  const { patientId, type, expiryDate } = req.body;
  if (!req.file) throw new ApiError(400, 'Please choose a file to upload.');

  const cleanup = () => removeFile(req.file.filename);
  try {
    if (!patientId) throw new ApiError(400, 'patientId is required.');
    if (!VAULT_TYPES.includes(type)) {
      throw new ApiError(400, `Vault documents must be one of: ${VAULT_TYPES.map((t) => LABELS[t]).join(', ')}.`);
    }
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw new ApiError(400, 'Expiry date must be in YYYY-MM-DD format.');
    await assertAccess(req.user, patientId, { write: true });

    const [existing] = await pool.query('SELECT * FROM patient_documents WHERE patient_id = ? AND type = ?', [patientId, type]);
    if (existing[0]) {
      removeFile(existing[0].file_path);
      await pool.query('DELETE FROM patient_documents WHERE id = ?', [existing[0].id]);
    }

    const id = await nextId(pool, 'PDOC', 'patient_documents');
    await pool.query(
      `INSERT INTO patient_documents (id, patient_id, type, file_name, file_size, mime_type, expiry_date, uploaded_by, file_path)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, patientId, type, req.file.originalname, req.file.size, req.file.mimetype, expiryDate || null, req.user.id, req.file.filename]
    );
    const [rows] = await pool.query('SELECT * FROM patient_documents WHERE id = ?', [id]);
    res.status(201).json(toVaultDocument(rows[0]));
  } catch (err) {
    cleanup();
    throw err;
  }
});

const remove = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM patient_documents WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Document not found.');
  await assertAccess(req.user, rows[0].patient_id, { write: true });
  removeFile(rows[0].file_path);
  await pool.query('DELETE FROM patient_documents WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

module.exports = { getAll, upload, remove };
