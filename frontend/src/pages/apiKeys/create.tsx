import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, Switch, DatePicker, Card, Space, Tag } from "antd";
import { KeyOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Option } = Select;

// 可用权限列表
const AVAILABLE_PERMISSIONS = [
  { value: 'configs:read', label: '配置读取', color: 'blue' },
  { value: 'ai_models:read', label: 'AI模型读取', color: 'green' },
  { value: 'prompts:read', label: '提示词读取', color: 'orange' },
  { value: 'hexagrams:read', label: '卦象读取', color: 'purple' },
  { value: 'analytics:read', label: '分析数据读取', color: 'cyan' },
];

export const ApiKeyCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "api-keys",
  });

  return (
    <Create
      saveButtonProps={saveButtonProps}
      title="创建 API KEY"
      breadcrumb={false}
    >
      <Form {...formProps} layout="vertical">
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Form.Item
            label="名称"
            name="name"
            rules={[
              { required: true, message: "请输入 API KEY 名称" },
              { max: 100, message: "名称不能超过100个字符" }
            ]}
          >
            <Input
              placeholder="请输入 API KEY 名称，如：小程序API KEY"
              prefix={<KeyOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[
              { max: 500, message: "描述不能超过500个字符" }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="请输入 API KEY 的用途描述"
            />
          </Form.Item>
        </Card>

        <Card title="权限配置" style={{ marginBottom: 16 }}>
          <Form.Item
            label="权限"
            name="permissions"
            rules={[
              { required: true, message: "请至少选择一个权限" }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择权限"
              style={{ width: '100%' }}
              optionLabelProp="label"
            >
              {AVAILABLE_PERMISSIONS.map(permission => (
                <Option 
                  key={permission.value} 
                  value={permission.value}
                  label={
                    <Tag color={permission.color} style={{ margin: 0 }}>
                      {permission.label}
                    </Tag>
                  }
                >
                  <Space>
                    <Tag color={permission.color}>{permission.label}</Tag>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      {permission.value}
                    </span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="权限说明"
            style={{ marginBottom: 0 }}
          >
            <div style={{ 
              background: '#f6f8fa', 
              padding: '12px', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#666'
            }}>
              <div><strong>configs:read</strong> - 允许读取应用配置数据</div>
              <div><strong>ai_models:read</strong> - 允许读取AI模型配置</div>
              <div><strong>prompts:read</strong> - 允许读取提示词模板</div>
              <div><strong>hexagrams:read</strong> - 允许读取卦象数据</div>
              <div><strong>analytics:read</strong> - 允许读取分析统计数据</div>
            </div>
          </Form.Item>
        </Card>

        <Card title="高级设置">
          <Form.Item
            label="过期时间"
            name="expiresAt"
            tooltip="留空表示永不过期"
          >
            <DatePicker 
              showTime
              placeholder="选择过期时间（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="启用状态"
            name="isActive"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch 
              checkedChildren="启用" 
              unCheckedChildren="禁用"
            />
          </Form.Item>
        </Card>
      </Form>
    </Create>
  );
};
