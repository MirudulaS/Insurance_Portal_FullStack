import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TextInput } from '../../components/forms/FormField';
import FormField from '../../components/forms/FormField';
import { APP_NAME } from '../../config';

const DEMO_ACCOUNTS = [
  { role: 'Patient: Arun Kumar', email: 'patient@demo.com' },
  { role: 'Patient: Divya Prakash', email: 'patient2@demo.com' },
  { role: 'Patient: Ganesh Moorthy', email: 'ganesh@demo.com' },
  { role: 'Patient: Lakshmi Narayanan', email: 'lakshmi@demo.com' },
  { role: 'Hospital', email: 'hospital@demo.com' },
  { role: 'Insurer', email: 'insurer@demo.com' },
  { role: 'Admin', email: 'admin@demo.com' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const dest = location.state?.from?.pathname || `/${user.role.toLowerCase()}/dashboard`;
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <ShieldPlus className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-xl font-semibold text-ink">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage pre-authorizations and claims</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-surface p-6 shadow-card">
          <FormField label="Email" htmlFor="email" required>
            <TextInput id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </FormField>
          <FormField label="Password" htmlFor="password" required>
            <TextInput id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>

          <p className="text-center text-sm text-muted">
            No account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </p>
        </form>

        <div className="mt-4 rounded-card border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts (password: demo123). Each patient has their own login.</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => {
                  setEmail(acc.email);
                  setPassword('demo123');
                }}
                className="rounded-md border border-border px-3 py-2 text-left text-xs hover:border-primary hover:bg-background"
              >
                <span className="block font-medium text-ink">{acc.role}</span>
                <span className="block truncate text-muted">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
