import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ClipboardCheck, Banknote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import claimService from '../../services/claimService';
import patientService from '../../services/patientService';
import documentService from '../../services/documentService';
import { CLAIM_STATUS, ROLES, DOCUMENT_TYPE_LABELS } from '../../config';
import { formatCurrency, formatDate } from '../../utils/format';

import PageHeader from '../../components/common/PageHeader';
import Breadcrumb from '../../components/common/Breadcrumb';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import FormField, { TextArea, TextInput } from '../../components/forms/FormField';
import StatusTimeline from '../../components/preauthorization/StatusTimeline';
import DocumentCard from '../../components/documents/DocumentCard';
import FileUpload from '../../components/documents/FileUpload';

export default function ClaimDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [activeModal, setActiveModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('HOSPITAL_BILL');

  const { data: claim, loading, error: loadError, refetch } = useAsync(() => claimService.getById(id), [id]);
  const { data: patient } = useAsync(() => (claim ? patientService.getById(claim.patientId) : Promise.resolve(null)), [claim?.patientId]);
  const { data: documents, refetch: refetchDocs } = useAsync(() => documentService.getAll({ claimId: id }), [id]);

  useLiveRefresh('claim:statusChanged', refetch);

  if (loading) return <LoadingState label="Loading claim…" />;
  if (loadError) return <ErrorState message={loadError.message} onRetry={refetch} />;
  if (!claim) return null;

  const basePath = `/${user.role.toLowerCase()}/claims`;
  const closeModal = () => {
    setActiveModal(null);
    setError('');
    setRemarks('');
    setAmount('');
  };

  const runAction = async (fn) => {
    setSubmitting(true);
    setError('');
    try {
      await fn();
      closeModal();
      refetch();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await documentService.upload({ file, type: uploadType, claimId: id });
      await refetchDocs();
      setActiveModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const hasBill = (documents || []).some((d) => d.type === 'HOSPITAL_BILL');
  const canVerify = user.role === ROLES.INSURER && claim.status === CLAIM_STATUS.CLAIM_SUBMITTED && hasBill;
  const canDecide = user.role === ROLES.INSURER && claim.status === CLAIM_STATUS.UNDER_VERIFICATION;
  const canSettle = user.role === ROLES.INSURER && claim.status === CLAIM_STATUS.APPROVED;
  const canUploadBill = user.role === ROLES.HOSPITAL && claim.status !== CLAIM_STATUS.SETTLED;

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Claims', to: basePath }, { label: claim.id }]} />}
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono-ids">{claim.id}</span>
            <StatusBadge status={claim.status} />
          </span>
        }
        description={`Linked to pre-authorization ${claim.preAuthorizationId}`}
        actions={
          <>
            {canVerify && (
              <button
                onClick={() => setActiveModal('verify')}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                <ClipboardCheck className="h-4 w-4" />
                Start verification
              </button>
            )}
            {canDecide && (
              <>
                <button
                  onClick={() => setActiveModal('reject')}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-error hover:bg-error/5"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => setActiveModal('approve')}
                  className="flex items-center gap-1.5 rounded-md bg-success px-3.5 py-2 text-sm font-medium text-white hover:bg-success/90"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve claim
                </button>
              </>
            )}
            {canSettle && (
              <button
                onClick={() => setActiveModal('settle')}
                className="flex items-center gap-1.5 rounded-md bg-success px-3.5 py-2 text-sm font-medium text-white hover:bg-success/90"
              >
                <Banknote className="h-4 w-4" />
                Process settlement
              </button>
            )}
          </>
        }
      />

      {claim.status === CLAIM_STATUS.CLAIM_SUBMITTED && !hasBill && (
        <p role="status" className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-ink">
          {user.role === ROLES.INSURER
            ? 'Verification can start once the hospital uploads the Hospital Bill.'
            : 'The Hospital Bill must be uploaded before the insurer can start verification.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="mb-3 font-display text-sm font-semibold text-ink">Claim information</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Patient" value={patient?.name || claim.patientId} />
              <Info label="Pre-authorization" value={claim.preAuthorizationId} />
              <Info label="Treatment cost" value={formatCurrency(claim.treatmentCost)} />
              <Info label="Approved amount" value={formatCurrency(claim.approvedAmount)} />
              <Info label="Claimed amount" value={formatCurrency(claim.claimedAmount)} />
              <Info label="Settlement amount" value={formatCurrency(claim.settlementAmount)} />
              <Info label="Claim date" value={formatDate(claim.claimDate)} />
              <Info label="Reviewer" value={claim.reviewer || '—'} />
              {claim.remarks && <Info label="Remarks" value={claim.remarks} full />}
            </dl>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-ink">Documents</h3>
              {canUploadBill && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setUploadType('HOSPITAL_BILL');
                      setActiveModal('upload');
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Upload hospital bill
                  </button>
                  <button
                    onClick={() => {
                      setUploadType('DISCHARGE_SUMMARY');
                      setActiveModal('upload');
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Upload discharge summary
                  </button>
                </div>
              )}
            </div>
            {documents?.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No documents uploaded for this claim yet.</p>
            )}
          </section>
        </div>

        <section>
          <h3 className="mb-3 font-display text-sm font-semibold text-ink">Status timeline</h3>
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <StatusTimeline history={claim.statusHistory} />
          </div>
        </section>
      </div>

      <Modal open={activeModal === 'upload'} onClose={closeModal} title={`Upload ${DOCUMENT_TYPE_LABELS[uploadType]}`}>
        <FileUpload onUpload={handleUpload} uploading={uploading} />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </Modal>

      <ActionModal
        open={activeModal === 'verify'}
        title="Start verification"
        confirmLabel="Start verification"
        remarks={remarks}
        setRemarks={setRemarks}
        error={error}
        submitting={submitting}
        onClose={closeModal}
        onConfirm={() => runAction(() => claimService.verify(id, { reviewer: user.name, remarks }))}
      />

      <ActionModal
        open={activeModal === 'approve'}
        title="Approve claim"
        confirmLabel="Approve"
        tone="success"
        remarks={remarks}
        setRemarks={setRemarks}
        error={error}
        submitting={submitting}
        onClose={closeModal}
        onConfirm={() => runAction(() => claimService.approve(id, { reviewer: user.name, remarks }))}
      />

      <ActionModal
        open={activeModal === 'reject'}
        title="Reject claim"
        confirmLabel="Reject"
        tone="error"
        remarks={remarks}
        setRemarks={setRemarks}
        remarksRequired
        error={error}
        submitting={submitting}
        onClose={closeModal}
        onConfirm={() => runAction(() => claimService.reject(id, { reviewer: user.name, remarks }))}
      />

      <Modal
        open={activeModal === 'settle'}
        onClose={closeModal}
        title="Process settlement"
        footer={
          <>
            <button onClick={closeModal} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background">
              Cancel
            </button>
            <button
              onClick={() => runAction(() => claimService.settle(id, { settlementAmount: Number(amount || claim.approvedAmount), reviewer: user.name }))}
              disabled={submitting}
              className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : 'Confirm settlement'}
            </button>
          </>
        }
      >
        <FormField label="Settlement amount (₹)" required>
          <TextInput type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(claim.approvedAmount)} />
        </FormField>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </Modal>
    </div>
  );
}

function Info({ label, value, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

function ActionModal({ open, title, confirmLabel, tone = 'primary', remarks, setRemarks, remarksRequired, error, submitting, onClose, onConfirm }) {
  const toneClasses = {
    primary: 'bg-primary hover:bg-primary-dark',
    success: 'bg-success hover:bg-success/90',
    error: 'bg-error hover:bg-error/90',
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || (remarksRequired && !remarks.trim())}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${toneClasses[tone]}`}
          >
            {submitting ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      <FormField label="Remarks" required={remarksRequired}>
        <TextArea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add context…" />
      </FormField>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </Modal>
  );
}
