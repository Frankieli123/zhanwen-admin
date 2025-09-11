import React from "react";
import { Show, TextField, BooleanField, NumberField } from "@refinedev/antd";
import { Typography, Card, Row, Col, Tag, Space, Button, Descriptions, message } from "antd";
import { ApiOutlined, EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from "@ant-design/icons";
import { useShow, useNavigation } from "@refinedev/core";
import { aiModelsAPI } from "../../utils/api";

const { Title } = Typography;

export const AIModelShow: React.FC = () => {
  const { queryResult } = useShow();
  const { edit } = useNavigation();
  const { data, isLoading, refetch } = queryResult;
  const record = data?.data;
  const [showApiKey, setShowApiKey] = React.useState(false);

  const handleRefresh = async () => {
    const hide = message.loading('正在刷新数据...', 0);
    try {
      await refetch();
      hide();
      message.success('数据刷新成功');
    } catch (error) {
      hide();
      console.error('刷新失败:', error);
      message.error('数据刷新失败');
    }
  };

  // 格式化 API Key 显示
  const formatApiKey = (apiKey: string) => {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return apiKey;
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  };

  // 复制 API Key
  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey).then(() => {
      message.success('API Key 已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  const handleTestConnection = async () => {
    if (!record) return;

    // 检查是否有 API Key
    if (!record.apiKeyEncrypted || record.apiKeyEncrypted.trim() === '') {
      message.error('请先配置 API Key');
      return;
    }

    const startTime = Date.now();
    const hide = message.loading('正在测试连接...', 0);

    try {
      console.log('开始测试连接:', {
        provider: record.provider?.name || 'custom',
        apiUrl: record.customApiUrl || record.provider?.baseUrl,
        hasApiKey: !!record.apiKeyEncrypted
      });

      const response = await aiModelsAPI.testConnection({
        provider: record.provider?.name || 'custom',
        apiKey: record.apiKeyEncrypted,
        apiUrl: record.customApiUrl || record.provider?.baseUrl,
      });

      const duration = Date.now() - startTime;
      hide();

      console.log('测试连接响应:', response, '耗时:', duration + 'ms');

      if (response.success && response.data?.connected) {
        message.success(`API连接测试成功 (${duration}ms)`);
      } else {
        message.error(`API连接测试失败 (${duration}ms): ${response.message || '未知错误'}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      hide();
      console.error("测试连接失败:", error);
      message.error(`API连接测试失败 (${duration}ms)`);
    }
  };

  const getRoleTag = (role: string) => {
    const roleMap: Record<string, { color: string; text: string }> = {
      primary: { color: "red", text: "主模型" },
      secondary: { color: "orange", text: "备用" },
      disabled: { color: "default", text: "禁用" },
    };
    const config = roleMap[role] || { color: "default", text: role };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      chat: { color: "blue", text: "对话" },
      completion: { color: "green", text: "补全" },
      embedding: { color: "orange", text: "嵌入" },
    };
    const config = typeMap[type] || { color: "default", text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <Show
      isLoading={isLoading}
      breadcrumb={false}
      title="AI 模型详情"
      headerButtons={() => (
        <>
          <Button
            onClick={handleRefresh}
          >
            刷新
          </Button>
          <Button
            onClick={() => edit("ai-models", record?.id)}
          >
            编辑
          </Button>
          <Button
            type="primary"
            icon={<ApiOutlined />}
            onClick={handleTestConnection}
          >
            测试连接
          </Button>
        </>
      )}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="基本信息" size="small">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="模型ID">
                <TextField value={record?.id} />
              </Descriptions.Item>
              <Descriptions.Item label="模型名称">
                <TextField value={record?.name} />
              </Descriptions.Item>
              <Descriptions.Item label="服务商">
                <Tag color="green">{record?.provider?.displayName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="模型类型">
                {getTypeTag(record?.modelType)}
              </Descriptions.Item>
              <Descriptions.Item label="角色">
                {getRoleTag(record?.role)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <BooleanField
                  value={record?.isActive}
                  trueText="活跃"
                  falseText="禁用"
                />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="配置参数" size="small">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="优先级">
                <NumberField value={record?.priority} />
              </Descriptions.Item>
              <Descriptions.Item label="成本/1K tokens">
                ¥<NumberField value={record?.costPer1kTokens} options={{ minimumFractionDigits: 6 }} />
              </Descriptions.Item>
              <Descriptions.Item label="上下文窗口">
                <NumberField value={record?.contextWindow} /> tokens
              </Descriptions.Item>
              <Descriptions.Item label="API密钥">
                {record?.apiKeyEncrypted ? (
                  <Space>
                    <code style={{
                      padding: '2px 6px',
                      backgroundColor: '#f6f8fa',
                      border: '1px solid #e1e4e8',
                      borderRadius: '4px',
                      fontFamily: 'Monaco, Consolas, monospace',
                      fontSize: '12px'
                    }}>
                      {showApiKey ? record.apiKeyEncrypted : formatApiKey(record.apiKeyEncrypted)}
                    </code>
                    <Button
                      type="text"
                      size="small"
                      icon={showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowApiKey(!showApiKey)}
                      title={showApiKey ? '隐藏' : '显示'}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyApiKey(record.apiKeyEncrypted)}
                      title="复制"
                    />
                    <Tag color="green">已配置</Tag>
                  </Space>
                ) : (
                  <Tag color="orange">未配置</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="模型参数" size="small" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Temperature">
                  <NumberField value={record?.parameters?.temperature} />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Max Tokens">
                  <NumberField value={record?.parameters?.max_tokens} />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Top P">
                  <NumberField value={record?.parameters?.top_p} />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Frequency Penalty">
                  <NumberField value={record?.parameters?.frequency_penalty} />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </Card>



      <Card title="时间信息" size="small" style={{ marginTop: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="创建时间">
            {record?.createdAt ? new Date(record.createdAt).toLocaleString("zh-CN") : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {record?.updatedAt ? new Date(record.updatedAt).toLocaleString("zh-CN") : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Show>
  );
};
