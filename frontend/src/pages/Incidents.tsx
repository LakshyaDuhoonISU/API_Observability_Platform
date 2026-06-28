import React, { useState } from 'react';
import { Table, Tag, Select, message, Modal, Typography, Segmented } from 'antd';
import {
  AlertOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { incidentService } from '../services/incidentService';
import type { Incident, IncidentStatus } from '../types';

dayjs.extend(relativeTime);

const { Text } = Typography;

const severityColors: Record<string, string> = {
  critical: 'red',
  major: 'orange',
  minor: 'blue',
};

const statusColors: Record<string, string> = {
  open: 'red',
  investigating: 'orange',
  resolved: 'green',
  closed: 'default',
};

const Incidents: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', statusFilter, severityFilter, page],
    queryFn: () =>
      incidentService.getIncidents({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        page,
        limit: 20,
      }),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
      incidentService.updateIncident(id, { status }),
    onSuccess: () => {
      message.success('Incident status updated');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Failed to update incident');
    },
  });

  const handleStatusChange = (incident: Incident, newStatus: IncidentStatus) => {
    Modal.confirm({
      title: `Update Incident Status`,
      icon: <ExclamationCircleOutlined />,
      content: `Change status from "${incident.status}" to "${newStatus}"?`,
      onOk: () => updateMutation.mutate({ id: incident._id, status: newStatus }),
    });
  };

  const getNextStatuses = (current: string): IncidentStatus[] => {
    const transitions: Record<string, IncidentStatus[]> = {
      open: ['investigating', 'resolved', 'closed'],
      investigating: ['resolved', 'closed'],
      resolved: ['closed'],
      closed: [],
    };
    return transitions[current] || [];
  };

  const columns = [
    {
      title: 'API',
      dataIndex: 'apiName',
      key: 'apiName',
      render: (val: string, record: Incident) => (
        <div>
          <Text strong style={{ color: '#f3f4f6', display: 'block' }}>
            {val}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>
            {record.apiUrl}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (val: string) => (
        <Tag color={statusColors[val] || 'default'}>
          {val.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (val: string) => (
        <Tag color={severityColors[val] || 'default'}>
          {val.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Failure Reason',
      dataIndex: 'failureReason',
      key: 'failureReason',
      ellipsis: true,
      render: (val: string) => (
        <Text style={{ color: '#ef4444', fontSize: 12 }}>{val}</Text>
      ),
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 140,
      render: (val: string) => (
        <Text style={{ color: '#9ca3af', fontSize: 12 }}>
          {dayjs(val).format('MMM DD, HH:mm')}
        </Text>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (val: number | null) => {
        if (!val) return <Tag color="red">Ongoing</Tag>;
        if (val < 60) return `${val}s`;
        if (val < 3600) return `${Math.round(val / 60)}min`;
        return `${(val / 3600).toFixed(1)}h`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: Incident) => {
        const nextStatuses = getNextStatuses(record.status);
        if (nextStatuses.length === 0) return null;
        return (
          <Select
            placeholder="Update..."
            size="small"
            style={{ width: 140 }}
            onChange={(val) => handleStatusChange(record, val as IncidentStatus)}
            value={undefined as unknown as IncidentStatus}
          >
            {nextStatuses.map((s) => (
              <Select.Option key={s} value={s}>
                → {s.charAt(0).toUpperCase() + s.slice(1)}
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
  ];

  const incidents = data?.data || [];

  return (
    <div>
      <div className="page-header">
        <h1>Incidents</h1>
        <p>Track and manage API outages and failures</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Segmented
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val as string);
            setPage(1);
          }}
          options={[
            { label: 'All', value: 'all' },
            { label: '🔴 Open', value: 'open' },
            { label: '🟠 Investigating', value: 'investigating' },
            { label: '🟢 Resolved', value: 'resolved' },
            { label: '⚪ Closed', value: 'closed' },
          ]}
        />
        <Select
          value={severityFilter}
          onChange={(val) => {
            setSeverityFilter(val);
            setPage(1);
          }}
          style={{ width: 140 }}
        >
          <Select.Option value="all">All Severity</Select.Option>
          <Select.Option value="critical">Critical</Select.Option>
          <Select.Option value="major">Major</Select.Option>
          <Select.Option value="minor">Minor</Select.Option>
        </Select>
      </div>

      {/* Incidents Table */}
      <div className="chart-container" style={{ padding: 0, overflow: 'hidden' }}>
        {incidents.length === 0 && !isLoading ? (
          <div className="empty-state">
            <AlertOutlined />
            <h3>No Incidents</h3>
            <p>
              {statusFilter !== 'all' || severityFilter !== 'all'
                ? 'No incidents match your filters'
                : 'No incidents detected — your APIs are running smoothly!'}
            </p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={incidents}
            rowKey="_id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: 20,
              total: data?.pagination?.total || 0,
              onChange: (p) => setPage(p),
              showSizeChanger: false,
            }}
            size="middle"
          />
        )}
      </div>
    </div>
  );
};

export default Incidents;
