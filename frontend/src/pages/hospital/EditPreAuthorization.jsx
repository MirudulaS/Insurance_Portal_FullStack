import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import patientService from '../../services/patientService';
import preAuthorizationService from '../../services/preAuthorizationService';
import { PREAUTH_STATUS } from '../../config';
import PageHeader from '../../components/common/PageHeader';
import Breadcrumb from '../../components/common/Breadcrumb';
import FormField, { TextInput, TextArea } from '../../components/forms/FormField';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

export default function EditPreAuthorization() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: request, loading, error: loadError } = useAsync(() => preAuthorizationService.getById(id), [id]);
  const { data: patients } = useAsync(() => patientService.getAll({ hospitalId: user.linkedId }), [user.linkedId]);

  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Populate the form once the request has loaded - a draft never changes
  // patient/hospital/insurer, only the clinical and cost details.
  useEffect(() => {
    if (request) {
      setForm({
        diagnosis: request.diagnosis || '',
        treatment: request.treatment || '',
        doctor: request.doctor || '',
        estimatedCost: request.estimatedCost ?? '',
        admissionDate: request.admissionDate || '',
        expectedDischargeDate: request.expectedDischargeDate || '',
      });
    }
  }, [request]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await preAuthorizationService.update(id, { ...form, estimatedCost: Number(form.estimatedCost) });
      navigate(`/hospital/preauthorizations/${id}`);
    } catch (err) {
      setError(err.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <LoadingState label="Loading draft…" />;
  if (loadError) return <ErrorState message={loadError.message} />;
  if (request.status !== PREAUTH_STATUS.DRAFT) {
    return <ErrorState message="Only draft requests can be edited. This request has already been submitted." />;
  }

  const patient = (patients || []).find((p) => p.id === request.patientId);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Edit Draft — ${request.id}`}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Pre-Authorizations', to: '/hospital/preauthorizations' },
              { label: request.id, to: `/hospital/preauthorizations/${request.id}` },
              { label: 'Edit' },
            ]}
          />
        }
      />

      <form className="space-y-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <FormField label="Patient">
          <TextInput value={patient ? `${patient.name} (${patient.id})` : request.patientId} disabled className="bg-background text-muted" />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Treating doctor" required>
            <TextInput required value={form.doctor} onChange={set('doctor')} placeholder="Dr. Name" />
          </FormField>
          <FormField label="Estimated cost (₹)" required>
            <TextInput required type="number" min="0" value={form.estimatedCost} onChange={set('estimatedCost')} placeholder="150000" />
          </FormField>
        </div>

        <FormField label="Diagnosis" required>
          <TextArea required rows={2} value={form.diagnosis} onChange={set('diagnosis')} placeholder="Primary diagnosis" />
        </FormField>

        <FormField label="Proposed treatment" required>
          <TextArea required rows={2} value={form.treatment} onChange={set('treatment')} placeholder="Treatment / procedure details" />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Admission date" required>
            <TextInput required type="date" value={form.admissionDate} onChange={set('admissionDate')} />
          </FormField>
          <FormField label="Expected discharge date" required>
            <TextInput required type="date" value={form.expectedDischargeDate} onChange={set('expectedDischargeDate')} />
          </FormField>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            onClick={() => navigate(`/hospital/preauthorizations/${id}`)}
            className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-background"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
