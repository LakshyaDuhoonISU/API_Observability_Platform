import apiClient from './apiClient';
import type {
  ApiMonitor,
  CreateApiPayload,
  MonitoringResult,
  ApiMetrics,
  DashboardMetrics,
  DashboardCharts,
  ResponseTimeTrendItem,
  PaginatedResponse,
  ApiResponse,
  TimeRange,
} from '../types';

export const apiService = {
  // API CRUD
  createApi: async (payload: CreateApiPayload): Promise<ApiResponse<ApiMonitor>> => {
    const { data } = await apiClient.post('/api/apis', payload);
    return data;
  },

  getApis: async (params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<ApiMonitor>> => {
    const { data } = await apiClient.get('/api/apis', { params });
    return data;
  },

  getApi: async (id: string): Promise<ApiResponse<ApiMonitor>> => {
    const { data } = await apiClient.get(`/api/apis/${id}`);
    return data;
  },

  updateApi: async (id: string, payload: Partial<CreateApiPayload>): Promise<ApiResponse<ApiMonitor>> => {
    const { data } = await apiClient.put(`/api/apis/${id}`, payload);
    return data;
  },

  deleteApi: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/api/apis/${id}`);
    return data;
  },

  triggerCheck: async (id: string): Promise<ApiResponse<{ api: ApiMonitor; result: MonitoringResult }>> => {
    const { data } = await apiClient.post(`/api/apis/${id}/check`);
    return data;
  },

  // Monitoring
  getMonitoringResults: async (
    apiId: string,
    params?: { page?: number; limit?: number; timeRange?: string }
  ): Promise<PaginatedResponse<MonitoringResult>> => {
    const { data } = await apiClient.get(`/api/monitoring/${apiId}/results`, { params });
    return data;
  },

  getApiMetrics: async (apiId: string, timeRange: TimeRange = '24h'): Promise<ApiResponse<ApiMetrics>> => {
    const { data } = await apiClient.get(`/api/monitoring/${apiId}/metrics`, { params: { timeRange } });
    return data;
  },

  getResponseTimeTrend: async (apiId: string, timeRange: TimeRange = '24h'): Promise<ApiResponse<ResponseTimeTrendItem[]>> => {
    const { data } = await apiClient.get(`/api/monitoring/${apiId}/trend`, { params: { timeRange } });
    return data;
  },

  // Dashboard
  getDashboardMetrics: async (): Promise<ApiResponse<DashboardMetrics>> => {
    const { data } = await apiClient.get('/api/monitoring/dashboard');
    return data;
  },

  getDashboardCharts: async (timeRange: TimeRange = '24h'): Promise<ApiResponse<DashboardCharts>> => {
    const { data } = await apiClient.get('/api/monitoring/dashboard/charts', { params: { timeRange } });
    return data;
  },
};
