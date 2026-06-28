import React, { useState } from 'react';
import { Row, Col, Spin, Segmented } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  AlertOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { apiService } from '../services/apiService';
import type { TimeRange } from '../types';
import StatusCard from '../components/StatusCard';

const STATUS_COLORS: Record<string, string> = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  offline: '#ef4444',
  unknown: '#6b7280',
};

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: () => apiService.getDashboardMetrics(),
    refetchInterval: 30000,
  });

  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboardCharts', timeRange],
    queryFn: () => apiService.getDashboardCharts(timeRange),
    refetchInterval: 30000,
  });

  const metrics = metricsData?.data;
  const charts = chartsData?.data;

  if (metricsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const pieData = charts?.statusDistribution?.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280',
  })) || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Real-time overview of your API monitoring</p>
        </div>
        <Segmented
          value={timeRange}
          onChange={(val) => setTimeRange(val as TimeRange)}
          options={[
            { label: '24h', value: '24h' },
            { label: '7d', value: '7d' },
            { label: '30d', value: '30d' },
          ]}
        />
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <StatusCard
            title="Total APIs"
            value={metrics?.totalApis || 0}
            icon={<ApiOutlined />}
            accent="primary"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatusCard
            title="Healthy"
            value={metrics?.healthyApis || 0}
            icon={<CheckCircleOutlined />}
            accent="success"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatusCard
            title="Degraded"
            value={metrics?.degradedApis || 0}
            icon={<WarningOutlined />}
            accent="warning"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatusCard
            title="Offline"
            value={metrics?.offlineApis || 0}
            icon={<CloseCircleOutlined />}
            accent="danger"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatusCard
            title="Incidents"
            value={metrics?.activeIncidents || 0}
            icon={<AlertOutlined />}
            accent="info"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatusCard
            title="Avg Response"
            value={`${metrics?.avgResponseTime || 0}ms`}
            icon={<ClockCircleOutlined />}
            accent="purple"
          />
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <div className="chart-container fade-in-up">
            <h3>Response Time Trend</h3>
            {chartsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={charts?.responseTimeTrend || []}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="time"
                    stroke="#4b5563"
                    fontSize={11}
                    tickFormatter={(val) => {
                      if (val.includes('T')) return val.split('T')[1] || val;
                      return val.split('-').slice(1).join('/');
                    }}
                  />
                  <YAxis stroke="#4b5563" fontSize={11} tickFormatter={(val) => `${val}ms`} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a2035',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                    }}
                    formatter={(value: unknown) => [`${value}ms`, 'Avg Response Time']}
                  />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAvg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="chart-container fade-in-up">
            <h3>Status Distribution</h3>
            {chartsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a2035',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: '#6b7280' }}>
                No data available
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
              {pieData.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  <span style={{ color: '#9ca3af' }}>{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <div className="chart-container fade-in-up">
            <h3>Incidents Over Time</h3>
            {chartsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={charts?.incidentsOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="time"
                    stroke="#4b5563"
                    fontSize={11}
                    tickFormatter={(val) => {
                      if (val.includes('T')) return val.split('T')[1] || val;
                      return val.split('-').slice(1).join('/');
                    }}
                  />
                  <YAxis stroke="#4b5563" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a2035',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="chart-container fade-in-up">
            <h3>Uptime by API</h3>
            {chartsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={charts?.uptimeByApi || []}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" domain={[0, 100]} stroke="#4b5563" fontSize={11} tickFormatter={(val) => `${val}%`} />
                  <YAxis
                    type="category"
                    dataKey="apiName"
                    stroke="#4b5563"
                    fontSize={11}
                    width={80}
                    tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '…' : val}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1a2035',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                    }}
                    formatter={(value: unknown) => [`${value}%`, 'Uptime']}
                  />
                  <Bar dataKey="uptime" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="chart-container fade-in-up">
            <h3>Top Slow APIs</h3>
            {chartsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={charts?.topSlowApis || []}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" stroke="#4b5563" fontSize={11} tickFormatter={(val) => `${val}ms`} />
                  <YAxis
                    type="category"
                    dataKey="apiName"
                    stroke="#4b5563"
                    fontSize={11}
                    width={80}
                    tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '…' : val}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1a2035',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                    }}
                    formatter={(value: unknown) => [`${value}ms`, 'Avg Response Time']}
                  />
                  <Bar dataKey="avgResponseTime" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
