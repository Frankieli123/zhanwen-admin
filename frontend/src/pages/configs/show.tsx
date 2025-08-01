import React from "react";
import { Show, TextField, BooleanField } from "@refinedev/antd";
import { Typography, Card, Row, Col, Tag, Button, Descriptions } from "antd";
import { 
  EditOutlined, 
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined 
} from "@ant-design/icons";
import { useShow, useNavigation } from "@refinedev/core";

const { Title, Paragraph } = Typography;

export const ConfigShow: React.FC = () => {
  const { queryResult } = useShow();
  const { edit } = useNavigation();
  const { data, isLoading } = queryResult;

  const record = data?.data;

  const handleCopyConfig = async () => {
    try {
      console.log("复制配置:", record?.id);
    } catch (error) {
      console.error("复制配置失败:", error);
    }
  };

  const getPlatformTag = (platform: string) => {
    const platformMap: Record<string, { color: string; text: string }> = {
      web: { color: "blue", text: "Web" },
      ios: { color: "green", text: "iOS" },
      android: { color: "orange", text: "Android" },
      wechat: { color: "purple", text: "微信小程序" },
    };
    const config = platformMap[platform] || { color: "default", text: platform };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getDataTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      json: { color: "blue", text: "JSON" },
      string: { color: "green", text: "字符串" },
      number: { color: "orange", text: "数字" },
      boolean: { color: "purple", text: "布尔值" },
    };
    const config = typeMap[type] || { color: "default", text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const renderConfigValue = (value: any, isSensitive: boolean) => {
    if (isSensitive) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <EyeInvisibleOutlined />
          <span style={{ color: "#999" }}>敏感数据已隐藏</span>
        </div>
      );
    }

    if (typeof value === "object") {
      return (
        <pre style={{ 
          whiteSpace: "pre-wrap", 
          fontFamily: "monospace",
          background: "#f5f5f5",
          padding: "12px",
          borderRadius: "4px",
          fontSize: "12px"
        }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <TextField value={String(value)} />;
  };

  return (
    <Show
      isLoading={isLoading}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopyConfig}
          >
            复制到其他平台
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => edit("configs", record?.id)}
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
              <Descriptions.Item label="配置ID">
                <TextField value={record?.id} />
              </Descriptions.Item>
              <Descriptions.Item label="配置键">
                <TextField value={record?.configKey} />
              </Descriptions.Item>
              <Descriptions.Item label="平台">
                {getPlatformTag(record?.platform)}
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag>{record?.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据类型">
                {getDataTypeTag(record?.dataType)}
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                <Tag color="purple">v{record?.version}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="状态信息" size="small">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="启用状态">
                <Tag
                  icon={record?.isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  color={record?.isActive ? "success" : "default"}
                >
                  {record?.isActive ? "启用" : "禁用"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="敏感数据">
                <Tag
                  icon={record?.isSensitive ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  color={record?.isSensitive ? "warning" : "default"}
                >
                  {record?.isSensitive ? "是" : "否"}
                </Tag>
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

      <Card title="配置值" size="small" style={{ marginTop: 16 }}>
        {renderConfigValue(record?.configValue, record?.isSensitive)}
      </Card>

      {record?.validationRules && Object.keys(record.validationRules).length > 0 && (
        <Card title="验证规则" size="small" style={{ marginTop: 16 }}>
          <pre style={{ 
            whiteSpace: "pre-wrap", 
            fontFamily: "monospace",
            background: "#f5f5f5",
            padding: "12px",
            borderRadius: "4px",
            fontSize: "12px"
          }}>
            {JSON.stringify(record.validationRules, null, 2)}
          </pre>
        </Card>
      )}
    </Show>
  );
};
