import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, MessageSquareWarning, SplitSquareHorizontal, Send, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import preAuthorizationService from '../../services/preAuthorizationService';
import patientService from '../../services/patientService';
import documentService from '../../services/documentService';
import patientDocumentService from '../../services/patientDocumentService';
import queryService from '../../services/queryService';
import userService from '../../services/userService';
import { ROLES, PREAUTH_STATUS, DOCUMENT_TYPE_LABELS } from '../../config';
import { formatCurrency, formatDate } from '../../utils/format';

import PageHeader from '../../components/common/PageHeader';
import Breadcrumb from '../../components/common/Breadcrumb';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import FormField, { TextInput, TextArea } from '../../components/forms/FormField';
import StatusTimeline from '../../components/preauthorization/StatusTimeline';
import ReadinessPanel from '../../components/documents/ReadinessPanel';
import DocumentCard from '../../components/documents/DocumentCard';
import FileUpload from '../../components/documents/FileUpload';
import QueryConversation from '../../components/queries/QueryConversation';
import AuditTimeline from '../../components/common/AuditTimeline';

export default function PreAuthorizationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'approve' | 'partial' | 'reject' | 'query' | 'upload'
  const [uploadTarget, setUploadTarget] = useState(null); // { scope: 'vault' | 'request', type }
  const [expiryDate, setExpiryDate] = useState('');
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: request, loading, error, refetch } = useAsync(() => preAuthorizationService.getById(id), [id]);
  const { data: documents, refetch: refetchDocs } = useAsync(() => documentService.getAll({ preAuthorizationId: id }), [id]);
  const { data: readiness, error: readinessError, refetch: refetchReadiness } = useAsync(() => preAuthorizationService.getReadiness(id), [id]);
  const { data: queries, refetch: refetchQueries } = useAsync(() => queryService.getAll({ preAuthorizationId: id }), [id]);
  const { data: patient } = useAsync(() => (request ? patientService.getById(request.patientId) : Promise.resolve(null)), [request?.patientId]);
  const { data: logs } = useAsync(() => userService.getAuditLogs({}), []);

  useLiveRefresh(['preauthorization:statusChanged', 'query:new', 'query:updated'], () => {
    refetch();
    refetchQueries();
    refetchReadiness();
  });

  if (loading) return <LoadingState label="Loading request…" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!request) return null;

  const basePath = `/${user.role.toLowerCase()}/preauthorizations`;
  const isReady = !!readiness?.ready;
  const relatedLogs = (logs || []).filter((l) => l.entityId === request.id);

  const closeModal = () => {
    setActiveModal(null);
    setActionError('');
    setAmount('');
    setRemarks('');
    setUploadTarget(null);
    setExpiryDate('');
  };

  const runAction = async (fn) => {
    setSubmitting(true);
    setActionError('');
    try {
      await fn();
      closeModal();
      refetch();
      refetchReadiness();
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setActionError('');
    try {
      if (uploadTarget.scope === 'vault') {
        // Goes into the patient's reusable vault, not just this request.
        await patientDocumentService.upload({ file, patientId: request.patientId, type: uploadTarget.type, expiryDate });
      } else {
        await documentService.upload({ file, type: uploadTarget.type, preAuthorizationId: id });
      }
      await Promise.all([refetchDocs(), refetchReadiness()]);
      closeModal();
    } catch (err) {
      setActionError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const canEdit = user.role === ROLES.HOSPITAL && request.status === PREAUTH_STATUS.DRAFT;
  const isEditableStage = [PREAUTH_STATUS.DRAFT, PREAUTH_STATUS.QUERY_RAISED].includes(request.status);
  const canUploadDocs = user.role === ROLES.HOSPITAL && isEditableStage;
  const canSubmit = canUploadDocs;
  const canReview = user.role === ROLES.INSURER && [PREAUTH_STATUS.UNDER_REVIEW, PREAUTH_STATUS.SUBMITTED].includes(request.status);
  const canCreateClaim =
    user.role === ROLES.HOSPITAL && [PREAUTH_STATUS.APPROVED, PREAUTH_STATUS.PARTIALLY_APPROVED].includes(request.status);

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Pre-Authorizations', to: basePath }, { label: request.id }]} />}
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono-ids">{request.id}</span>
            <StatusBadge status={request.status} />
          </span>
        }
        description={request.treatment}
        actions={
          <>
            {canEdit && (
              <button
                onClick={() => navigate(`/hospital/preauthorizations/${id}/edit`)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-ink hover:bg-background"
              >
                <Pencil className="h-4 w-4" />
                Edit draft
              </button>
            )}
            {canSubmit && (
              <button
                onClick={() => runAction(() => preAuthorizationService.submit(id, user.name))}
                disabled={submitting || !isReady}
                title={!isReady ? `Missing: ${(readiness?.missing || []).join(', ')}` : ''}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {request.status === PREAUTH_STATUS.QUERY_RAISED ? 'Resubmit' : 'Submit for review'}
              </button>
            )}
            {canCreateClaim && (
              <button
                onClick={() => navigate(`/hospital/claims/new?preAuthorizationId=${id}`)}
                className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Create claim
              </button>
            )}
            {canReview && (
              <>
                <button
                  onClick={() => setActiveModal('query')}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-warning hover:bg-warning/5"
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  Raise query
                </button>
                <button
                  onClick={() => setActiveModal('reject')}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-error hover:bg-error/5"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => setActiveModal('partial')}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-warning hover:bg-warning/5"
                >
                  <SplitSquareHorizontal className="h-4 w-4" />
                  Partial approve
                </button>
                <button
                  onClick={() => setActiveModal('approve')}
                  className="flex items-center gap-1.5 rounded-md bg-success px-3.5 py-2 text-sm font-medium text-white hover:bg-success/90"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </button>
              </>
            )}
          </>
        }
      />

      {actionError && !activeModal && (
        <p role="alert" className="mb-4 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="mb-3 font-display text-sm font-semibold text-ink">Request information</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Patient" value={patient?.name || request.patientId} />
              <Info label="Policy number" value={request.policyNumber} />
              <Info label="Diagnosis" value={request.diagnosis} full />
              <Info label="Treatment" value={request.treatment} full />
              <Info label="Doctor" value={request.doctor} />
              <Info label="Estimated cost" value={formatCurrency(request.estimatedCost)} />
              <Info label="Admission date" value={formatDate(request.admissionDate)} />
              <Info label="Expected discharge" value={formatDate(request.expectedDischargeDate)} />
              <Info label="Reviewer" value={request.reviewer || '—'} />
              <Info label="Approved amount" value={formatCurrency(request.approvedAmount)} />
              {request.remarks && <Info label="Remarks" value={request.remarks} full />}
            </dl>
          </section>

          <section>
            <h3 className="mb-3 font-display text-sm font-semibold text-ink">Readiness &amp; documents</h3>
            {readiness ? (
              <ReadinessPanel
                readiness={readiness}
                canUpload={canUploadDocs}
                onUploadVault={(type) => {
                  setUploadTarget({ scope: 'vault', type });
                  setActiveModal('upload');
                }}
                onUploadRequest={(type) => {
                  setUploadTarget({ scope: 'request', type });
                  setActiveModal('upload');
                }}
              />
            ) : readinessError ? (
              <ErrorState message="Unable to check readiness for this request." onRetry={() => refetchReadiness().catch(() => {})} />
            ) : (
              <LoadingState label="Checking readiness…" />
            )}
            {(readiness?.additionalDocuments?.length || 0) > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-ink">Additional documents (query responses)</h4>
                <div className="space-y-2">
                  {(documents || [])
                    .filter((d) => d.type === 'ADDITIONAL_DOCUMENT')
                    .map((doc) => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                </div>
              </div>
            )}
          </section>

          {queries?.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-sm font-semibold text-ink">Queries</h3>
              <div className="space-y-4">
                {queries.map((q) => (
                  <QueryConversation
                    key={q.id}
                    query={q}
                    currentUserName={user.name}
                    currentUserRole={user.role}
                    canResolve={user.role === ROLES.INSURER}
                    canAttach={canUploadDocs && request.status === PREAUTH_STATUS.QUERY_RAISED}
                    onUploadAttachment={(file) =>
                      documentService.upload({ file, type: 'ADDITIONAL_DOCUMENT', preAuthorizationId: id }).then(async (doc) => {
                        await Promise.all([refetchDocs(), refetchReadiness()]);
                        return doc;
                      })
                    }
                    onRespond={async (text, attachments) => {
                      await queryService.respond(q.id, { text, attachments });
                      // Answering an open query sends the request back to the insurer.
                      if (user.role === ROLES.HOSPITAL && request.status === PREAUTH_STATUS.QUERY_RAISED) {
                        await preAuthorizationService.submit(id);
                      }
                      refetchQueries();
                      refetch();
                      refetchReadiness();
                    }}
                    onResolve={async () => {
                      await queryService.resolve(q.id);
                      refetchQueries();
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 font-display text-sm font-semibold text-ink">Status timeline</h3>
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <StatusTimeline history={request.statusHistory} />
            </div>
          </section>

          {user.role === ROLES.ADMIN && relatedLogs.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-sm font-semibold text-ink">Audit history</h3>
              <AuditTimeline logs={relatedLogs} />
            </section>
          )}
        </div>
      </div>

      {/* Upload modal */}
      <Modal
        open={activeModal === 'upload'}
        onClose={closeModal}
        title={uploadTarget ? `Upload ${DOCUMENT_TYPE_LABELS[uploadTarget.type]}` : 'Upload document'}
      >
        {uploadTarget?.scope === 'vault' && (
          <div className="mb-4 space-y-3">
            <p className="rounded-md bg-background p-3 text-xs text-muted">
              This is saved to the patient&apos;s Document Vault, so it will be reused automatically for future requests.
            </p>
            <FormField label="Valid until (optional)" hint="Leave empty if the document does not expire.">
              <TextInput type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </FormField>
          </div>
        )}
        <FileUpload onUpload={handleUpload} uploading={uploading} />
        {actionError && <p className="mt-2 text-sm text-error">{actionError}</p>}
      </Modal>

      {/* Approve modal */}
      <ReviewModal
        open={activeModal === 'approve'}
        title="Approve request"
        confirmLabel="Approve"
        confirmTone="success"
        amount={amount}
        setAmount={setAmount}
        remarks={remarks}
        setRemarks={setRemarks}
        showAmount
        defaultAmount={request.estimatedCost}
        error={actionError}
        submitting={submitting}
        onClose={closeModal}
        onConfirm={() =>
          runAction(() =>
            preAuthorizationService.approve(id, { approvedAmount: Number(amount || request.estimatedCost), remarks, reviewer: user.name })
          )
        }
      />

      {/* Partial approve modal */}
      <ReviewModal
        open={activeModal === 'partial'}
        title="Partially approve request"
        confirmLabel="Partially approve"
        confirmTone="warning"
        amount={amount}
        setAmount={setAmount}
        remarks={remarks}
        setRemarks={setRemarks}
        showAmount
        amountRequired
        error={actionError}
        submitting={submitting}
        onClose={closeModal}
        onConfirm={() =>
          runAction(() => preAuthorizationService.partialApprove(id, { approvedAmount: Number(amount), remarks, reviewer: user.name }))
        }
      />

      {/* Reject modal */}
      <ReviewModal
        open={activeModal === 'reject'}
        title="Reject request"
        confirmLabel="Reject"
        confirmTone="error"
        remarks={remarks}
        setRemarks={setRemarks}
        remarksRequired
        error={actionError}
        submitting={submitting}
        onClose={closeModal}
        onConfirm={() => runAction(() => preAuthorizationService.reject(id, { remarks, reviewer: user.name }))}
      />

      {/* Raise query modal */}
      <ReviewModal
        open={activeModal === 'query'}
        title="Raise a query"
        confirmLabel="Send query"
        confirmTone="warning"
        remarks={remarks}
        setRemarks={setRemarks}
        remarksRequired
        remarksLabel="Question for the hospital"
        error={actionError}
        submitting={submitting}
        onClose={closeModal}
        onConfirm={() => runAction(() => preAuthorizationService.raiseQuery(id, { question: remarks, reviewer: user.name }))}
      />
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

function ReviewModal({
  open,
  title,
  confirmLabel,
  confirmTone = 'primary',
  showAmount,
  amount,
  setAmount,
  amountRequired,
  defaultAmount,
  remarks,
  setRemarks,
  remarksRequired,
  remarksLabel = 'Remarks',
  error,
  submitting,
  onClose,
  onConfirm,
}) {
  const toneClasses = {
    primary: 'bg-primary hover:bg-primary-dark',
    success: 'bg-success hover:bg-success/90',
    warning: 'bg-warning hover:bg-warning/90',
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
            disabled={submitting || (amountRequired && !amount) || (remarksRequired && !remarks.trim())}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${toneClasses[confirmTone]}`}
          >
            {submitting ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {showAmount && (
          <FormField label="Approved amount (₹)" required={amountRequired}>
            <TextInput type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(defaultAmount || '')} />
          </FormField>
        )}
        <FormField label={remarksLabel} required={remarksRequired}>
          <TextArea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add context for this decision…" />
        </FormField>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </Modal>
  );
}
