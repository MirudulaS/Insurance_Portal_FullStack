import apiClient from './apiClient';

async function getAll(filters = {}) {
  const { data } = await apiClient.get('/users', { params: filters });
  return data;
}

async function getAuditLogs(filters = {}) {
  const { data } = await apiClient.get('/audit-logs', { params: filters });
  return data;
}

const userService = { getAll, getAuditLogs };
export default userService;
