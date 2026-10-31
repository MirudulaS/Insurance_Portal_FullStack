import apiClient from './apiClient';

async function getSummary() {
  const { data } = await apiClient.get('/reports/summary');
  return data;
}

async function getPreAuthorizationReport() {
  const { data } = await apiClient.get('/reports/preauthorizations');
  return data;
}

async function getClaimReport() {
  const { data } = await apiClient.get('/reports/claims');
  return data;
}

const reportService = { getSummary, getPreAuthorizationReport, getClaimReport };
export default reportService;
