import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // This sends cookies
});

// We don't need interceptors for token refresh if we use cookies with httpOnly
// But we might still need to handle 401 errors and redirect to login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear user and redirect
      // We'll handle this in the auth context
    }
    return Promise.reject(error);
  }
);