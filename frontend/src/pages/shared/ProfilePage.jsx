import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import FormField, { TextInput } from '../../components/forms/FormField';
import { initials, formatDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" description="Your account details." />
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="mb-5 flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
            style={{ backgroundColor: user.avatarColor }}
          >
            {initials(user.name)}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-ink">{user.name}</p>
            <p className="text-sm text-muted">{user.role}</p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-y-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <Field label="Email" value={user.email} />
          <Field label="Phone" value={user.phone || '—'} />
          <Field label="User ID" value={user.id} mono />
          {user.linkedId && <Field label="Linked record" value={user.linkedId} mono />}
          <Field label="Member since" value={formatDate(user.createdAt)} />
        </dl>
      </div>
      <ChangePassword />
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSaving(true);
    try {
      await authService.changePassword(current, next);
      setCurrent('');
      setNext('');
      setMsg({ type: 'ok', text: 'Password updated.' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Unable to change password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-base font-semibold text-ink">Change password</h2>
      <FormField label="Current password" required>
        <TextInput type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </FormField>
      <FormField label="New password" required hint="At least 6 characters.">
        <TextInput type="password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </FormField>
      {msg.text && <p className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-error'}`}>{msg.text}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        Update password
      </button>
    </form>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-0.5 text-ink ${mono ? 'font-mono-ids text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
