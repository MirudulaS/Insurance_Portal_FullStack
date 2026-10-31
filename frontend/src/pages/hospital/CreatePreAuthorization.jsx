import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import patientService from '../../services/patientService';
import preAuthorizationService from '../../services/preAuthorizationService';
import PageHeader from '../../components/common/PageHeader';
import Breadcrumb from '../../components/common/Breadcrumb';
import FormField, { TextInput, TextArea, Select } from '../../components/forms/FormField';
import LoadingState from '../../components/common/LoadingState';

export default function CreatePreAuthorization() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: patients, loading: patientsLoading } = useAsync(() => patientService.getAll({ hospitalId: user.linkedId }), [user.linkedId]);

  const [form, setForm] = useState({
    patientId: '',
    diagnosis: '',
    treatment: '',
    doctor: '',
    estimatedCost: '',
    admissionDate: '',
    expectedDischargeDate: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const patient = patients.find((p) => p.id === form.patientId);
    if (!patient) {
      setError('Please select a patient.');
      return;
    }
    setSaving(true);
    try {
      const request = await preAuthorizationService.create(
        {
          ...form,
          estimatedCost: Number(form.estimatedCost),
          hospitalId: user.linkedId,
          insurerId: patient.insurerId,
          policyNumber: patient.policyNumber,
        },
        user.name
      );
      navigate(`/hospital/preauthorizations/${request.id}`);
    } catch (err) {
      setError(err.message || 'Unable to create request.');
    } finally {
      setSaving(false);
    }
  };

  if (patientsLoading) return <LoadingState label="Loading patients…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New Pre-Authorization Request"
        breadcrumb={<Breadcrumb items={[{ label: 'Pre-Authorizations', to: '/hospital/preauthorizations' }, { label: 'New' }]} />}
      />

      <form className="space-y-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <FormField label="Patient" required>
          <Select
            value={form.patientId}
            onChange={set('patientId')}
            options={[{ value: '', label: 'Select a patient' }, ...(patients || []).map((p) => ({ value: p.id, label: `${p.name} (${p.id})` }))]}
          />
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

        <p className="rounded-md bg-background p-3 text-xs text-muted">
          After saving, the request page shows what is still needed (patient documents already in the vault are reused automatically)
          before it can be submitted to the insurer.
        </p>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save draft & continue'}
        </button>
      </form>
    </div>
  );
}
