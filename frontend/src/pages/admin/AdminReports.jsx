import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import reportService from '../../services/reportService';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import ChartCard from '../../components/common/ChartCard';
import LoadingState from '../../components/common/LoadingState';
import { FileText, CheckCircle2, XCircle, Clock, Banknote } from 'lucide-react';

const STATUS_COLOR = {
  DRAFT: '#667085',
  SUBMITTED: '#1565C0',
  UNDER_REVIEW: '#1565C0',
  QUERY_RAISED: '#B7791F',
  RESUBMITTED: '#1565C0',
  APPROVED: '#2E7D32',
  PARTIALLY_APPROVED: '#B7791F',
  REJECTED: '#C62828',
  CLAIM_SUBMITTED: '#1565C0',
  UNDER_VERIFICATION: '#1565C0',
  SETTLEMENT_PROCESSED: '#2E7D32',
  SETTLED: '#2E7D32',
};

export default function AdminReports() {
  const { data: summary, loading: sLoading } = useAsync(() => reportService.getSummary(), []);
  const { data: preAuthReport, loading: pLoading } = useAsync(() => reportService.getPreAuthorizationReport(), []);
  const { data: claimReport, loading: cLoading } = useAsync(() => reportService.getClaimReport(), []);

  if (sLoading || pLoading || cLoading) return <LoadingState label="Crunching the numbers…" />;

  const statusPie = preAuthReport.byStatus.filter((s) => s.count > 0);
  const claimBar = claimReport.byStatus.filter((s) => s.count > 0);

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Aggregate performance across pre-authorizations and claims." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total requests" value={summary.totalRequests} icon={FileText} />
        <StatCard label="Approval rate" value={`${summary.approvalPercentage}%`} icon={CheckCircle2} />
        <StatCard label="Rejection rate" value={`${summary.rejectionPercentage}%`} icon={XCircle} />
        <StatCard label="Avg. processing time" value={`${summary.avgProcessingTimeHours}h`} icon={Clock} />
        <StatCard label="Total settled" value={formatCurrency(summary.totalSettledAmount)} icon={Banknote} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Requests by status" subtitle="Distribution across the pre-authorization workflow">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusPie} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusPie.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name.replace(/_/g, ' ')]} />
              <Legend formatter={(value) => value.replace(/_/g, ' ')} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Approved vs Rejected vs Pending">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { name: 'Approved', count: summary.approvedCount },
                { name: 'Rejected', count: summary.rejectedCount },
                { name: 'Pending', count: summary.pendingCount },
                { name: 'Draft', count: summary.draftCount },
              ]}
            >
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#667085" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#667085" />
              <Tooltip />
              <Bar dataKey="count" fill="#1F4E5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requests over time" subtitle="Requests created per month">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={preAuthReport.overTime}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#667085" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#667085" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4F7C82" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Claims by status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={claimBar} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#667085" />
              <YAxis type="category" dataKey="status" width={130} tick={{ fontSize: 11 }} stroke="#667085" tickFormatter={(v) => v.replace(/_/g, ' ')} />
              <Tooltip formatter={(value, name, props) => [value, props.payload.status.replace(/_/g, ' ')]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {claimBar.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLOR[entry.status] || '#4F7C82'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
