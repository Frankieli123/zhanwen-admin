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
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

export const AIModelList: React.FC = () => {
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
      title: "模型名称",
      dataIndex: "displayName",
      key: "displayName",
      render: (value: string, record: any) => (
        <Space>
          <strong>{value}</strong>
          <Tag color="blue">{record.name}</Tag>
        </Space>
      ),
    },
    {
      title: "提供商",
      dataIndex: ["provider", "displayName"],
      key: "provider",
      render: (value: string) => <Tag color="green">{value}</Tag>,
    },
    {
      title: "模型类型",
      dataIndex: "modelType",
      key: "modelType",
      render: (value: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          chat: { color: "blue", text: "对话" },
          completion: { color: "green", text: "补全" },
          embedding: { color: "orange", text: "嵌入" },
        };
        const config = typeMap[value] || { color: "default", text: value };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      render: (value: string) => {
        const roleMap: Record<string, { color: string; text: string }> = {
          primary: { color: "red", text: "主模型" },
          secondary: { color: "orange", text: "备用" },
          disabled: { color: "default", text: "禁用" },
        };
        const config = roleMap[value] || { color: "default", text: value };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      sorter: true,
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
          {value ? "活跃" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "成本/1K tokens",
      dataIndex: "costPer1kTokens",
      key: "costPer1kTokens",
      render: (value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return `¥${(numValue || 0).toFixed(4)}`;
      },
      width: 120,
    },
    {
      title: "上下文窗口",
      dataIndex: "contextWindow",
      key: "contextWindow",
      render: (value: number | string) => {
        const numValue = typeof value === 'string' ? parseInt(value) : value;
        return `${(numValue || 0).toLocaleString()} tokens`;
      },
      width: 120,
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
      width: 200,
      render: (_, record: any) => (
        <Space size="small">
          <Tooltip title="测试连接">
            <Button
              type="text"
              icon={<ApiOutlined />}
              size="small"
              onClick={() => handleTestConnection(record.id)}
            />
          </Tooltip>
          <ShowButton hideText size="small" recordItemId={record.id} />
          <EditButton hideText size="small" recordItemId={record.id} />
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  const handleTestConnection = async (id: number) => {
    try {
      // 这里可以调用测试连接的API
      console.log("测试模型连接:", id);
    } catch (error) {
      console.error("测试连接失败:", error);
    }
  };

  return (
    <List
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <CreateButton>创建AI模型</CreateButton>
        </>
      )}
    >
      <Table
        {...tableProps}
        columns={columns}
        rowKey="id"
        scroll={{ x: 1200 }}
        size="small"
      />
    </List>
  );
};
