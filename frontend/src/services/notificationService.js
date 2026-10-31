import apiClient from './apiClient';

async function getAll() {
  const { data } = await apiClient.get('/notifications');
  return data;
}

async function markAsRead(id) {
  const { data } = await apiClient.put(`/notifications/${id}/read`);
  return data;
}

async function markAllAsRead() {
  await apiClient.put('/notifications/read-all');
  return true;
}

const notificationService = { getAll, markAsRead, markAllAsRead };
export default notificationService;
