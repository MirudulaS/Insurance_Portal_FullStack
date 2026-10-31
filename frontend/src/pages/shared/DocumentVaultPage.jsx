import { useState } from 'react';
import { Archive, Eye, FileText, Trash2, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import patientService from '../../services/patientService';
import patientDocumentService from '../../services/patientDocumentService';
import { ROLES, VAULT_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../../config';
import { formatDate, formatDateTime, fileHref } from '../../utils/format';
import { formatFileSize } from '../../utils/fileValidation';
import PageHeader from '../../components/common/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import FormField, { Select, TextInput } from '../../components/forms/FormField';
import FileUpload from '../../components/documents/FileUpload';

const DESCRIPTIONS = {
  GOVERNMENT_ID: 'Aadhaar, voter ID, passport or driving licence.',
  INSURANCE_CARD: 'The health insurance card issued by the insurer.',
  POLICY_DOCUMENT: 'The policy schedule / terms of the insurance policy.',
};

function isExpired(doc) {
  return !!doc?.expiryDate && String(doc.expiryDate).slice(0, 10) < new Date().toISOString().slice(0, 10);
}

/**
 * Patient Document Vault.
 * Documents stored here are reused automatically by every new
 * pre-authorization for the same patient. Used by:
 *  - PATIENT: manages their own vault
 *  - HOSPITAL: manages the vault of any patient registered at their hospital
 */
export default function DocumentVaultPage() {
  const { user } = useAuth();
  const isHospital = user.role === ROLES.HOSPITAL;

  const { data: patients, loading: patientsLoading, error: patientsError } = useAsync(
    () => (isHospital ? patientService.getAll({ hospitalId: user.linkedId }) : Promise.resolve([])),
    [user.id]
  );
  const [selectedPatientId, setSelectedPatientId] = useState('');
  // Hospital staff pick a patient (defaults to the first); a patient always sees their own vault.
  const patientId = isHospital ? selectedPatientId || patients?.[0]?.id || '' : user.linkedId;

  const { data: docs, loading, error, refetch } = useAsync(
    () => (patientId ? patientDocumentService.getAll(patientId) : Promise.resolve([])),
    [patientId]
  );

  const [uploadType, setUploadType] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState('');

  const closeUpload = () => {
    setUploadType(null);
    setExpiryDate('');
    setModalError('');
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setModalError('');
    try {
      await patientDocumentService.upload({ file, patientId, type: uploadType, expiryDate });
      await refetch();
      closeUpload();
    } catch (err) {
      setModalError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await patientDocumentService.remove(toDelete.id);
      await refetch();
      setToDelete(null);
    } catch (err) {
      setPageError(err.message || 'Unable to remove the document.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (isHospital && patientsLoading) return <LoadingState label="Loading patients…" />;
  if (isHospital && patientsError) return <ErrorState message={patientsError.message} />;
  if (isHospital && patients?.length === 0) {
    return <EmptyState icon={Archive} title="No patients yet." message="Patients registered at your hospital will appear here." />;
  }

  const byType = Object.fromEntries((docs || []).map((d) => [d.type, d]));
  const storedCount = VAULT_DOCUMENT_TYPES.filter((t) => byType[t] && !isExpired(byType[t])).length;

  return (
    <div>
      <PageHeader
        title="Patient Document Vault"
        description="Store these documents once. Every new pre-authorization reuses them automatically."
      />

      {isHospital && (
        <div className="mb-5 max-w-sm">
          <FormField label="Patient" htmlFor="vault-patient">
            <Select
              id="vault-patient"
              value={patientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              options={(patients || []).map((p) => ({ value: p.id, label: `${p.name} (${p.id})` }))}
            />
          </FormField>
        </div>
      )}

      <p className="mb-4 text-sm text-muted">
        {storedCount} of {VAULT_DOCUMENT_TYPES.length} documents valid and ready for reuse.
      </p>

      {pageError && (
        <p role="alert" className="mb-4 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {pageError}
        </p>
      )}

      {loading && <LoadingState label="Loading vault…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {VAULT_DOCUMENT_TYPES.map((type) => {
            const doc = byType[type];
            const expired = isExpired(doc);
            return (
              <div key={type} className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold text-ink">{DOCUMENT_TYPE_LABELS[type]}</h3>
                  {doc && !expired && (
                    <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" /> Stored
                    </span>
                  )}
                  {doc && expired && (
                    <span className="flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">
                      <AlertTriangle className="h-3 w-3" /> Expired
                    </span>
                  )}
                  {!doc && <span className="rounded-full bg-muted/10 px-2 py-0.5 text-xs font-semibold text-muted">Missing</span>}
                </div>
                <p className="mb-3 text-xs text-muted">{DESCRIPTIONS[type]}</p>

                {doc ? (
                  <div className="mb-4 flex-1 rounded-md bg-background p-3 text-xs text-muted">
                    <p className="flex items-center gap-1.5 text-sm text-ink">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      {doc.fileUrl ? (
                        <a href={fileHref(doc.fileUrl)} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                          {doc.fileName}
                        </a>
                      ) : (
                        <span className="truncate">{doc.fileName}</span>
                      )}
                    </p>
                    <p className="mt-1">
                      {formatFileSize(doc.fileSize)} · uploaded {formatDateTime(doc.uploadedAt)}
                    </p>
                    <p className={expired ? 'text-error' : ''}>{doc.expiryDate ? `Valid until ${formatDate(doc.expiryDate)}` : 'No expiry date'}</p>
                  </div>
                ) : (
                  <div className="mb-4 flex-1" />
                )}

                <div className="flex gap-2">
                  {doc &&
                    (doc.fileUrl ? (
                      <a
                        href={fileHref(doc.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </a>
                    ) : (
                      <button
                        disabled
                        title="No file is attached to this sample record. Upload a file to view it."
                        className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted opacity-60"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    ))}
                  <button
                    onClick={() => setUploadType(type)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                  >
                    <Upload className="h-4 w-4" />
                    {doc ? 'Replace' : 'Upload'}
                  </button>
                  {doc && (
                    <button
                      onClick={() => setToDelete(doc)}
                      aria-label={`Remove ${DOCUMENT_TYPE_LABELS[type]}`}
                      className="rounded-md border border-border px-3 py-2 text-error hover:bg-error/5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!uploadType} onClose={closeUpload} title={uploadType ? `${byType[uploadType] ? 'Replace' : 'Upload'} ${DOCUMENT_TYPE_LABELS[uploadType]}` : ''}>
        <div className="mb-4">
          <FormField label="Valid until (optional)" htmlFor="vault-expiry" hint="Leave empty if the document does not expire.">
            <TextInput id="vault-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </FormField>
        </div>
        <FileUpload onUpload={handleUpload} uploading={uploading} />
        {modalError && <p className="mt-2 text-sm text-error">{modalError}</p>}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        tone="error"
        title="Remove document?"
        message={toDelete ? `${DOCUMENT_TYPE_LABELS[toDelete.type]} will be removed from the vault. New requests will need it uploaded again.` : ''}
        confirmLabel="Remove"
      />
    </div>
  );
}
