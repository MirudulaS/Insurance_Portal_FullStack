import apiClient from './apiClient';

async function getAll(filters = {}) {
  const { data } = await apiClient.get('/queries', { params: filters });
  return data;
}

async function getById(id) {
  const { data } = await apiClient.get(`/queries/${id}`);
  return data;
}

async function respond(id, { text, attachments = [] }) {
  const { data } = await apiClient.post(`/queries/${id}/respond`, { text, attachments });
  return data;
}

async function resolve(id) {
  const { data } = await apiClient.post(`/queries/${id}/resolve`);
  return data;
}

const queryService = { getAll, getById, respond, resolve };
export default queryService;
