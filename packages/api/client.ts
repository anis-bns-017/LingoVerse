import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend the request config to add a _retry flag
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Base URL – allow override via environment variable
const API_URL = import.meta?.env?.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:3000';

// Create the Axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // 👈 Send cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// ------------------------------------------------------------------
// Response interceptor to handle token refresh (if using cookies,
// this is less critical, but we keep it for robustness)
// ------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // The new access token is set via cookie, so we don't need to store it
        // Just retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed – clear cookies and redirect to login
        // This will be handled by the app's auth context
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ------------------------------------------------------------------
// Simple helper to get the current user (used in auth context)
// ------------------------------------------------------------------
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch {
    return null;
  }
};