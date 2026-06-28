import React, { useState } from 'react';
import { Row, Col, Input, Segmented, Button, Spin } from 'antd';
import { PlusOutlined, SearchOutlined, ApiOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import APICard from '../components/APICard';
import CreateAPIModal from '../components/CreateAPIModal';

const APIs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['apis', search, statusFilter],
    queryFn: () => apiService.getApis({ search, status: statusFilter }),
    refetchInterval: 15000,
  });

  const apis = data?.data || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>API Monitors</h1>
          <p>Manage and monitor your APIs</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          size="large"
        >
          Add API
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          placeholder="Search APIs..."
          prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
          allowClear
        />
        <Segmented
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as string)}
          options={[
            { label: 'All', value: 'all' },
            { label: '🟢 Healthy', value: 'healthy' },
            { label: '🟡 Degraded', value: 'degraded' },
            { label: '🔴 Offline', value: 'offline' },
          ]}
        />
      </div>

      {/* API Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : apis.length === 0 ? (
        <div className="empty-state">
          <ApiOutlined />
          <h3>No APIs Found</h3>
          <p>{search || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Add your first API monitor to get started'}</p>
          {!search && statusFilter === 'all' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              style={{ marginTop: 16 }}
            >
              Add Your First API
            </Button>
          )}
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {apis.map((api) => (
            <Col key={api._id} xs={24} sm={12} lg={8} xl={6}>
              <APICard api={api} />
            </Col>
          ))}
        </Row>
      )}

      <CreateAPIModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default APIs;
