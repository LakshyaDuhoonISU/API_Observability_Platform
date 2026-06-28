import apiClient from './apiClient';
import type { Incident, PaginatedResponse, ApiResponse, IncidentStatus, IncidentSeverity } from '../types';

export const incidentService = {
  getIncidents: async (params?: {
    status?: string;
    severity?: string;
    apiId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Incident>> => {
    const { data } = await apiClient.get('/api/incidents', { params });
    return data;
  },

  getIncident: async (id: string): Promise<ApiResponse<Incident>> => {
    const { data } = await apiClient.get(`/api/incidents/${id}`);
    return data;
  },

  updateIncident: async (
    id: string,
    payload: { status?: IncidentStatus; severity?: IncidentSeverity }
  ): Promise<ApiResponse<Incident>> => {
    const { data } = await apiClient.put(`/api/incidents/${id}`, payload);
    return data;
  },

  deleteIncident: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/api/incidents/${id}`);
    return data;
  },
};
