import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ShieldPlus } from 'lucide-react';
import authService from '../../services/authService';
import FormField, { TextInput, Select } from '../../components/forms/FormField';

// Self-registration creates a PATIENT: a personal patient record plus the
// patient's own login. Hospital, insurer and admin accounts are created by an
// administrator.
export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    age: '', gender: '', policyNumber: '', primaryHospitalId: '', insurerId: '',
  });
  const [orgs, setOrgs] = useState({ hospitals: [], insurers: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authService.getOrganizations().then(setOrgs).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.register({
        ...form,
        age: form.age ? Number(form.age) : null,
        role: 'PATIENT',
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <ShieldPlus className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-xl font-semibold text-ink">Create your patient account</h1>
          <p className="mt-1 text-sm text-muted">Your own login, with your own private records</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-surface p-6 shadow-card">
          <FormField label="Full name" required>
            <TextInput required value={form.name} onChange={set('name')} placeholder="Your full name" />
          </FormField>
          <FormField label="Email" required>
            <TextInput type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
          </FormField>
          <FormField label="Password" required hint="At least 6 characters.">
            <TextInput type="password" required minLength={6} value={form.password} onChange={set('password')} />
          </FormField>
          <FormField label="Phone">
            <TextInput value={form.phone} onChange={set('phone')} placeholder="+91 90000 00000" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Age">
              <TextInput type="number" min="0" max="120" value={form.age} onChange={set('age')} />
            </FormField>
            <FormField label="Gender">
              <Select
                value={form.gender}
                onChange={set('gender')}
                options={[
                  { value: '', label: 'Select…' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </FormField>
          </div>
          <FormField label="Hospital" hint="So your hospital can see your requests.">
            <Select
              value={form.primaryHospitalId}
              onChange={set('primaryHospitalId')}
              options={[{ value: '', label: 'Select hospital…' }, ...orgs.hospitals.map((h) => ({ value: h.id, label: h.city ? `${h.name} (${h.city})` : h.name }))]}
            />
          </FormField>
          <FormField label="Insurer">
            <Select
              value={form.insurerId}
              onChange={set('insurerId')}
              options={[{ value: '', label: 'Select insurer…' }, ...orgs.insurers.map((i) => ({ value: i.id, label: i.name }))]}
            />
          </FormField>
          <FormField label="Policy number">
            <TextInput value={form.policyNumber} onChange={set('policyNumber')} placeholder="e.g. SH-POL-123456" />
          </FormField>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </button>

          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
