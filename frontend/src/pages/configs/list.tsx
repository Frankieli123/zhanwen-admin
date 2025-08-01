import React from "react";
import {
  List,
  useTable,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Tag, Button, Tooltip } from "antd";
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from "@ant-design/icons";

export const ConfigList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "配置键",
      dataIndex: "configKey",
      key: "configKey",
      render: (value: string, record: any) => (
        <Space direction="vertical" size="small">
          <strong>{value}</strong>
          {record.description && (
            <span style={{ fontSize: "12px", color: "#666" }}>
              {record.description.length > 50 
                ? `${record.description.substring(0, 50)}...` 
                : record.description}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "平台",
      dataIndex: "platform",
      key: "platform",
      render: (value: string) => {
        const platformMap: Record<string, { color: string; text: string }> = {
          web: { color: "blue", text: "Web" },
          ios: { color: "green", text: "iOS" },
          android: { color: "orange", text: "Android" },
          wechat: { color: "purple", text: "微信小程序" },
        };
        const config = platformMap[value] || { color: "default", text: value };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: "数据类型",
      dataIndex: "dataType",
      key: "dataType",
      render: (value: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          json: { color: "blue", text: "JSON" },
          string: { color: "green", text: "字符串" },
          number: { color: "orange", text: "数字" },
          boolean: { color: "purple", text: "布尔值" },
        };
        const config = typeMap[value] || { color: "default", text: value };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "配置值",
      dataIndex: "configValue",
      key: "configValue",
      render: (value: any, record: any) => {
        if (record.isSensitive) {
          return (
            <Space>
              <EyeInvisibleOutlined />
              <span style={{ color: "#999" }}>敏感数据</span>
            </Space>
          );
        }
        
        let displayValue = "";
        if (typeof value === "object") {
          displayValue = JSON.stringify(value);
        } else {
          displayValue = String(value);
        }
        
        if (displayValue.length > 50) {
          return (
            <Tooltip title={displayValue}>
              <span>{displayValue.substring(0, 50)}...</span>
            </Tooltip>
          );
        }
        
        return <span>{displayValue}</span>;
      },
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (value: boolean) => (
        <Tag
          icon={value ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={value ? "success" : "default"}
        >
          {value ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "敏感数据",
      dataIndex: "isSensitive",
      key: "isSensitive",
      render: (value: boolean) => (
        <Tag
          icon={value ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          color={value ? "warning" : "default"}
        >
          {value ? "是" : "否"}
        </Tag>
      ),
    },
    {
      title: "版本",
      dataIndex: "version",
      key: "version",
      width: 80,
      render: (value: number) => <Tag color="purple">v{value}</Tag>,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => new Date(value).toLocaleString("zh-CN"),
      width: 160,
    },
    {
      title: "操作",
      dataIndex: "actions",
      key: "actions",
      fixed: "right" as const,
      width: 180,
      render: (_, record: any) => (
        <Space size="small">
          <Tooltip title="复制到其他平台">
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleCopyConfig(record.id)}
            />
          </Tooltip>
          <ShowButton hideText size="small" recordItemId={record.id} />
          <EditButton hideText size="small" recordItemId={record.id} />
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  const handleCopyConfig = async (id: number) => {
    try {
      console.log("复制配置:", id);
    } catch (error) {
      console.error("复制配置失败:", error);
    }
  };

  return (
    <List
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <CreateButton>创建应用配置</CreateButton>
        </>
      )}
    >
      <Table
        {...tableProps}
        columns={columns}
        rowKey="id"
        scroll={{ x: 1400 }}
        size="small"
      />
    </List>
  );
};
