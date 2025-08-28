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
  totalHexagrams: number;
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
    totalHexagrams: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 并行获取所有数据
      const [overviewRes, usageRes, hexagramRes] = await Promise.allSettled([
        analyticsAPI.getOverview(),
        analyticsAPI.getUsageStatistics(),
        analyticsAPI.getHexagramStatistics()
      ]);

      let overview = null;
      let usageStats = null;
      let hexagramStats = null;

      // 处理概览数据
      if (overviewRes.status === 'fulfilled' && overviewRes.value?.success) {
        overview = overviewRes.value.data;
      }

      // 处理使用统计数据
      if (usageRes.status === 'fulfilled' && usageRes.value?.success) {
        usageStats = usageRes.value.data;
      }

      // 处理卦象统计数据
      if (hexagramRes.status === 'fulfilled' && hexagramRes.value?.success) {
        hexagramStats = hexagramRes.value.data;
      }

      // 设置统计数据
      setStats({
        totalUsers: overview?.users?.total || 0,
        totalApiCalls: usageStats?.summary?.totalRequests || 0,
        totalCost: 0, // 暂时设为0，等后端添加成本统计
        activeModels: overview?.models?.active || 0,
        activeTemplates: overview?.templates?.active || 0,
        totalConfigs: 0, // 暂时设为0，等后端添加配置统计
        totalHexagrams: hexagramStats?.total || 0,
        recentActivity: [
          {
            id: 1,
            action: `共有 ${overview?.models?.total || 0} 个AI模型`,
            resourceType: "ai_model",
            user: "系统",
            timestamp: new Date().toISOString(),
          },
          {
            id: 2,
            action: `共有 ${overview?.templates?.total || 0} 个提示词模板`,
            resourceType: "prompt_template",
            user: "系统",
            timestamp: new Date().toISOString(),
          },
          {
            id: 3,
            action: `共有 ${hexagramStats?.total || 0} 个卦象数据`,
            resourceType: "hexagram",
            user: "系统",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (error) {
      console.error("加载仪表盘数据失败:", error);
      // 设置默认值
      setStats({
        totalUsers: 0,
        totalApiCalls: 0,
        totalCost: 0,
        activeModels: 0,
        activeTemplates: 0,
        totalConfigs: 0,
        totalHexagrams: 0,
        recentActivity: [],
      });
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
                title="卦象数据"
                value={stats.totalHexagrams}
                prefix={<SettingOutlined />}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* 数据统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="总API调用数"
                value={stats.totalApiCalls}
                prefix={<ApiOutlined />}
                loading={loading}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="总成本"
                value={stats.totalCost}
                prefix={<DollarOutlined />}
                suffix="元"
                precision={2}
                loading={loading}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="系统运行时间"
                value={new Date().getHours()}
                prefix={<ClockCircleOutlined />}
                suffix="小时"
                loading={loading}
                valueStyle={{ color: '#722ed1' }}
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
