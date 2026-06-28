import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Spin,
  Button,
  Tag,
  Table,
  Segmented,
  Popconfirm,
  message,
  Collapse,
  Typography,
  Space,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { apiService } from '../services/apiService';
import { incidentService } from '../services/incidentService';
import type { TimeRange } from '../types';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const APIDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [resultsPage, setResultsPage] = useState(1);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['api', id],
    queryFn: () => apiService.getApi(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: metricsData } = useQuery({
    queryKey: ['apiMetrics', id, timeRange],
    queryFn: () => apiService.getApiMetrics(id!, timeRange),
    enabled: !!id,
  });

  const { data: trendData } = useQuery({
    queryKey: ['apiTrend', id, timeRange],
    queryFn: () => apiService.getResponseTimeTrend(id!, timeRange),
    enabled: !!id,
  });

  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ['apiResults', id, resultsPage, timeRange],
    queryFn: () => apiService.getMonitoringResults(id!, { page: resultsPage, limit: 15, timeRange }),
    enabled: !!id,
  });

  const { data: incidentsData } = useQuery({
    queryKey: ['apiIncidents', id],
    queryFn: () => incidentService.getIncidents({ apiId: id!, limit: 10 }),
    enabled: !!id,
  });

  const triggerCheckMutation = useMutation({
    mutationFn: () => apiService.triggerCheck(id!),
    onSuccess: () => {
      message.success('Health check triggered');
      queryClient.invalidateQueries({ queryKey: ['api', id] });
      queryClient.invalidateQueries({ queryKey: ['apiMetrics', id] });
      queryClient.invalidateQueries({ queryKey: ['apiResults', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiService.deleteApi(id!),
    onSuccess: () => {
      message.success('API monitor deleted');
      queryClient.invalidateQueries({ queryKey: ['apis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      navigate('/apis');
    },
  });

  if (isLoading || !apiData?.data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const api = apiData.data;
  const metrics = metricsData?.data;
  const trend = trendData?.data || [];
  const results = resultsData?.data || [];
  const incidents = incidentsData?.data || [];

  const resultsColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (val: string) => dayjs(val).format('MMM DD, HH:mm:ss'),
    },
    {
      title: 'Status',
      dataIndex: 'success',
      key: 'success',
      render: (val: boolean) =>
        val ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Success
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Failed
          </Tag>
        ),
    },
    {
      title: 'Status Code',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (val: number | null) =>
        val ? (
          <Tag color={val >= 200 && val < 300 ? 'success' : val >= 400 ? 'error' : 'warning'}>
            {val}
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (val: number | null) => (val !== null ? `${val}ms` : '—'),
    },
    {
      title: 'Error',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (val: string | null) =>
        val ? (
          <Tooltip title={val}>
            <Text style={{ color: '#ef4444', fontSize: 12 }}>{val}</Text>
          </Tooltip>
        ) : (
          '—'
        ),
    },
  ];

  // Get latest result for response viewer
  const latestResult = results.length > 0 ? results[0] : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/apis')}
            style={{ borderRadius: 10 }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`status-dot ${api.status}`} />
              <Title level={3} style={{ margin: 0, color: '#f3f4f6' }}>
                {api.name}
              </Title>
              <span className={`method-badge ${api.method}`}>{api.method}</span>
            </div>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>{api.url}</Text>
          </div>
        </div>
        <Space>
          <Segmented
            value={timeRange}
            onChange={(val) => setTimeRange(val as TimeRange)}
            options={[
              { label: '24h', value: '24h' },
              { label: '7d', value: '7d' },
              { label: '30d', value: '30d' },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => triggerCheckMutation.mutate()}
            loading={triggerCheckMutation.isPending}
          >
            Check Now
          </Button>
          <Popconfirm
            title="Delete this API monitor?"
            description="This will also delete all monitoring history and incidents."
            onConfirm={() => deleteMutation.mutate()}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Avg Response Time', value: `${metrics?.avgResponseTime || 0}ms`, color: '#6366f1' },
          { label: 'Uptime', value: `${metrics?.uptime || 0}%`, color: '#10b981' },
          { label: 'Success Rate', value: `${metrics?.successRate || 0}%`, color: '#3b82f6' },
          { label: 'Total Checks', value: metrics?.totalChecks || 0, color: '#8b5cf6' },
          {
            label: 'Last Check',
            value: api.lastCheckedAt ? dayjs(api.lastCheckedAt).fromNow() : 'Never',
            color: '#9ca3af',
          },
          {
            label: 'Last Failure',
            value: api.lastFailedAt ? dayjs(api.lastFailedAt).fromNow() : 'None',
            color: api.lastFailedAt ? '#ef4444' : '#10b981',
          },
        ].map((item, i) => (
          <Col key={i} xs={12} sm={8} lg={4}>
            <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
              <Text style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: item.color, marginTop: 4 }}>
                {item.value}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Response Time Chart */}
      <div className="chart-container" style={{ marginBottom: 24 }}>
        <h3>Response Time Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="colorDetailAvg" x1="0" y1="0" x2="0" y2="1">
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
            <RechartsTooltip
              contentStyle={{
                background: '#1a2035',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
              }}
              formatter={(value: unknown, name: unknown) => [`${value}ms`, (name as string) === 'avg' ? 'Average' : (name as string) === 'max' ? 'Max' : 'Min']}
            />
            <Area type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorDetailAvg)" name="avg" />
            {trend[0]?.max !== undefined && (
              <Area type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={1} fillOpacity={0} strokeDasharray="4 4" name="max" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monitoring History Table */}
      <div className="chart-container" style={{ marginBottom: 24 }}>
        <h3>Monitoring History</h3>
        <Table
          columns={resultsColumns}
          dataSource={results}
          rowKey="_id"
          loading={resultsLoading}
          pagination={{
            current: resultsPage,
            pageSize: 15,
            total: resultsData?.pagination?.total || 0,
            onChange: (page) => setResultsPage(page),
            showSizeChanger: false,
          }}
          size="small"
        />
      </div>

      {/* Recent Incidents */}
      {incidents.length > 0 && (
        <div className="chart-container" style={{ marginBottom: 24 }}>
          <h3>Recent Incidents</h3>
          {incidents.map((incident) => (
            <div
              key={incident._id}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <Tag
                  color={
                    incident.status === 'open'
                      ? 'red'
                      : incident.status === 'investigating'
                      ? 'orange'
                      : incident.status === 'resolved'
                      ? 'green'
                      : 'default'
                  }
                >
                  {incident.status.toUpperCase()}
                </Tag>
                <Text style={{ color: '#f3f4f6', marginLeft: 8 }}>
                  {incident.failureReason}
                </Text>
              </div>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>
                {dayjs(incident.startedAt).fromNow()}
                {incident.duration && ` · ${Math.round(incident.duration / 60)}min`}
              </Text>
            </div>
          ))}
        </div>
      )}

      {/* Last Response */}
      {latestResult && (
        <div className="chart-container">
          <h3>Last Response</h3>
          <Collapse
            ghost
            defaultActiveKey={['body']}
            items={[
              {
                key: 'body',
                label: <Text style={{ color: '#9ca3af' }}>Response Body</Text>,
                children: (
                  <pre
                    style={{
                      background: '#0a0e1a',
                      padding: 16,
                      borderRadius: 10,
                      fontSize: 12,
                      color: '#a78bfa',
                      overflow: 'auto',
                      maxHeight: 300,
                      margin: 0,
                    }}
                  >
                    {latestResult.responseBody
                      ? typeof latestResult.responseBody === 'string'
                        ? (() => {
                            try {
                              return JSON.stringify(JSON.parse(latestResult.responseBody as string), null, 2);
                            } catch {
                              return latestResult.responseBody as string;
                            }
                          })()
                        : JSON.stringify(latestResult.responseBody, null, 2)
                      : 'No response body'}
                  </pre>
                ),
              },
              {
                key: 'headers',
                label: <Text style={{ color: '#9ca3af' }}>Response Headers</Text>,
                children: (
                  <pre
                    style={{
                      background: '#0a0e1a',
                      padding: 16,
                      borderRadius: 10,
                      fontSize: 12,
                      color: '#10b981',
                      overflow: 'auto',
                      maxHeight: 200,
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(latestResult.responseHeaders || {}, null, 2)}
                  </pre>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default APIDetails;
