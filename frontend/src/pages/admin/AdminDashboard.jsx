import { useNavigate } from 'react-router-dom';
import { Users, UserCircle, Building2, ShieldCheck, FileText, Receipt, Banknote, BarChart3 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import userService from '../../services/userService';
import patientService from '../../services/patientService';
import organizationService from '../../services/organizationService';
import preAuthorizationService from '../../services/preAuthorizationService';
import claimService from '../../services/claimService';
import { CLAIM_STATUS } from '../../config';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingState from '../../components/common/LoadingState';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: users, loading: uLoading } = useAsync(() => userService.getAll(), []);
  const { data: patients, loading: pLoading } = useAsync(() => patientService.getAll(), []);
  const { data: hospitals, loading: hLoading } = useAsync(() => organizationService.getHospitals(), []);
  const { data: insurers, loading: iLoading } = useAsync(() => organizationService.getInsurers(), []);
  const { data: requests, loading: rLoading } = useAsync(() => preAuthorizationService.getAll(), []);
  const { data: claims, loading: cLoading } = useAsync(() => claimService.getAll(), []);

  if (uLoading || pLoading || hLoading || iLoading || rLoading || cLoading) return <LoadingState label="Loading admin dashboard…" />;

  const settled = claims.filter((c) => c.status === CLAIM_STATUS.SETTLED);

  return (
    <div>
      <PageHeader
        title="Admin dashboard"
        description="A system-wide view across hospitals, insurers, and patients."
        actions={
          <button
            onClick={() => navigate('/admin/reports')}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <BarChart3 className="h-4 w-4" />
            View reports
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total users" value={users.length} icon={Users} onClick={() => navigate('/admin/users')} />
        <StatCard label="Patients" value={patients.length} icon={UserCircle} onClick={() => navigate('/admin/patients')} />
        <StatCard label="Hospitals" value={hospitals.length} icon={Building2} onClick={() => navigate('/admin/hospitals')} />
        <StatCard label="Insurers" value={insurers.length} icon={ShieldCheck} onClick={() => navigate('/admin/insurers')} />
        <StatCard label="Requests" value={requests.length} icon={FileText} onClick={() => navigate('/admin/preauthorizations')} />
        <StatCard label="Claims" value={claims.length} icon={Receipt} onClick={() => navigate('/admin/claims')} />
        <StatCard label="Settlements" value={settled.length} icon={Banknote} onClick={() => navigate('/admin/claims')} />
      </div>
    </div>
  );
}
