import apiClient from './apiClient';

async function getAll(filters = {}) {
  const { data } = await apiClient.get('/patients', { params: filters });
  return data;
}

async function getById(id) {
  const { data } = await apiClient.get(`/patients/${id}`);
  return data;
}

async function create(payload) {
  const { data } = await apiClient.post('/patients', payload);
  return data;
}

async function update(id, payload) {
  const { data } = await apiClient.put(`/patients/${id}`, payload);
  return data;
}

// Gives an existing patient their own login (hospital: own patients; admin: any).
async function createAccount(id, payload) {
  const { data } = await apiClient.post(`/patients/${id}/account`, payload);
  return data;
}

const patientService = { getAll, getById, create, update, createAccount };
export default patientService;
