import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * The single Axios instance the whole app uses. Nothing outside src/services
 * should import axios directly.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the JWT (once real auth exists) to every request automatically.
apiClient.interceptors.request.use((request) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

// Normalize error shape so UI error states can rely on `error.message` and
// `error.status` whether it came from the server or from client-side validation.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    if (status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }

    return Promise.reject({ status, message, raw: error });
  }
);

export default apiClient;
