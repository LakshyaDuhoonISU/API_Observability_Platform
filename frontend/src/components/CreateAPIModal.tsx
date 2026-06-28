import React, { useState } from 'react';
import { Form, Input, Select, InputNumber, Button, Modal, message, Space, Typography } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import type { CreateApiPayload, HttpMethod, MonitoringInterval } from '../types';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

const CreateAPIModal: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [headerPairs, setHeaderPairs] = useState<{ key: string; value: string }[]>([]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateApiPayload) => apiService.createApi(payload),
    onSuccess: () => {
      message.success('API monitor created successfully!');
      queryClient.invalidateQueries({ queryKey: ['apis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      form.resetFields();
      setHeaderPairs([]);
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Failed to create API monitor');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const headers: Record<string, string> = {};
      headerPairs.forEach((pair) => {
        if (pair.key && pair.value) {
          headers[pair.key] = pair.value;
        }
      });

      const payload: CreateApiPayload = {
        name: values.name,
        url: values.url,
        method: values.method as HttpMethod,
        headers,
        expectedStatusCode: values.expectedStatusCode || 200,
        expectedJsonFields: values.expectedJsonFields
          ? values.expectedJsonFields.split(',').map((f: string) => f.trim()).filter(Boolean)
          : [],
        timeout: (values.timeout || 30) * 1000,
        interval: values.interval as MonitoringInterval,
      };

      createMutation.mutate(payload);
    } catch {
      // Form validation failed
    }
  };

  return (
    <Modal
      title="Add API Monitor"
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={createMutation.isPending}
          onClick={handleSubmit}
        >
          Create Monitor
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          method: 'GET',
          expectedStatusCode: 200,
          timeout: 30,
          interval: '5m',
        }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="API Name"
          rules={[{ required: true, message: 'Please enter a name for this monitor' }]}
        >
          <Input placeholder="e.g. Production Health Check" />
        </Form.Item>

        <Form.Item
          name="url"
          label="URL"
          rules={[
            { required: true, message: 'Please enter the API URL' },
            { type: 'url', message: 'Please enter a valid URL' },
          ]}
        >
          <Input placeholder="https://api.example.com/health" />
        </Form.Item>

        <Space style={{ display: 'flex', width: '100%' }} size={16}>
          <Form.Item name="method" label="Method" style={{ width: 140 }}>
            <Select>
              <Select.Option value="GET">GET</Select.Option>
              <Select.Option value="POST">POST</Select.Option>
              <Select.Option value="PUT">PUT</Select.Option>
              <Select.Option value="DELETE">DELETE</Select.Option>
              <Select.Option value="PATCH">PATCH</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="interval" label="Check Interval" style={{ width: 160 }}>
            <Select>
              <Select.Option value="1m">Every Minute</Select.Option>
              <Select.Option value="5m">Every 5 Minutes</Select.Option>
              <Select.Option value="15m">Every 15 Minutes</Select.Option>
              <Select.Option value="1h">Every Hour</Select.Option>
            </Select>
          </Form.Item>
        </Space>

        <Space style={{ display: 'flex', width: '100%' }} size={16}>
          <Form.Item name="expectedStatusCode" label="Expected Status" style={{ width: 160 }}>
            <InputNumber min={100} max={599} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="timeout" label="Timeout (seconds)" style={{ width: 160 }}>
            <InputNumber min={1} max={120} style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item name="expectedJsonFields" label="Expected JSON Fields (comma-separated)">
          <Input placeholder="e.g. status, data, message" />
        </Form.Item>

        {/* Headers */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 8 }}>
            Headers
          </Text>
          {headerPairs.map((pair, index) => (
            <Space key={index} style={{ display: 'flex', marginBottom: 8 }} size={8}>
              <Input
                placeholder="Key"
                value={pair.key}
                onChange={(e) => {
                  const newPairs = [...headerPairs];
                  newPairs[index].key = e.target.value;
                  setHeaderPairs(newPairs);
                }}
                style={{ width: 200 }}
              />
              <Input
                placeholder="Value"
                value={pair.value}
                onChange={(e) => {
                  const newPairs = [...headerPairs];
                  newPairs[index].value = e.target.value;
                  setHeaderPairs(newPairs);
                }}
                style={{ width: 280 }}
              />
              <MinusCircleOutlined
                style={{ color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                onClick={() => {
                  const newPairs = headerPairs.filter((_, i) => i !== index);
                  setHeaderPairs(newPairs);
                }}
              />
            </Space>
          ))}
          <Button
            type="dashed"
            onClick={() => setHeaderPairs([...headerPairs, { key: '', value: '' }])}
            icon={<PlusOutlined />}
            size="small"
            style={{ color: '#9ca3af' }}
          >
            Add Header
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateAPIModal;
