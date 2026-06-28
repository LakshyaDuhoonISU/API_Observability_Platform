import React from 'react';
import { Tooltip, Typography } from 'antd';
import { ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ApiMonitor } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface Props {
  api: ApiMonitor;
}

const APICard: React.FC<Props> = ({ api }) => {
  const navigate = useNavigate();

  const intervalLabels: Record<string, string> = {
    '1m': '1 min',
    '5m': '5 min',
    '15m': '15 min',
    '1h': '1 hour',
  };

  return (
    <div
      className="glass-card fade-in-up"
      onClick={() => navigate(`/apis/${api._id}`)}
      style={{ cursor: 'pointer', padding: 20 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`status-dot ${api.status}`} />
          <Text strong style={{ color: '#f3f4f6', fontSize: 15 }}>
            {api.name}
          </Text>
        </div>
        <span className={`method-badge ${api.method}`}>{api.method}</span>
      </div>

      <Text
        style={{
          color: '#6b7280',
          fontSize: 12,
          display: 'block',
          marginBottom: 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {api.url}
      </Text>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Tooltip title="Last Response Time">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af', fontSize: 12 }}>
              <ThunderboltOutlined />
              {api.lastResponseTime ? `${api.lastResponseTime}ms` : '—'}
            </div>
          </Tooltip>
          <Tooltip title="Monitoring Interval">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af', fontSize: 12 }}>
              <ClockCircleOutlined />
              {intervalLabels[api.interval] || api.interval}
            </div>
          </Tooltip>
        </div>
        <Text style={{ color: '#4b5563', fontSize: 11 }}>
          {api.lastCheckedAt ? dayjs(api.lastCheckedAt).fromNow() : 'Never checked'}
        </Text>
      </div>
    </div>
  );
};

export default APICard;
