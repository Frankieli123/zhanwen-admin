import React from "react";
import {
  List,
  useTable,
  EditButton,
  ShowButton,
  DeleteButton,
  DateField,
  TagField,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Button, Tag, Tooltip, Modal, message } from "antd";
import { EyeOutlined, KeyOutlined, ReloadOutlined, BarChartOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { apiKeysAPI } from "../../utils/api";

export const ApiKeyList: React.FC = () => {
  const navigate = useNavigate();

  const { tableProps, searchFormProps, sorters, filters } = useTable({
    syncWithLocation: true,
    resource: "api-keys",
    onSearch: (params) => {
      return [
        {
          field: "search",
          operator: "contains",
          value: params.search,
        },
      ];
    },
  });

  // 重新生成 API KEY
  const handleRegenerate = async (id: number, name: string) => {
    Modal.confirm({
      title: '确认重新生成',
      content: `确定要重新生成 "${name}" 的 API KEY 吗？原有的 API KEY 将失效。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiKeysAPI.regenerateApiKey(id);
          message.success('API KEY 重新生成成功');
          // 刷新表格
          window.location.reload();
        } catch (error) {
          message.error('重新生成失败');
        }
      },
    });
  };

  // 复制 API KEY
  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey).then(() => {
      message.success('API KEY 已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 掩码显示 API KEY
  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 12) return apiKey;
    const prefix = apiKey.substring(0, 8);
    const suffix = apiKey.substring(apiKey.length - 4);
    const masked = '*'.repeat(apiKey.length - 12);
    return prefix + masked + suffix;
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      sorter: true,
    },
    {
      title: "API KEY",
      dataIndex: "key",
      key: "key",
      render: (value: string) => (
        <Space>
          <code style={{ fontSize: '12px' }}>{maskApiKey(value)}</code>
          <Tooltip title="复制完整 API KEY">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleCopyApiKey(value)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "权限",
      dataIndex: "permissions",
      key: "permissions",
      render: (permissions: string[]) => (
        <Space wrap>
          {permissions.map((permission) => (
            <Tag key={permission} color="blue" style={{ fontSize: '11px' }}>
              {permission}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (value: boolean) => (
        <TagField
          value={value ? "启用" : "禁用"}
          color={value ? "green" : "red"}
        />
      ),
    },
    {
      title: "使用次数",
      dataIndex: "usageCount",
      key: "usageCount",
      sorter: true,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "最后使用",
      dataIndex: "lastUsedAt",
      key: "lastUsedAt",
      render: (value: string) => value ? <DateField value={value} /> : '-',
    },
    {
      title: "过期时间",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (value: string) => value ? <DateField value={value} /> : '永不过期',
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => <DateField value={value} />,
    },
    {
      title: "操作",
      dataIndex: "actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <ShowButton hideText size="small" recordItemId={record.id} />
          <EditButton hideText size="small" recordItemId={record.id} />
          <Tooltip title="重新生成">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRegenerate(record.id, record.name)}
            />
          </Tooltip>
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  return (
    <List
      breadcrumb={false}
      headerButtons={() => [
        <CreateButton key="create" />,
        <Button
          key="stats"
          type="primary"
          icon={<BarChartOutlined />}
          onClick={() => navigate('/api-keys/stats')}
        >
          使用统计
        </Button>
      ]}
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
