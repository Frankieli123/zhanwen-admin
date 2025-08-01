import React from "react";
import { Show, TextField, NumberField } from "@refinedev/antd";
import { Typography, Card, Row, Col, Tag, Space, Button, Descriptions } from "antd";
import { 
  EditOutlined, 
  PlayCircleOutlined, 
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined 
} from "@ant-design/icons";
import { useShow, useNavigation } from "@refinedev/core";

const { Title, Paragraph } = Typography;

export const PromptShow: React.FC = () => {
  const { queryResult } = useShow();
  const { edit } = useNavigation();
  const { data, isLoading } = queryResult;

  const record = data?.data;

  const handleActivateTemplate = async () => {
    try {
      console.log("激活模板:", record?.id);
    } catch (error) {
      console.error("激活模板失败:", error);
    }
  };

  const handleDuplicateTemplate = async () => {
    try {
      console.log("复制模板:", record?.id);
    } catch (error) {
      console.error("复制模板失败:", error);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string; icon: any }> = {
      draft: { color: "default", text: "草稿", icon: <CloseCircleOutlined /> },
      active: { color: "success", text: "活跃", icon: <CheckCircleOutlined /> },
      deprecated: { color: "warning", text: "废弃", icon: <CloseCircleOutlined /> },
    };
    const config = statusMap[status] || { color: "default", text: status, icon: null };
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      system: { color: "blue", text: "系统" },
      user: { color: "green", text: "用户" },
      format: { color: "orange", text: "格式" },
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
          {record?.status === "draft" && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleActivateTemplate}
            >
              激活模板
            </Button>
          )}
          <Button
            icon={<CopyOutlined />}
            onClick={handleDuplicateTemplate}
          >
            复制模板
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => edit("prompts", record?.id)}
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
              <Descriptions.Item label="模板ID">
                <TextField value={record?.id} />
              </Descriptions.Item>
              <Descriptions.Item label="模板名称">
                <TextField value={record?.name} />
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                {getTypeTag(record?.type)}
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag>{record?.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                <Tag color="purple">v{record?.version}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(record?.status)}
              </Descriptions.Item>
              <Descriptions.Item label="使用次数">
                <NumberField value={record?.usageCount} />
              </Descriptions.Item>
              <Descriptions.Item label="创建者">
                {record?.creator?.fullName || record?.creator?.username || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="统计信息" size="small">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="效果评分">
                {record?.effectivenessScore ? (
                  <NumberField value={record.effectivenessScore} options={{ minimumFractionDigits: 2 }} />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {record?.createdAt ? new Date(record.createdAt).toLocaleString("zh-CN") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {record?.updatedAt ? new Date(record.updatedAt).toLocaleString("zh-CN") : "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {record?.description && (
        <Card title="描述" size="small" style={{ marginTop: 16 }}>
          <Paragraph>{record.description}</Paragraph>
        </Card>
      )}

      {record?.tags && record.tags.length > 0 && (
        <Card title="标签" size="small" style={{ marginTop: 16 }}>
          <Space size="small" wrap>
            {record.tags.map((tag: string) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        </Card>
      )}

      {record?.variables && record.variables.length > 0 && (
        <Card title="模板变量" size="small" style={{ marginTop: 16 }}>
          <Space size="small" wrap>
            {record.variables.map((variable: string) => (
              <Tag key={variable} color="blue">
                {variable}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {record?.systemPrompt && (
        <Card title="系统提示词" size="small" style={{ marginTop: 16 }}>
          <Paragraph>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {record.systemPrompt}
            </pre>
          </Paragraph>
        </Card>
      )}

      {record?.userPromptTemplate && (
        <Card title="用户提示词模板" size="small" style={{ marginTop: 16 }}>
          <Paragraph>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {record.userPromptTemplate}
            </pre>
          </Paragraph>
        </Card>
      )}

      {record?.formatInstructions && (
        <Card title="格式说明" size="small" style={{ marginTop: 16 }}>
          <Paragraph>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {record.formatInstructions}
            </pre>
          </Paragraph>
        </Card>
      )}
    </Show>
  );
};
