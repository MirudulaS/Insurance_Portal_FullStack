import apiClient from './apiClient';

async function getHospitals() {
  const { data } = await apiClient.get('/hospitals');
  return data;
}

async function getInsurers() {
  const { data } = await apiClient.get('/insurers');
  return data;
}

const organizationService = { getHospitals, getInsurers };
export default organizationService;
