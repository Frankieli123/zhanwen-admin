import React, { useState } from "react";
import {
  List,
  useTable,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Tag, Button, Tooltip, message } from "antd";
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { aiModelsAPI } from "../../utils/api";

export const AIModelList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  const [testingConnection, setTestingConnection] = useState<number | null>(null);

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
      render: (value: string) => <strong>{value}</strong>,
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
              loading={testingConnection === record.id}
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
      setTestingConnection(id);
      message.loading({ content: "正在测试连接...", key: "test-connection" });

      const response = await aiModelsAPI.testModelConnection(id);

      if (response.success) {
        message.success({
          content: `连接测试成功！响应时间: ${response.data?.responseTime || 0}ms`,
          key: "test-connection",
          duration: 3,
        });
      } else {
        message.error({
          content: response.message || "连接测试失败",
          key: "test-connection",
          duration: 3,
        });
      }
    } catch (error: any) {
      console.error("测试连接失败:", error);
      message.error({
        content: error.response?.data?.message || "连接测试失败，请检查网络连接",
        key: "test-connection",
        duration: 3,
      });
    } finally {
      setTestingConnection(null);
    }
  };

  return (
    <List
      headerButtons={() => (
        <>
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
