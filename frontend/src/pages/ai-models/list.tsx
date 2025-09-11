import React, { useState, useEffect, useRef } from "react";
import {
  List,
  useTable,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Tag, Button, Tooltip, message, Switch, InputNumber } from "antd";
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { aiModelsAPI } from "../../utils/api";
import { AIConfigService } from "../../services/aiConfigService";

export const AIModelList: React.FC = () => {
  const { tableProps, tableQueryResult } = useTable({
    syncWithLocation: true,
  });

  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [editingPriority, setEditingPriority] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [tempPriority, setTempPriority] = useState<number | null>(null);
  const editingRef = useRef<HTMLDivElement>(null);

  // 监听点击外部区域取消编辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingPriority && editingRef.current && !editingRef.current.contains(event.target as Node)) {
        cancelEditPriority();
      }
    };

    if (editingPriority) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingPriority]);

  // 处理启用/禁用状态切换
  const handleStatusToggle = async (id: number, currentStatus: boolean) => {
    try {
      setUpdatingStatus(id);
      const response = await aiModelsAPI.updateModel(id, { isActive: !currentStatus });
      
      if (response.success) {
        message.success(`模型已${!currentStatus ? '启用' : '禁用'}`);
        AIConfigService.clearCache();
        tableQueryResult?.refetch();
      } else {
        message.error(response.message || '状态更新失败');
      }
    } catch (error: any) {
      console.error('状态更新失败:', error);
      message.error(error.response?.data?.message || '状态更新失败');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // 处理优先级更新
  const handlePriorityUpdate = async (id: number, priority: number) => {
    try {
      const response = await aiModelsAPI.updateModel(id, { priority });
      
      if (response.success) {
        message.success('优先级已更新');
        AIConfigService.clearCache();
        tableQueryResult?.refetch();
      } else {
        message.error(response.message || '优先级更新失败');
      }
    } catch (error: any) {
      console.error('优先级更新失败:', error);
      message.error(error.response?.data?.message || '优先级更新失败');
    } finally {
      setEditingPriority(null);
      setTempPriority(null);
    }
  };

  // 开始编辑优先级
  const startEditPriority = (id: number, currentPriority: number) => {
    setEditingPriority(id);
    setTempPriority(currentPriority);
  };

  // 取消编辑优先级
  const cancelEditPriority = () => {
    setEditingPriority(null);
    setTempPriority(null);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      align: "center" as const,
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      width: 90,
      align: "center" as const,
      render: (value: boolean, record: any) => (
        <Switch
          checked={value}
          loading={updatingStatus === record.id}
          onChange={() => handleStatusToggle(record.id, value)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          size="small"
        />
      ),
    },
    {
      title: "模型名称",
      dataIndex: "displayName",
      key: "displayName",
      width: 180,
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: "服务商",
      dataIndex: ["provider", "displayName"],
      key: "provider",
      width: 120,
      align: "center" as const,
      render: (value: string) => <Tag color="green">{value}</Tag>,
    },
    {
      title: "模型类型",
      dataIndex: "modelType",
      key: "modelType",
      width: 100,
      align: "center" as const,
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
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 150,
      align: "center" as const,
      sorter: true,
      render: (value: number, record: any) => (
        <div onClick={(e) => e.stopPropagation()}>
          {editingPriority === record.id ? (
            <div ref={editingRef}>
              <Space size="small">
                <InputNumber
                  size="small"
                  min={1}
                  max={1000}
                  value={tempPriority}
                  onChange={(val) => setTempPriority(val)}
                  style={{ width: 70 }}
                />
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    if (tempPriority && tempPriority !== value) {
                      handlePriorityUpdate(record.id, tempPriority);
                    } else {
                      cancelEditPriority();
                    }
                  }}
                >
                  保存
                </Button>
              </Space>
            </div>
          ) : (
            <span
              onClick={() => startEditPriority(record.id, value)}
              style={{ 
                cursor: 'pointer', 
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid transparent',
                display: 'inline-block',
                minWidth: '40px',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.border = '1px solid #d9d9d9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.border = '1px solid transparent';
              }}
            >
              {value}
            </span>
          )}
        </div>
      ),
    },
    {
      title: "成本/1K tokens",
      dataIndex: "costPer1kTokens",
      key: "costPer1kTokens",
      width: 130,
      align: "right" as const,
      render: (value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return `¥${(numValue || 0).toFixed(4)}`;
      },
    },
    {
      title: "上下文窗口",
      dataIndex: "contextWindow",
      key: "contextWindow",
      width: 130,
      align: "right" as const,
      render: (value: number | string) => {
        const numValue = typeof value === 'string' ? parseInt(value) : value;
        return `${(numValue || 0).toLocaleString()} tokens`;
      },
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      align: "center" as const,
      render: (value: string) => new Date(value).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      dataIndex: "actions",
      key: "actions",
      fixed: "right" as const,
      width: 160,
      align: "center" as const,
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
          <DeleteButton 
            hideText 
            size="small" 
            recordItemId={record.id}
            onSuccess={() => {
              // 删除成功后清除AI配置缓存
              AIConfigService.clearCache();
            }}
          />
        </Space>
      ),
    },
  ];

  const handleTestConnection = async (id: number) => {
    try {
      setTestingConnection(id);
      message.loading({ content: "正在测试连接...", key: "test-connection" });

      // 首先获取模型详细信息
      const modelResponse = await aiModelsAPI.getModel(id);
      if (!modelResponse.success || !modelResponse.data) {
        message.error({
          content: "获取模型信息失败",
          key: "test-connection",
          duration: 3,
        });
        return;
      }

      const model = modelResponse.data;

      // 检查是否有API密钥
      if (!model.apiKeyEncrypted) {
        message.error({
          content: "该模型未配置API密钥，无法测试连接",
          key: "test-connection",
          duration: 3,
        });
        return;
      }

      const startTime = Date.now();

      // 调用真实的API测试接口
      const response = await aiModelsAPI.testConnection({
        provider: model.provider?.name || 'custom',
        apiKey: model.apiKeyEncrypted,
        apiUrl: model.customApiUrl || model.provider?.baseUrl,
      });

      const duration = Date.now() - startTime;

      if (response.success && response.data?.connected) {
        message.success({
          content: `连接测试成功！响应时间: ${duration}ms`,
          key: "test-connection",
          duration: 3,
        });
      } else {
        message.error({
          content: `连接测试失败 (${duration}ms): ${response.message || '未知错误'}`,
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
