import apiClient from './apiClient';
import { clientError } from './clientError';
import { validateFile } from '../utils/fileValidation';

async function getAll(filters = {}) {
  const { data } = await apiClient.get('/documents', { params: filters });
  return data;
}

async function getById(id) {
  const { data } = await apiClient.get(`/documents/${id}`);
  return data;
}

async function upload({ file, type, preAuthorizationId = null, claimId = null }) {
  const { valid, error } = validateFile(file);
  if (!valid) throw clientError(error, 400);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  if (preAuthorizationId) formData.append('preAuthorizationId', preAuthorizationId);
  if (claimId) formData.append('claimId', claimId);

  const { data } = await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

async function remove(id) {
  await apiClient.delete(`/documents/${id}`);
  return true;
}

const documentService = { getAll, getById, upload, remove };
export default documentService;
