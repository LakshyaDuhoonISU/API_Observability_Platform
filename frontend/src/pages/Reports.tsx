import React, { useState } from 'react';
import { Row, Col, Button, Segmented, Spin, message, Typography } from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { reportService } from '../services/reportService';
import type { TimeRange } from '../types';

const { Text, Title } = Typography;

const Reports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [downloading, setDownloading] = useState(false);

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: () => apiService.getDashboardMetrics(),
  });

  const { data: chartsData } = useQuery({
    queryKey: ['dashboardCharts', timeRange],
    queryFn: () => apiService.getDashboardCharts(timeRange),
  });

  const metrics = metricsData?.data;
  const charts = chartsData?.data;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await reportService.downloadReport(timeRange);
      message.success('Report downloaded successfully!');
    } catch {
      message.error('Failed to generate report');
    } finally {
      setDownloading(false);
    }
  };

  const timeRangeLabels: Record<string, string> = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Reports</h1>
          <p>Generate and download PDF reports for your API monitoring data</p>
        </div>
        <Segmented
          value={timeRange}
          onChange={(val) => setTimeRange(val as TimeRange)}
          options={[
            { label: '24 Hours', value: '24h' },
            { label: '7 Days', value: '7d' },
            { label: '30 Days', value: '30d' },
          ]}
        />
      </div>

      {/* Report Preview */}
      <div className="chart-container" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: '#6366f1',
              }}
            >
              <FileTextOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#f3f4f6' }}>
                API Observability Report
              </Title>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>
                {timeRangeLabels[timeRange]} · Generated {new Date().toLocaleDateString()}
              </Text>
            </div>
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={downloading}
            size="large"
          >
            Download PDF
          </Button>
        </div>

        {/* Report Summary Preview */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Text style={{ color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 16 }}>
              Report Preview
            </Text>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { icon: <ThunderboltOutlined />, label: 'Total APIs', value: metrics?.totalApis || 0, color: '#6366f1' },
                { icon: <CheckCircleOutlined />, label: 'Healthy APIs', value: metrics?.healthyApis || 0, color: '#10b981' },
                { icon: <AlertOutlined />, label: 'Active Incidents', value: metrics?.activeIncidents || 0, color: '#ef4444' },
                { icon: <ClockCircleOutlined />, label: 'Avg Response Time', value: `${metrics?.avgResponseTime || 0}ms`, color: '#f59e0b' },
              ].map((item, i) => (
                <Col key={i} xs={12} sm={6}>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ color: item.color, fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f3f4f6' }}>{item.value}</div>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.label}</Text>
                  </div>
                </Col>
              ))}
            </Row>

            {/* Report Contents */}
            <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <Text strong style={{ color: '#f3f4f6', display: 'block', marginBottom: 12 }}>
                Report Contents
              </Text>
              {[
                'Platform Overview & KPIs',
                'Most Frequently Failing APIs',
                'Top Slow APIs by Response Time',
                'Incident Summary & Timeline',
                'Uptime Percentage by API',
                'Average Response Time Analysis',
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <CheckCircleOutlined style={{ color: '#6366f1', fontSize: 14 }} />
                  <Text style={{ color: '#9ca3af', fontSize: 13 }}>{item}</Text>
                </div>
              ))}
            </div>

            {/* Top Slow APIs Preview */}
            {charts?.topSlowApis && charts.topSlowApis.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Text strong style={{ color: '#f3f4f6', display: 'block', marginBottom: 12 }}>
                  Top Slow APIs
                </Text>
                {charts.topSlowApis.map((api, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: '#f3f4f6', fontSize: 13 }}>{api.apiName}</Text>
                    <Text style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>
                      {api.avgResponseTime}ms
                    </Text>
                  </div>
                ))}
              </div>
            )}

            {/* Uptime Preview */}
            {charts?.uptimeByApi && charts.uptimeByApi.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Text strong style={{ color: '#f3f4f6', display: 'block', marginBottom: 12 }}>
                  Uptime by API
                </Text>
                {charts.uptimeByApi.map((api, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: '#f3f4f6', fontSize: 13 }}>{api.apiName}</Text>
                    <Text
                      style={{
                        color: api.uptime >= 99 ? '#10b981' : api.uptime >= 95 ? '#f59e0b' : '#ef4444',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {api.uptime}%
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
