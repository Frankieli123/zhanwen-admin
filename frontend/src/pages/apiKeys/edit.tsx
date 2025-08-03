import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select, Switch, DatePicker, Card, Space, Tag } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

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

export const ApiKeyEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "api-keys",
  });

  const apiKeyData = queryResult?.data?.data;

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      title="编辑 API KEY"
      breadcrumb={false}
    >
      <Form 
        {...formProps} 
        layout="vertical"
        onValuesChange={(changedValues, allValues) => {
          // 处理日期格式转换
          if (changedValues.expiresAt) {
            formProps.form?.setFieldsValue({
              expiresAt: changedValues.expiresAt
            });
          }
        }}
      >
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
              placeholder="请输入 API KEY 名称"
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

          {apiKeyData && (
            <Form.Item label="API KEY">
              <Input.Group compact>
                <Input
                  style={{ width: 'calc(100% - 80px)' }}
                  value={apiKeyData.key}
                  readOnly
                  addonBefore="KEY"
                />
                <Input
                  style={{ width: '80px', cursor: 'pointer', backgroundColor: '#f0f0f0' }}
                  value="复制"
                  readOnly
                  onClick={() => {
                    navigator.clipboard.writeText(apiKeyData.key);
                  }}
                />
              </Input.Group>
            </Form.Item>
          )}
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
        </Card>

        <Card title="高级设置" style={{ marginBottom: 16 }}>
          <Form.Item
            label="过期时间"
            name="expiresAt"
            tooltip="留空表示永不过期"
            getValueProps={(value) => ({
              value: value ? dayjs(value) : undefined,
            })}
            normalize={(value) => value ? value.toISOString() : null}
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
          >
            <Switch 
              checkedChildren="启用" 
              unCheckedChildren="禁用"
            />
          </Form.Item>
        </Card>

        {apiKeyData && (
          <Card title="使用统计">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ color: '#666', fontSize: '12px' }}>使用次数</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {apiKeyData.usageCount?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '12px' }}>最后使用</div>
                <div style={{ fontSize: '14px' }}>
                  {apiKeyData.lastUsedAt ? 
                    dayjs(apiKeyData.lastUsedAt).format('YYYY-MM-DD HH:mm:ss') : 
                    '从未使用'
                  }
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '12px' }}>创建时间</div>
                <div style={{ fontSize: '14px' }}>
                  {dayjs(apiKeyData.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </div>
              </div>
            </div>
          </Card>
        )}
      </Form>
    </Edit>
  );
};
