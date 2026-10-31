import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { TextInput } from '../forms/FormField';
import patientService from '../../services/patientService';

// Gives ONE patient their own login. After this, the patient signs in with
// their own email + password and sees only their own records.
export default function CreatePatientLoginModal({ patient, onClose, onCreated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmail(patient?.email || '');
    setPassword('');
    setError('');
  }, [patient]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await patientService.createAccount(patient.id, { email, password });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to create the login.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!patient}
      onClose={onClose}
      title={patient ? `Create login for ${patient.name}` : ''}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-ink hover:bg-background">
            Cancel
          </button>
          <button
            type="submit"
            form="create-patient-login"
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create login
          </button>
        </>
      }
    >
      <form id="create-patient-login" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          This patient will sign in with their own email and password and will only see their own requests, claims and documents.
        </p>
        <FormField label="Login email" required>
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Temporary password" required hint="At least 6 characters. The patient can change it from their Profile page.">
          <TextInput type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
        </FormField>
        {error && <p className="text-sm text-error">{error}</p>}
      </form>
    </Modal>
  );
}
