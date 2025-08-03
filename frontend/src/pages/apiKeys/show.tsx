import React from "react";
import { Show, TextField, DateField, TagField } from "@refinedev/antd";
import { Card, Space, Tag, Button, Typography, Descriptions, message } from "antd";
import { CopyOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { useShow } from "@refinedev/core";

const { Text, Title } = Typography;

export const ApiKeyShow: React.FC = () => {
  const { queryResult } = useShow({
    resource: "api-keys",
  });

  const { data, isLoading } = queryResult;
  const record = data?.data;

  const [showFullKey, setShowFullKey] = React.useState(false);

  // 复制 API Key
  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey).then(() => {
      message.success('API Key 已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 掩码显示 API Key
  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 12) return apiKey;
    const prefix = apiKey.substring(0, 8);
    const suffix = apiKey.substring(apiKey.length - 4);
    const masked = '*'.repeat(apiKey.length - 12);
    return prefix + masked + suffix;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Show
      isLoading={isLoading}
      title="API KEY 详情"
      breadcrumb={false}
    >
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="名称" span={2}>
            <Text strong>{record?.name}</Text>
          </Descriptions.Item>
          
          <Descriptions.Item label="API KEY" span={2}>
            <Space>
              <code style={{
                fontSize: '12px',
                padding: '4px 8px',
                backgroundColor: '#f6f8fa',
                border: '1px solid #e1e4e8',
                borderRadius: '4px'
              }}>
                {showFullKey ? record?.key : maskApiKey(record?.key || '')}
              </code>
              <Button
                type="text"
                size="small"
                icon={showFullKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowFullKey(!showFullKey)}
              />
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyApiKey(record?.key || '')}
              >
                复制
              </Button>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="描述" span={2}>
            {record?.description || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="状态">
            <TagField
              value={record?.isActive ? "启用" : "禁用"}
              color={record?.isActive ? "green" : "red"}
            />
          </Descriptions.Item>

          <Descriptions.Item label="过期时间">
            {record?.expiresAt ? (
              <DateField value={record.expiresAt} />
            ) : (
              <Text type="secondary">永不过期</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="创建时间">
            <DateField value={record?.createdAt} />
          </Descriptions.Item>

          <Descriptions.Item label="更新时间">
            <DateField value={record?.updatedAt} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="权限配置" style={{ marginBottom: 16 }}>
        <Space wrap>
          {record?.permissions?.map((permission: string) => {
            let color = 'blue';
            let label = permission;
            
            switch (permission) {
              case 'configs:read':
                color = 'blue';
                label = '配置读取';
                break;
              case 'ai_models:read':
                color = 'green';
                label = 'AI模型读取';
                break;
              case 'prompts:read':
                color = 'orange';
                label = '提示词读取';
                break;
              case 'hexagrams:read':
                color = 'purple';
                label = '卦象读取';
                break;
              case 'analytics:read':
                color = 'cyan';
                label = '分析数据读取';
                break;
            }

            return (
              <Tag key={permission} color={color}>
                {label}
                <Text type="secondary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                  ({permission})
                </Text>
              </Tag>
            );
          })}
        </Space>
      </Card>

      <Card title="使用统计">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '24px' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              {record?.usageCount?.toLocaleString() || 0}
            </Title>
            <Text type="secondary">总使用次数</Text>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              {record?.lastUsedAt ? (
                <DateField value={record.lastUsedAt} format="MM-DD HH:mm" />
              ) : (
                <Text type="secondary">从未使用</Text>
              )}
            </Title>
            <Text type="secondary">最后使用时间</Text>
          </div>
        </div>
      </Card>

      <Card title="使用示例">
        <div style={{ 
          backgroundColor: '#f6f8fa', 
          padding: '16px', 
          borderRadius: '6px',
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>JavaScript 示例：</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`// 获取配置
const response = await fetch('https://zwam.vryo.de/api/public/configs/web', {
  headers: {
    'X-API-Key': '${record?.key}',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`}
          </pre>
        </div>
      </Card>
    </Show>
  );
};
