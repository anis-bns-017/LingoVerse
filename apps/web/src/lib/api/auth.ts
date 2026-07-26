import { apiClient } from './client';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  nativeLanguage?: string;
  learningLanguages?: string[];
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: any;
  // no tokens in response; they are in cookies
}

export const authApi = {
  register: (data: RegisterData) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginData) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  logout: () =>
    apiClient.post('/auth/logout'),

  getMe: () =>
    apiClient.get('/auth/me'),
};