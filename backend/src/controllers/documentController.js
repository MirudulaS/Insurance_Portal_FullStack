const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { asyncHandler, ApiError, nextId } = require('../utils/helpers');
const { uploadPath } = require('../middleware/upload');
const { canSeeRow } = require('../utils/access');
const { PREAUTH_UPLOAD_TYPES, CLAIM_UPLOAD_TYPES, LABELS } = require('../config/documentTypes');

function toDocument(row) {
  return {
    id: row.id,
    preAuthorizationId: row.preauthorization_id,
    claimId: row.claim_id,
    type: row.type,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    fileUrl: row.file_path ? `/uploads/${row.file_path}` : null,
  };
}

// Can this user see the request/claim a document hangs off?
async function canSeeDocument(user, doc) {
  if (user.role === 'ADMIN') return true;
  let parent = null;
  if (doc.preauthorization_id) {
    [[parent]] = await pool.query('SELECT * FROM preauthorizations WHERE id = ?', [doc.preauthorization_id]);
  } else if (doc.claim_id) {
    [[parent]] = await pool.query('SELECT * FROM claims WHERE id = ?', [doc.claim_id]);
  }
  return !!parent && canSeeRow(user, parent);
}

const getAll = asyncHandler(async (req, res) => {
  const { preAuthorizationId, claimId } = req.query;
  const clauses = [];
  const params = [];
  if (preAuthorizationId) {
    clauses.push('preauthorization_id = ?');
    params.push(preAuthorizationId);
  }
  if (claimId) {
    clauses.push('claim_id = ?');
    params.push(claimId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM documents ${where} ORDER BY uploaded_at DESC`, params);
  // Keep only documents on requests/claims this user belongs to.
  const visible = [];
  for (const row of rows) if (await canSeeDocument(req.user, row)) visible.push(row);
  res.json(visible.map(toDocument));
});

const getById = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!rows[0] || !(await canSeeDocument(req.user, rows[0]))) throw new ApiError(404, 'Document not found.');
  res.json(toDocument(rows[0]));
});

// Note: type-presence validation only (which document TYPES exist for a
// request) - no OCR or content inspection, per project scope. That check
// itself lives client-side (DocumentChecklist) and can be mirrored here if
// you want server-side enforcement before allowing /submit.
const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please choose a file to upload.');
  const discard = () => {
    const full = path.join(uploadPath, req.file.filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  };

  try {
    const { type, preAuthorizationId, claimId } = req.body;
    if (!type) throw new ApiError(400, 'Document type is required.');
    if (!!preAuthorizationId === !!claimId) {
      throw new ApiError(400, 'Provide either preAuthorizationId or claimId (not both).');
    }

    if (preAuthorizationId) {
      if (!PREAUTH_UPLOAD_TYPES.includes(type)) {
        throw new ApiError(400, `${LABELS[type] || type} cannot be attached to a pre-authorization request. Government ID, Insurance Card and Policy Document go in the Patient Document Vault; Hospital Bill belongs to the claim.`);
      }
      const [rows] = await pool.query('SELECT * FROM preauthorizations WHERE id = ?', [preAuthorizationId]);
      const pa = rows[0];
      if (!pa) throw new ApiError(404, 'Pre-authorization request not found.');
      if (req.user.role !== 'ADMIN' && pa.hospital_id !== req.user.linkedId) throw new ApiError(403, 'This request belongs to another hospital.');
      if (!['DRAFT', 'QUERY_RAISED'].includes(pa.status)) {
        throw new ApiError(400, 'Documents can only be added while the request is a draft or has an open query.');
      }
      // one document per required type: a new upload replaces the old one
      if (type !== 'ADDITIONAL_DOCUMENT') {
        const [old] = await pool.query('SELECT * FROM documents WHERE preauthorization_id = ? AND type = ?', [preAuthorizationId, type]);
        for (const o of old) {
          if (o.file_path) {
            const f = path.join(uploadPath, o.file_path);
            if (fs.existsSync(f)) fs.unlinkSync(f);
          }
          await pool.query('DELETE FROM documents WHERE id = ?', [o.id]);
        }
      }
    } else {
      if (!CLAIM_UPLOAD_TYPES.includes(type)) {
        throw new ApiError(400, 'Only a Hospital Bill or Discharge Summary can be attached to a claim.');
      }
      const [rows] = await pool.query('SELECT * FROM claims WHERE id = ?', [claimId]);
      const claim = rows[0];
      if (!claim) throw new ApiError(404, 'Claim not found.');
      if (req.user.role !== 'ADMIN' && claim.hospital_id !== req.user.linkedId) throw new ApiError(403, 'This claim belongs to another hospital.');
      if (['SETTLED', 'REJECTED'].includes(claim.status)) throw new ApiError(400, 'Documents cannot be added to a closed claim.');
    }

    const id = await nextId(pool, 'DOC', 'documents');
    await pool.query(
      `INSERT INTO documents (id, preauthorization_id, claim_id, type, file_name, file_size, mime_type, uploaded_by, file_path)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, preAuthorizationId || null, claimId || null, type, req.file.originalname, req.file.size, req.file.mimetype, req.user.id, req.file.filename]
    );
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    res.status(201).json(toDocument(rows[0]));
  } catch (err) {
    discard();
    throw err;
  }
});

const remove = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Document not found.');

  if (rows[0].file_path) {
    const fullPath = path.join(uploadPath, rows[0].file_path);
    fs.existsSync(fullPath) && fs.unlinkSync(fullPath);
  }
  await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

module.exports = { getAll, getById, upload, remove, toDocument };
