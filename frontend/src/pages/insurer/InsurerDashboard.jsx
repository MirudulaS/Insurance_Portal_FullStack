import { useNavigate } from 'react-router-dom';
import { Inbox, Clock, MessageSquareWarning, CheckCircle2, XCircle, ClipboardCheck, Banknote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import preAuthorizationService from '../../services/preAuthorizationService';
import claimService from '../../services/claimService';
import { PREAUTH_STATUS, CLAIM_STATUS } from '../../config';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingState from '../../components/common/LoadingState';

export default function InsurerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests, loading: rLoading, refetch: refetchReq } = useAsync(
    () => preAuthorizationService.getAll({ insurerId: user.linkedId }),
    [user.linkedId]
  );
  const { data: claims, loading: cLoading, refetch: refetchClaims } = useAsync(
    () => claimService.getAll({ insurerId: user.linkedId }),
    [user.linkedId]
  );

  useLiveRefresh(['preauthorization:statusChanged', 'claim:statusChanged'], () => {
    refetchReq();
    refetchClaims();
  });

  if (rLoading || cLoading) return <LoadingState label="Loading insurer dashboard…" />;

  const newRequests = requests.filter((r) => r.status === PREAUTH_STATUS.SUBMITTED);
  const underReview = requests.filter((r) => r.status === PREAUTH_STATUS.UNDER_REVIEW);
  const queries = requests.filter((r) => r.status === PREAUTH_STATUS.QUERY_RAISED);
  const approved = requests.filter((r) => [PREAUTH_STATUS.APPROVED, PREAUTH_STATUS.PARTIALLY_APPROVED].includes(r.status));
  const rejected = requests.filter((r) => r.status === PREAUTH_STATUS.REJECTED);
  const claimsPending = claims.filter((c) => [CLAIM_STATUS.CLAIM_SUBMITTED, CLAIM_STATUS.UNDER_VERIFICATION].includes(c.status));
  const settlements = claims.filter((c) => c.status === CLAIM_STATUS.SETTLED);

  return (
    <div>
      <PageHeader title="Insurer dashboard" description="Requests and claims awaiting your decision." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="New requests" value={newRequests.length} icon={Inbox} onClick={() => navigate('/insurer/preauthorizations')} />
        <StatCard label="Under review" value={underReview.length} icon={Clock} onClick={() => navigate('/insurer/preauthorizations')} />
        <StatCard label="Queries raised" value={queries.length} icon={MessageSquareWarning} onClick={() => navigate('/insurer/queries')} />
        <StatCard label="Approved" value={approved.length} icon={CheckCircle2} onClick={() => navigate('/insurer/preauthorizations')} />
        <StatCard label="Rejected" value={rejected.length} icon={XCircle} onClick={() => navigate('/insurer/preauthorizations')} />
        <StatCard label="Claims pending verification" value={claimsPending.length} icon={ClipboardCheck} onClick={() => navigate('/insurer/claims')} />
        <StatCard label="Settlements" value={settlements.length} icon={Banknote} onClick={() => navigate('/insurer/claims')} />
      </div>
    </div>
  );
}
