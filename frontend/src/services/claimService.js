import apiClient from './apiClient';

async function getAll(filters = {}) {
  const { data } = await apiClient.get('/claims', { params: filters });
  return data;
}

async function getById(id) {
  const { data } = await apiClient.get(`/claims/${id}`);
  return data;
}

async function create(payload) {
  const { data } = await apiClient.post('/claims', payload);
  return data;
}

async function update(id, payload) {
  const { data } = await apiClient.put(`/claims/${id}`, payload);
  return data;
}

async function verify(id, { remarks }) {
  const { data } = await apiClient.post(`/claims/${id}/verify`, { remarks });
  return data;
}

async function approve(id, { remarks }) {
  const { data } = await apiClient.post(`/claims/${id}/approve`, { remarks });
  return data;
}

async function reject(id, { remarks }) {
  const { data } = await apiClient.post(`/claims/${id}/reject`, { remarks });
  return data;
}

async function settle(id, { settlementAmount }) {
  const { data } = await apiClient.post(`/claims/${id}/settle`, { settlementAmount });
  return data;
}

const claimService = { getAll, getById, create, update, verify, approve, reject, settle };
export default claimService;
