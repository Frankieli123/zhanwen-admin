import React from "react";
import { Show, TextField, BooleanField, NumberField } from "@refinedev/antd";
import { Typography, Card, Row, Col, Tag, Space, Button, Descriptions } from "antd";
import { ApiOutlined, EditOutlined } from "@ant-design/icons";
import { useShow, useNavigation } from "@refinedev/core";

const { Title } = Typography;

export const AIModelShow: React.FC = () => {
  const { queryResult } = useShow();
  const { edit } = useNavigation();
  const { data, isLoading } = queryResult;

  const record = data?.data;

  const handleTestConnection = async () => {
    try {
      // 调用测试连接API
      console.log("测试模型连接:", record?.id);
    } catch (error) {
      console.error("测试连接失败:", error);
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
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button
            type="primary"
            icon={<ApiOutlined />}
            onClick={handleTestConnection}
          >
            测试连接
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => edit("ai-models", record?.id)}
          >
            编辑
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
              <Descriptions.Item label="显示名称">
                <TextField value={record?.displayName} />
              </Descriptions.Item>
              <Descriptions.Item label="提供商">
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
                  <Tag color="green">已配置</Tag>
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

      {record?.metadata?.description && (
        <Card title="描述信息" size="small" style={{ marginTop: 16 }}>
          <TextField value={record.metadata.description} />
        </Card>
      )}

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
