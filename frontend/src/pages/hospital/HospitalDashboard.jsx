import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle2, MessageSquareWarning, Receipt, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import preAuthorizationService from '../../services/preAuthorizationService';
import claimService from '../../services/claimService';
import patientService from '../../services/patientService';
import { PREAUTH_STATUS, CLAIM_STATUS } from '../../config';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingState from '../../components/common/LoadingState';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: patients, loading: pLoading, refetch: refetchPatients } = useAsync(
    () => patientService.getAll({ hospitalId: user.linkedId }),
    [user.linkedId]
  );
  const { data: requests, loading: rLoading, refetch: refetchReq } = useAsync(
    () => preAuthorizationService.getAll({ hospitalId: user.linkedId }),
    [user.linkedId]
  );
  const { data: claims, loading: cLoading, refetch: refetchClaims } = useAsync(
    () => claimService.getAll({ hospitalId: user.linkedId }),
    [user.linkedId]
  );

  useLiveRefresh(['preauthorization:statusChanged', 'claim:statusChanged'], () => {
    refetchReq();
    refetchClaims();
    refetchPatients();
  });

  if (pLoading || rLoading || cLoading) return <LoadingState label="Loading hospital dashboard…" />;

  const pending = requests.filter((r) => [PREAUTH_STATUS.SUBMITTED, PREAUTH_STATUS.UNDER_REVIEW, PREAUTH_STATUS.RESUBMITTED].includes(r.status));
  const approved = requests.filter((r) => [PREAUTH_STATUS.APPROVED, PREAUTH_STATUS.PARTIALLY_APPROVED].includes(r.status));
  const queries = requests.filter((r) => r.status === PREAUTH_STATUS.QUERY_RAISED);
  const activeClaims = claims.filter((c) => c.status !== CLAIM_STATUS.SETTLED && c.status !== CLAIM_STATUS.REJECTED);
  const settledClaims = claims.filter((c) => c.status === CLAIM_STATUS.SETTLED);

  return (
    <div>
      <PageHeader title="Hospital dashboard" description="A snapshot of pre-authorizations and claims across your patients." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total patients" value={patients.length} icon={Users} onClick={() => navigate('/hospital/patients')} />
        <StatCard label="Pending pre-auth" value={pending.length} icon={Clock} onClick={() => navigate('/hospital/preauthorizations')} />
        <StatCard label="Approved" value={approved.length} icon={CheckCircle2} onClick={() => navigate('/hospital/preauthorizations')} />
        <StatCard label="Queries" value={queries.length} icon={MessageSquareWarning} onClick={() => navigate('/hospital/queries')} />
        <StatCard label="Active claims" value={activeClaims.length} icon={Receipt} onClick={() => navigate('/hospital/claims')} />
        <StatCard label="Settled claims" value={settledClaims.length} icon={BadgeCheck} onClick={() => navigate('/hospital/claims')} />
      </div>
    </div>
  );
}
