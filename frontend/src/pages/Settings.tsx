import React, { useState } from 'react';
import { Form, Input, Button, message, Typography, Row, Col, Tag } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm] = Form.useForm();

  const handlePasswordChange = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('New passwords do not match');
      return;
    }

    if (values.currentPassword === values.newPassword) {
      message.error('New password cannot be the same as the current password');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await authService.changePassword(values.currentPassword, values.newPassword);
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
      }
      message.success('Password updated successfully');
      passwordForm.resetFields();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Section */}
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <h3 style={{ marginBottom: 24 }}>Profile Information</h3>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: 20,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <Text strong style={{ color: '#f3f4f6', fontSize: 18, display: 'block' }}>
                  {user?.name}
                </Text>
                <Text style={{ color: '#6b7280', display: 'block' }}>{user?.email}</Text>
                <Tag color="blue" style={{ marginTop: 6 }}>Active Account</Tag>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserOutlined style={{ color: '#6366f1' }} />
                  <Text style={{ color: '#9ca3af' }}>Name</Text>
                </div>
                <Text style={{ color: '#f3f4f6' }}>{user?.name}</Text>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MailOutlined style={{ color: '#6366f1' }} />
                  <Text style={{ color: '#9ca3af' }}>Email</Text>
                </div>
                <Text style={{ color: '#f3f4f6' }}>{user?.email}</Text>
              </div>
            </div>
          </div>
        </Col>

        {/* Change Password */}
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <h3 style={{ marginBottom: 24 }}>Change Password</h3>

            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                name="currentPassword"
                label="Current Password"
                rules={[{ required: true, message: 'Please enter current password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#6b7280' }} />}
                  placeholder="Enter current password"
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter new password' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#6b7280' }} />}
                  placeholder="Enter new password"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                rules={[
                  { required: true, message: 'Please confirm new password' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#6b7280' }} />}
                  placeholder="Confirm new password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={passwordLoading}
                  icon={<SaveOutlined />}
                >
                  Update Password
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>

        {/* About Section */}
        <Col xs={24}>
          <div className="chart-container">
            <h3 style={{ marginBottom: 16 }}>About</h3>
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
              }}
            >
              <Title level={4} style={{ color: '#f3f4f6', margin: 0 }}>
                <span className="gradient-text">API Observability Platform</span>
              </Title>
              <Text style={{ color: '#9ca3af', display: 'block', marginTop: 8, lineHeight: 1.8 }}>
                A full-stack API monitoring platform capable of continuously monitoring REST APIs through
                scheduled health checks, validating responses, tracking uptime and latency, detecting outages,
                managing incidents, visualizing historical performance metrics, and generating operational reports.
              </Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Ant Design', 'Recharts'].map((tech) => (
                  <Tag key={tech} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a78bfa' }}>
                    {tech}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
