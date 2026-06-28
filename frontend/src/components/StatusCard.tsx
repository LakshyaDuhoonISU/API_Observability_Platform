import React from 'react';

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

const accentColors: Record<string, string> = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

const accentBgColors: Record<string, string> = {
  primary: 'rgba(99, 102, 241, 0.1)',
  success: 'rgba(16, 185, 129, 0.1)',
  warning: 'rgba(245, 158, 11, 0.1)',
  danger: 'rgba(239, 68, 68, 0.1)',
  info: 'rgba(59, 130, 246, 0.1)',
  purple: 'rgba(139, 92, 246, 0.1)',
};

const StatusCard: React.FC<StatusCardProps> = ({ title, value, icon, accent }) => {
  return (
    <div className={`glass-card stat-card accent-${accent} fade-in-up`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f3f4f6', lineHeight: 1 }}>
            {value}
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: accentBgColors[accent],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: accentColors[accent],
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
