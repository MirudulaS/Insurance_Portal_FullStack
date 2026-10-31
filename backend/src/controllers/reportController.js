const pool = require('../db/pool');
const { asyncHandler } = require('../utils/helpers');

const PREAUTH_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED', 'RESUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'];
const CLAIM_STATUSES = ['CLAIM_SUBMITTED', 'UNDER_VERIFICATION', 'QUERY_RAISED', 'APPROVED', 'REJECTED', 'SETTLEMENT_PROCESSED', 'SETTLED'];

const getSummary = asyncHandler(async (req, res) => {
  const [[{ totalRequests }]] = await pool.query('SELECT COUNT(*) AS totalRequests FROM preauthorizations');
  const [[{ approvedCount }]] = await pool.query("SELECT COUNT(*) AS approvedCount FROM preauthorizations WHERE status IN ('APPROVED','PARTIALLY_APPROVED')");
  const [[{ rejectedCount }]] = await pool.query("SELECT COUNT(*) AS rejectedCount FROM preauthorizations WHERE status = 'REJECTED'");
  const [[{ pendingCount }]] = await pool.query("SELECT COUNT(*) AS pendingCount FROM preauthorizations WHERE status IN ('SUBMITTED','UNDER_REVIEW','QUERY_RAISED','RESUBMITTED')");
  const [[{ draftCount }]] = await pool.query("SELECT COUNT(*) AS draftCount FROM preauthorizations WHERE status = 'DRAFT'");

  const [[{ totalClaims }]] = await pool.query('SELECT COUNT(*) AS totalClaims FROM claims');
  const [[{ claimsSettled }]] = await pool.query("SELECT COUNT(*) AS claimsSettled FROM claims WHERE status = 'SETTLED'");
  const [[{ claimsPending }]] = await pool.query("SELECT COUNT(*) AS claimsPending FROM claims WHERE status NOT IN ('SETTLED','REJECTED')");
  const [[{ totalSettledAmount }]] = await pool.query("SELECT COALESCE(SUM(settlement_amount),0) AS totalSettledAmount FROM claims WHERE status = 'SETTLED'");

  const [avgRows] = await pool.query(`
    SELECT h.preauth_id, TIMESTAMPDIFF(HOUR, sub.submitted_at, h.at) AS hours
    FROM preauth_status_history h
    JOIN (
      SELECT preauth_id, MIN(at) AS submitted_at
      FROM preauth_status_history
      WHERE status IN ('SUBMITTED','RESUBMITTED')
      GROUP BY preauth_id
    ) sub ON sub.preauth_id = h.preauth_id
    JOIN preauthorizations p ON p.id = h.preauth_id
    WHERE h.status IN ('APPROVED','PARTIALLY_APPROVED','REJECTED')
      AND p.status = h.status
  `);
  const avgProcessingTimeHours = avgRows.length ? Math.round(avgRows.reduce((s, r) => s + r.hours, 0) / avgRows.length) : 0;

  res.json({
    totalRequests,
    approvedCount,
    rejectedCount,
    pendingCount,
    draftCount,
    approvalPercentage: totalRequests ? Math.round((approvedCount / totalRequests) * 100) : 0,
    rejectionPercentage: totalRequests ? Math.round((rejectedCount / totalRequests) * 100) : 0,
    avgProcessingTimeHours,
    totalClaims,
    claimsSettled,
    claimsPending,
    totalSettledAmount: Number(totalSettledAmount),
  });
});

const getPreAuthorizationReport = asyncHandler(async (req, res) => {
  const [statusRows] = await pool.query('SELECT status, COUNT(*) AS count FROM preauthorizations GROUP BY status');
  const countByStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  const byStatus = PREAUTH_STATUSES.map((status) => ({ status, count: countByStatus[status] || 0 }));

  const [monthRows] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%b %y') AS month, COUNT(*) AS count
    FROM preauthorizations
    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), month
    ORDER BY DATE_FORMAT(created_at, '%Y-%m')
  `);

  res.json({ byStatus, overTime: monthRows });
});

const getClaimReport = asyncHandler(async (req, res) => {
  const [statusRows] = await pool.query('SELECT status, COUNT(*) AS count FROM claims GROUP BY status');
  const countByStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  const byStatus = CLAIM_STATUSES.map((status) => ({ status, count: countByStatus[status] || 0 }));
  res.json({ byStatus });
});

module.exports = { getSummary, getPreAuthorizationReport, getClaimReport };
