import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import preAuthorizationService from '../../services/preAuthorizationService';
import claimService from '../../services/claimService';
import { PREAUTH_STATUS } from '../../config';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Breadcrumb from '../../components/common/Breadcrumb';
import FormField, { Select, TextInput } from '../../components/forms/FormField';
import LoadingState from '../../components/common/LoadingState';

export default function CreateClaim() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('preAuthorizationId') || '';

  const { data: requests, loading } = useAsync(() => preAuthorizationService.getAll({ hospitalId: user.linkedId }), [user.linkedId]);
  const eligible = (requests || []).filter((r) => [PREAUTH_STATUS.APPROVED, PREAUTH_STATUS.PARTIALLY_APPROVED].includes(r.status));

  const [preAuthorizationId, setPreAuthorizationId] = useState(preselected);
  const [claimedAmount, setClaimedAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = eligible.find((r) => r.id === preAuthorizationId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) {
      setError('Please select an approved pre-authorization request.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const claim = await claimService.create(
        { preAuthorizationId: selected.id, claimedAmount: Number(claimedAmount || selected.approvedAmount) },
        user.name
      );
      navigate(`/hospital/claims/${claim.id}`);
    } catch (err) {
      setError(err.message || 'Unable to create claim.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading eligible requests…" />;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New Claim" breadcrumb={<Breadcrumb items={[{ label: 'Claims', to: '/hospital/claims' }, { label: 'New' }]} />} />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <FormField label="Approved pre-authorization" required hint="Only requests marked Approved or Partially Approved can be claimed.">
          <Select
            value={preAuthorizationId}
            onChange={(e) => {
              setPreAuthorizationId(e.target.value);
              setClaimedAmount('');
            }}
            options={[{ value: '', label: 'Select a request' }, ...eligible.map((r) => ({ value: r.id, label: `${r.id} — ${r.treatment}` }))]}
          />
        </FormField>

        {selected && (
          <div className="rounded-card border border-border bg-background/50 p-4 text-sm">
            <p className="text-muted">Approved amount</p>
            <p className="font-display text-lg font-semibold text-ink">{formatCurrency(selected.approvedAmount)}</p>
          </div>
        )}

        <FormField label="Claimed amount (₹)" required>
          <TextInput
            type="number"
            min="0"
            value={claimedAmount}
            onChange={(e) => setClaimedAmount(e.target.value)}
            placeholder={selected ? String(selected.approvedAmount) : ''}
            disabled={!selected}
          />
        </FormField>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={saving || !selected}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          Submit claim
        </button>
      </form>
    </div>
  );
}
