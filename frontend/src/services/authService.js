import apiClient from './apiClient';
import socketService from './socketService';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'currentUser';

async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  // Drop any live connection left from the previous user so this login's
  // socket (and its private notification room) is opened with the NEW token.
  socketService.disconnect();
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

async function register(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data;
}

async function getOrganizations() {
  const { data } = await apiClient.get('/auth/organizations');
  return data;
}

async function changePassword(currentPassword, newPassword) {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword });
}

async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    socketService.disconnect();
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function getMe() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

const authService = { login, register, logout, getMe, getStoredUser, getOrganizations, changePassword };
export default authService;
