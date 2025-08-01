import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Spin } from "antd";
import { 
  UserOutlined, 
  RobotOutlined, 
  FileTextOutlined, 
  DatabaseOutlined,
  TrophyOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import { useApiUrl, useCustom } from "@refinedev/core";

export const Analytics: React.FC = () => {
  const apiUrl = useApiUrl();
  
  const { data: overviewData, isLoading: overviewLoading } = useCustom({
    url: `${apiUrl}/analytics/overview`,
    method: "get",
  });

  const { data: hexagramStats, isLoading: hexagramLoading } = useCustom({
    url: `${apiUrl}/analytics/hexagrams`,
    method: "get",
  });

  const { data: modelPerformance, isLoading: modelLoading } = useCustom({
    url: `${apiUrl}/analytics/models`,
    method: "get",
  });

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
      title: '提供商',
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

  if (overviewLoading || hexagramLoading || modelLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
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
