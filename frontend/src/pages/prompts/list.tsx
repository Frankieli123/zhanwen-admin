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
  PlayCircleOutlined,
  CopyOutlined 
} from "@ant-design/icons";

export const PromptList: React.FC = () => {
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
      title: "模板名称",
      dataIndex: "name",
      key: "name",
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
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (value: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          system: { color: "blue", text: "系统" },
          user: { color: "green", text: "用户" },
          format: { color: "orange", text: "格式" },
        };
        const config = typeMap[value] || { color: "default", text: value };
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
      title: "版本",
      dataIndex: "version",
      key: "version",
      width: 80,
      render: (value: number) => <Tag color="purple">v{value}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (value: string) => {
        const statusMap: Record<string, { color: string; text: string; icon: any }> = {
          draft: { color: "default", text: "草稿", icon: <CloseCircleOutlined /> },
          active: { color: "success", text: "活跃", icon: <CheckCircleOutlined /> },
          deprecated: { color: "warning", text: "废弃", icon: <CloseCircleOutlined /> },
        };
        const config = statusMap[value] || { color: "default", text: value, icon: null };
        return (
          <Tag icon={config.icon} color={config.color}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: "使用次数",
      dataIndex: "usageCount",
      key: "usageCount",
      width: 100,
      sorter: true,
    },
    {
      title: "标签",
      dataIndex: "tags",
      key: "tags",
      render: (tags: string[]) => (
        <Space size="small" wrap>
          {tags?.slice(0, 2).map((tag) => (
            <Tag key={tag} size="small">
              {tag}
            </Tag>
          ))}
          {tags?.length > 2 && (
            <Tag size="small" color="blue">
              +{tags.length - 2}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "创建者",
      dataIndex: ["creator", "fullName"],
      key: "creator",
      render: (value: string, record: any) => (
        value || record.creator?.username || "-"
      ),
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
          {record.status === "draft" && (
            <Tooltip title="激活模板">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                size="small"
                onClick={() => handleActivateTemplate(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="复制模板">
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleDuplicateTemplate(record.id)}
            />
          </Tooltip>
          <ShowButton hideText size="small" recordItemId={record.id} />
          <EditButton hideText size="small" recordItemId={record.id} />
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  const handleActivateTemplate = async (id: number) => {
    try {
      // 调用激活模板的API
      console.log("激活模板:", id);
    } catch (error) {
      console.error("激活模板失败:", error);
    }
  };

  const handleDuplicateTemplate = async (id: number) => {
    try {
      // 调用复制模板的API
      console.log("复制模板:", id);
    } catch (error) {
      console.error("复制模板失败:", error);
    }
  };

  return (
    <List
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <CreateButton>创建提示词模板</CreateButton>
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
