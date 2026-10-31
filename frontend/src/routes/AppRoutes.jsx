import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import RoleGuard from './RoleGuard';
import AppLayout from '../layouts/AppLayout';
import { ROLES } from '../config';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

import PatientDashboard from '../pages/patient/PatientDashboard';
import HospitalDashboard from '../pages/hospital/HospitalDashboard';
import HospitalPatients from '../pages/hospital/HospitalPatients';
import CreatePreAuthorization from '../pages/hospital/CreatePreAuthorization';
import EditPreAuthorization from '../pages/hospital/EditPreAuthorization';
import CreateClaim from '../pages/hospital/CreateClaim';
import InsurerDashboard from '../pages/insurer/InsurerDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminPatients from '../pages/admin/AdminPatients';
import AdminHospitals from '../pages/admin/AdminHospitals';
import AdminInsurers from '../pages/admin/AdminInsurers';
import AdminReports from '../pages/admin/AdminReports';
import AdminAuditLogs from '../pages/admin/AdminAuditLogs';

import PreAuthorizationList from '../pages/shared/PreAuthorizationList';
import PreAuthorizationDetail from '../pages/shared/PreAuthorizationDetail';
import ClaimList from '../pages/shared/ClaimList';
import ClaimDetail from '../pages/shared/ClaimDetail';
import DocumentsPage from '../pages/shared/DocumentsPage';
import DocumentVaultPage from '../pages/shared/DocumentVaultPage';
import QueriesPage from '../pages/shared/QueriesPage';
import NotificationsPage from '../pages/shared/NotificationsPage';
import ProfilePage from '../pages/shared/ProfilePage';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* PATIENT */}
        <Route
          path="/patient"
          element={
            <RoleGuard allow={[ROLES.PATIENT]}>
              <Navigate to="dashboard" replace />
            </RoleGuard>
          }
        />
        <Route path="/patient/dashboard" element={<RoleGuard allow={[ROLES.PATIENT]}><PatientDashboard /></RoleGuard>} />
        <Route path="/patient/preauthorizations" element={<RoleGuard allow={[ROLES.PATIENT]}><PreAuthorizationList /></RoleGuard>} />
        <Route path="/patient/preauthorizations/:id" element={<RoleGuard allow={[ROLES.PATIENT]}><PreAuthorizationDetail /></RoleGuard>} />
        <Route path="/patient/claims" element={<RoleGuard allow={[ROLES.PATIENT]}><ClaimList /></RoleGuard>} />
        <Route path="/patient/claims/:id" element={<RoleGuard allow={[ROLES.PATIENT]}><ClaimDetail /></RoleGuard>} />
        <Route path="/patient/vault" element={<RoleGuard allow={[ROLES.PATIENT]}><DocumentVaultPage /></RoleGuard>} />
        <Route path="/patient/documents" element={<RoleGuard allow={[ROLES.PATIENT]}><DocumentsPage /></RoleGuard>} />
        <Route path="/patient/queries" element={<RoleGuard allow={[ROLES.PATIENT]}><QueriesPage /></RoleGuard>} />
        <Route path="/patient/notifications" element={<RoleGuard allow={[ROLES.PATIENT]}><NotificationsPage /></RoleGuard>} />
        <Route path="/patient/profile" element={<RoleGuard allow={[ROLES.PATIENT]}><ProfilePage /></RoleGuard>} />

        {/* HOSPITAL */}
        <Route path="/hospital/dashboard" element={<RoleGuard allow={[ROLES.HOSPITAL]}><HospitalDashboard /></RoleGuard>} />
        <Route path="/hospital/patients" element={<RoleGuard allow={[ROLES.HOSPITAL]}><HospitalPatients /></RoleGuard>} />
        <Route path="/hospital/preauthorizations" element={<RoleGuard allow={[ROLES.HOSPITAL]}><PreAuthorizationList /></RoleGuard>} />
        <Route path="/hospital/preauthorizations/new" element={<RoleGuard allow={[ROLES.HOSPITAL]}><CreatePreAuthorization /></RoleGuard>} />
        <Route path="/hospital/preauthorizations/:id/edit" element={<RoleGuard allow={[ROLES.HOSPITAL]}><EditPreAuthorization /></RoleGuard>} />
        <Route path="/hospital/preauthorizations/:id" element={<RoleGuard allow={[ROLES.HOSPITAL]}><PreAuthorizationDetail /></RoleGuard>} />
        <Route path="/hospital/claims" element={<RoleGuard allow={[ROLES.HOSPITAL]}><ClaimList /></RoleGuard>} />
        <Route path="/hospital/claims/new" element={<RoleGuard allow={[ROLES.HOSPITAL]}><CreateClaim /></RoleGuard>} />
        <Route path="/hospital/claims/:id" element={<RoleGuard allow={[ROLES.HOSPITAL]}><ClaimDetail /></RoleGuard>} />
        <Route path="/hospital/vault" element={<RoleGuard allow={[ROLES.HOSPITAL]}><DocumentVaultPage /></RoleGuard>} />
        <Route path="/hospital/documents" element={<RoleGuard allow={[ROLES.HOSPITAL]}><DocumentsPage /></RoleGuard>} />
        <Route path="/hospital/queries" element={<RoleGuard allow={[ROLES.HOSPITAL]}><QueriesPage /></RoleGuard>} />
        <Route path="/hospital/notifications" element={<RoleGuard allow={[ROLES.HOSPITAL]}><NotificationsPage /></RoleGuard>} />
        <Route path="/hospital/profile" element={<RoleGuard allow={[ROLES.HOSPITAL]}><ProfilePage /></RoleGuard>} />

        {/* INSURER */}
        <Route path="/insurer/dashboard" element={<RoleGuard allow={[ROLES.INSURER]}><InsurerDashboard /></RoleGuard>} />
        <Route path="/insurer/preauthorizations" element={<RoleGuard allow={[ROLES.INSURER]}><PreAuthorizationList /></RoleGuard>} />
        <Route path="/insurer/preauthorizations/:id" element={<RoleGuard allow={[ROLES.INSURER]}><PreAuthorizationDetail /></RoleGuard>} />
        <Route path="/insurer/claims" element={<RoleGuard allow={[ROLES.INSURER]}><ClaimList /></RoleGuard>} />
        <Route path="/insurer/claims/:id" element={<RoleGuard allow={[ROLES.INSURER]}><ClaimDetail /></RoleGuard>} />
        <Route path="/insurer/queries" element={<RoleGuard allow={[ROLES.INSURER]}><QueriesPage /></RoleGuard>} />
        <Route path="/insurer/notifications" element={<RoleGuard allow={[ROLES.INSURER]}><NotificationsPage /></RoleGuard>} />
        <Route path="/insurer/profile" element={<RoleGuard allow={[ROLES.INSURER]}><ProfilePage /></RoleGuard>} />

        {/* ADMIN */}
        <Route path="/admin/dashboard" element={<RoleGuard allow={[ROLES.ADMIN]}><AdminDashboard /></RoleGuard>} />
        <Route path="/admin/users" element={<RoleGuard allow={[ROLES.ADMIN]}><AdminUsers /></RoleGuard>} />
        <Route path="/admin/patients" element={<RoleGuard allow={[ROLES.ADMIN]}><AdminPatients /></RoleGuard>} />
        <Route path="/admin/hospitals" element={<RoleGuard allow={[ROLES.ADMIN]}><AdminHospitals /></RoleGuard>} />
        <Route path="/admin/insurers" element={<RoleGuard allow={[ROLES.ADMIN]}><AdminInsurers /></RoleGuard>} />
        <Route path="/admin/preauthorizations" element={<RoleGuard allow={[ROLES.ADMIN]}><PreAuthorizationList /></RoleGuard>} />
        <Route path="/admin/preauthorizations/:id" element={<RoleGuard allow={[ROLES.ADMIN]}><PreAuthorizationDetail /></RoleGuard>} />
        <Route path="/admin/claims" element={<RoleGuard allow={[ROLES.ADMIN]}><ClaimList /></RoleGuard>} />
        <Route path="/admin/claims/:id" element={<RoleGuard allow={[ROLES.ADMIN]}><ClaimDetail /></RoleGuard>} />
        <Route path="/admin/reports" element={<RoleGuard allow={[ROLES.ADMIN]}><AdminReports /></RoleGuard>} />
        <Route path="/admin/audit-logs" element={<RoleGuard allow={[ROLES.ADMIN]}><AdminAuditLogs /></RoleGuard>} />
        <Route path="/admin/profile" element={<RoleGuard allow={[ROLES.ADMIN]}><ProfilePage /></RoleGuard>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
