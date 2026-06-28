// ===== User Types =====
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

// ===== API Types =====
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ApiStatus = 'healthy' | 'degraded' | 'offline' | 'unknown';
export type MonitoringInterval = '1m' | '5m' | '15m' | '1h';

export interface ApiMonitor {
  _id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
  expectedStatusCode: number;
  expectedJsonFields: string[];
  timeout: number;
  interval: MonitoringInterval;
  status: ApiStatus;
  lastCheckedAt: string | null;
  lastFailedAt: string | null;
  lastResponseTime: number | null;
  consecutiveFailures: number;
  isActive: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiPayload {
  name: string;
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  expectedStatusCode?: number;
  expectedJsonFields?: string[];
  timeout?: number;
  interval?: MonitoringInterval;
}

// ===== Monitoring Types =====
export interface MonitoringResult {
  _id: string;
  api: string;
  user: string;
  timestamp: string;
  statusCode: number | null;
  responseTime: number | null;
  success: boolean;
  errorMessage: string | null;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
  contentType: string | null;
  validationErrors: string[];
  createdAt: string;
}

export interface ApiMetrics {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  uptime: number;
  successRate: number;
  failureRate: number;
}

export interface DashboardMetrics {
  totalApis: number;
  healthyApis: number;
  degradedApis: number;
  offlineApis: number;
  unknownApis: number;
  activeIncidents: number;
  avgResponseTime: number;
  avgUptime: number;
}

export interface ResponseTimeTrendItem {
  time: string;
  avg: number;
  max?: number;
  min?: number;
  count: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface TopSlowApi {
  _id: string;
  apiName: string;
  apiUrl: string;
  avgResponseTime: number;
}

export interface IncidentOverTimeItem {
  time: string;
  count: number;
}

export interface UptimeByApiItem {
  _id: string;
  apiName: string;
  uptime: number;
  totalChecks: number;
}

export interface DashboardCharts {
  responseTimeTrend: ResponseTimeTrendItem[];
  statusDistribution: StatusDistributionItem[];
  topSlowApis: TopSlowApi[];
  incidentsOverTime: IncidentOverTimeItem[];
  uptimeByApi: UptimeByApiItem[];
}

// ===== Incident Types =====
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type IncidentSeverity = 'critical' | 'major' | 'minor';

export interface Incident {
  _id: string;
  api: string;
  user: string;
  apiName: string;
  apiUrl: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  failureReason: string;
  startedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  duration: number | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

// ===== Common Types =====
export type TimeRange = '24h' | '7d' | '30d';

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
