import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Spin, Button, Space } from "antd";
import {
  UserOutlined,
  RobotOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  ApiOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { analyticsAPI } from "../../utils/api";

export const Analytics: React.FC = () => {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [hexagramStats, setHexagramStats] = useState<any>(null);
  const [modelPerformance, setModelPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('开始获取分析数据...');

        const [overview, hexagrams, models] = await Promise.all([
          analyticsAPI.getOverview(),
          analyticsAPI.getHexagramStatistics(),
          analyticsAPI.getModelPerformance()
        ]);

        console.log('分析数据获取结果:', { overview, hexagrams, models });

        setOverviewData(overview.data);
        setHexagramStats(hexagrams.data);
        setModelPerformance(models.data);
      } catch (error) {
        console.error('获取分析数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const overview = overviewData?.data;
  const hexagrams = hexagramStats?.data;
  const models = modelPerformance?.data;

  const elementColors = {
    wood: "green",
    fire: "red", 
    earth: "orange",
    metal: "blue",
    water: "cyan",
  };

  const elementNames = {
    wood: '木',
    fire: '火',
    earth: '土',
    metal: '金',
    water: '水',
  };

  const hexagramColumns = [
    {
      title: '卦象名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '五行属性',
      dataIndex: 'element',
      key: 'element',
      render: (element: string) => (
        <Tag color={elementColors[element as keyof typeof elementColors]}>
          {elementNames[element as keyof typeof elementNames]}
        </Tag>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      sorter: (a: any, b: any) => a.usageCount - b.usageCount,
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
  ];

  const modelColumns = [
    {
      title: '模型名称',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: '服务商',
      dataIndex: 'provider',
      key: 'provider',
    },
    {
      title: '总请求数',
      dataIndex: ['usage', 'totalRequests'],
      key: 'totalRequests',
      sorter: (a: any, b: any) => a.usage.totalRequests - b.usage.totalRequests,
    },
    {
      title: '成功率',
      dataIndex: ['usage', 'successRate'],
      key: 'successRate',
      render: (rate: number) => `${rate.toFixed(1)}%`,
    },
    {
      title: '平均响应时间',
      dataIndex: ['usage', 'avgResponseTime'],
      key: 'avgResponseTime',
      render: (time: number) => `${time}ms`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和操作按钮 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>数据分析中心</h2>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<LineChartOutlined />}
                onClick={() => navigate('/analytics/usage')}
              >
                使用数据分析
              </Button>
              <Button 
                icon={<ApiOutlined />}
                onClick={() => navigate('/api-keys/stats')}
              >
                API Key统计
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 概览统计 */}
        <Col span={6}>
          <Card>
            <Statistic
              title="管理员用户"
              value={overview?.users?.total || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="AI模型"
              value={overview?.models?.active || 0}
              suffix={`/ ${overview?.models?.total || 0}`}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="提示词模板"
              value={overview?.templates?.active || 0}
              suffix={`/ ${overview?.templates?.total || 0}`}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="卦象数据"
              value={overview?.hexagrams?.total || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>

        {/* 卦象使用排行 */}
        <Col span={24}>
          <Card title="卦象使用统计" extra={<TrophyOutlined />}>
            <Table
              dataSource={hexagrams?.usageRanking || []}
              columns={hexagramColumns}
              pagination={{ pageSize: 10 }}
              rowKey="id"
            />
          </Card>
        </Col>

        {/* 模型性能统计 */}
        <Col span={24}>
          <Card title="AI模型性能统计" extra={<ClockCircleOutlined />}>
            <Table
              dataSource={models || []}
              columns={modelColumns}
              pagination={{ pageSize: 10 }}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
