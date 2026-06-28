import apiClient from './apiClient';
import type { TimeRange } from '../types';

export const reportService = {
  generateReport: async (timeRange: TimeRange = '7d'): Promise<Blob> => {
    const { data } = await apiClient.get('/api/reports/generate', {
      params: { timeRange },
      responseType: 'blob',
    });
    return data;
  },

  downloadReport: async (timeRange: TimeRange = '7d'): Promise<void> => {
    const blob = await reportService.generateReport(timeRange);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-observability-report-${timeRange}-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
