import apiClient from './apiClient';
import { clientError } from './clientError';
import { validateFile } from '../utils/fileValidation';

// Patient Document Vault: reusable documents stored once per patient
// (Government ID, Insurance Card, Policy Document).
async function getAll(patientId) {
  const { data } = await apiClient.get('/patient-documents', { params: { patientId } });
  return data;
}

// Uploading a type that already exists REPLACES the old copy.
async function upload({ file, patientId, type, expiryDate }) {
  const { valid, error } = validateFile(file);
  if (!valid) throw clientError(error, 400);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('patientId', patientId);
  formData.append('type', type);
  if (expiryDate) formData.append('expiryDate', expiryDate);

  const { data } = await apiClient.post('/patient-documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

async function remove(id) {
  await apiClient.delete(`/patient-documents/${id}`);
  return true;
}

const patientDocumentService = { getAll, upload, remove };
export default patientDocumentService;
