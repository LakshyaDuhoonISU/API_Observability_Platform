import apiClient from './apiClient';
import type { User, AuthResponse } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/api/auth/login', { email, password });
    return data;
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/api/auth/register', { name, email, password });
    return data;
  },

  getMe: async (): Promise<{ success: boolean; data: { user: User } }> => {
    const { data } = await apiClient.get('/api/auth/me');
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string; data: { token: string } }> => {
    const { data } = await apiClient.put('/api/auth/password', { currentPassword, newPassword });
    return data;
  },
};
