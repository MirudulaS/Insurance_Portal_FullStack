import apiClient from './apiClient';

async function getAll(filters = {}) {
  const { data } = await apiClient.get('/preauthorizations', { params: filters });
  return data;
}

async function getById(id) {
  const { data } = await apiClient.get(`/preauthorizations/${id}`);
  return data;
}

async function getReadiness(id) {
  const { data } = await apiClient.get(`/preauthorizations/${id}/readiness`);
  return data;
}

async function create(payload) {
  const { data } = await apiClient.post('/preauthorizations', payload);
  return data;
}

async function update(id, payload) {
  const { data } = await apiClient.put(`/preauthorizations/${id}`, payload);
  return data;
}

async function submit(id) {
  const { data } = await apiClient.post(`/preauthorizations/${id}/submit`);
  return data;
}

async function approve(id, { approvedAmount, remarks }) {
  const { data } = await apiClient.post(`/preauthorizations/${id}/approve`, { approvedAmount, remarks });
  return data;
}

async function partialApprove(id, { approvedAmount, remarks }) {
  const { data } = await apiClient.post(`/preauthorizations/${id}/partial-approve`, { approvedAmount, remarks });
  return data;
}

async function reject(id, { remarks }) {
  const { data } = await apiClient.post(`/preauthorizations/${id}/reject`, { remarks });
  return data;
}

async function raiseQuery(id, { question }) {
  const { data } = await apiClient.post(`/preauthorizations/${id}/query`, { question });
  return data;
}

const preAuthorizationService = { getAll, getById, getReadiness, create, update, submit, approve, partialApprove, reject, raiseQuery };
export default preAuthorizationService;
