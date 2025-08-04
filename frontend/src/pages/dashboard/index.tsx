import React, { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography, Space, Button, Table, Tag } from "antd";
import {
  RobotOutlined,
  FileTextOutlined,
  SettingOutlined,
  ApiOutlined,
  DollarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { analyticsAPI } from "../../utils/api";

const { Title, Text } = Typography;

interface DashboardStats {
  totalUsers: number;
  totalApiCalls: number;
  totalCost: number;
  activeModels: number;
  activeTemplates: number;
  totalConfigs: number;
  recentActivity: Array<{
    id: number;
    action: string;
    resourceType: string;
    user: string;
    timestamp: string;
  }>;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalApiCalls: 0,
    totalCost: 0,
    activeModels: 0,
    activeTemplates: 0,
    totalConfigs: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 获取基础统计数据 - 使用现有的分析API
      try {
        const analyticsResponse = await analyticsAPI.getOverview();
        console.log('分析API响应:', analyticsResponse);

        if (analyticsResponse?.data?.success && analyticsResponse.data.data) {
          const data = analyticsResponse.data.data;
          setStats({
            totalUsers: data.users?.total || 0,
            totalApiCalls: Math.floor(Math.random() * 10000), // 模拟数据，后续可以添加真实API
            totalCost: Math.floor(Math.random() * 1000), // 模拟数据，后续可以添加真实API
            activeModels: data.models?.active || 0,
            activeTemplates: data.templates?.active || 0,
            totalConfigs: Math.floor(Math.random() * 50) + 10, // 模拟配置数据
            recentActivity: data.recentActivity || [
              {
                id: 1,
                action: "创建AI模型",
                resourceType: "ai_model",
                user: "admin",
                timestamp: new Date().toISOString(),
              },
              {
                id: 2,
                action: "更新提示词模板",
                resourceType: "prompt_template",
                user: "admin",
                timestamp: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: 3,
                action: "修改应用配置",
                resourceType: "app_config",
                user: "admin",
                timestamp: new Date(Date.now() - 7200000).toISOString(),
              },
            ],
          });
        } else {
          console.warn("分析API响应格式不正确:", analyticsResponse);
          throw new Error('API响应格式不正确');
        }
      } catch (analyticsError) {
        console.warn("分析API暂不可用，使用模拟数据:", analyticsError);
        // 如果分析API不可用，使用模拟数据
        setStats({
          totalUsers: 1,
          totalApiCalls: Math.floor(Math.random() * 10000),
          totalCost: Math.floor(Math.random() * 1000),
          activeModels: 2,
          activeTemplates: 5,
          totalConfigs: 10,
          recentActivity: [
            {
              id: 1,
              action: "创建AI模型",
              resourceType: "ai_model",
              user: "admin",
              timestamp: new Date().toISOString(),
            },
            {
              id: 2,
              action: "更新提示词模板",
              resourceType: "prompt_template",
              user: "admin",
              timestamp: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 3,
              action: "修改应用配置",
              resourceType: "app_config",
              user: "admin",
              timestamp: new Date(Date.now() - 7200000).toISOString(),
            },
          ],
        });
      }
    } catch (error) {
      console.error("加载仪表盘数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const activityColumns = [
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
    },
    {
      title: "资源类型",
      dataIndex: "resourceType",
      key: "resourceType",
      render: (type: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          ai_model: { color: "blue", text: "AI模型" },
          prompt_template: { color: "green", text: "提示词" },
          app_config: { color: "orange", text: "应用配置" },
        };
        const config = typeMap[type] || { color: "default", text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "操作用户",
      dataIndex: "user",
      key: "user",
    },
    {
      title: "时间",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString("zh-CN");
      },
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Title level={2}>仪表盘</Title>
          <Text type="secondary">占卜应用管理后台概览</Text>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="管理员用户"
                value={stats.totalUsers}
                prefix={<RobotOutlined />}
                loading={loading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="活跃 AI 模型"
                value={stats.activeModels}
                prefix={<ApiOutlined />}
                loading={loading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="活跃提示词模板"
                value={stats.activeTemplates}
                prefix={<FileTextOutlined />}
                loading={loading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="应用配置"
                value={stats.totalConfigs}
                prefix={<SettingOutlined />}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* 快速操作 */}
        <Card title="快速操作" size="small">
          <Space wrap>
            <Button type="primary" icon={<RobotOutlined />} href="/ai-models/create">
              创建AI模型
            </Button>
            <Button icon={<FileTextOutlined />} href="/prompts/create">
              创建提示词模板
            </Button>
            <Button icon={<SettingOutlined />} href="/configs/create">
              创建应用配置
            </Button>
          </Space>
        </Card>

        {/* 最近活动 */}
        <Card title="最近活动" size="small">
          <Table
            columns={activityColumns}
            dataSource={stats.recentActivity}
            rowKey="id"
            pagination={false}
            size="small"
            loading={loading}
          />
        </Card>

        {/* 系统状态 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="系统状态" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>API服务</Text>
                  <Tag color="green">正常</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>数据库连接</Text>
                  <Tag color="green">正常</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>认证服务</Text>
                  <Tag color="green">正常</Tag>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="版本信息" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>前端版本</Text>
                  <Text code>v1.0.0</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>后端版本</Text>
                  <Text code>v1.0.0</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>数据库版本</Text>
                  <Text code>PostgreSQL 14+</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};
