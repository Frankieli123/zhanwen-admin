import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Space, Tag } from "antd";
import { ApiOutlined, KeyOutlined, ClockCircleOutlined, BarChartOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { apiKeysAPI } from "../../utils/api";

const { Option } = Select;
const { RangePicker } = DatePicker;

interface ApiKeyStats {
  id: number;
  name: string;
  usageCount: number;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
  daysSinceCreated: number;
  daysSinceLastUsed: number | null;
}

interface UsageStatsData {
  summary: {
    totalKeys: number;
    activeKeys: number;
    recentlyUsedKeys: number;
    totalUsage: number;
    averageUsage: number;
  };
  apiKeys: ApiKeyStats[];
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export const ApiKeyStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageStatsData | null>(null);
  const [days, setDays] = useState(30);

  const fetchStats = async (period: number = 30) => {
    try {
      setLoading(true);
      const response = await apiKeysAPI.getApiKeyUsageStats(period);
      setData(response.data);
    } catch (error) {
      console.error('获取API Key统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(days);
  }, [days]);

  const columns = [
    {
      title: 'API KEY 名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiKeyStats) => (
        <Space>
          <KeyOutlined />
          <span>{name}</span>
          {!record.isActive && <Tag color="red">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      sorter: (a: ApiKeyStats, b: ApiKeyStats) => a.usageCount - b.usageCount,
      render: (count: number) => (
        <Statistic 
          value={count} 
          valueStyle={{ fontSize: '14px' }}
          prefix={<BarChartOutlined />}
        />
      ),
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (lastUsedAt: string | null, record: ApiKeyStats) => {
        if (!lastUsedAt) {
          return <Tag color="gray">从未使用</Tag>;
        }
        
        const daysAgo = record.daysSinceLastUsed;
        let color = 'green';
        if (daysAgo === null) color = 'gray';
        else if (daysAgo > 30) color = 'red';
        else if (daysAgo > 7) color = 'orange';
        
        return (
          <Space direction="vertical" size="small">
            <div>{dayjs(lastUsedAt).format('YYYY-MM-DD HH:mm')}</div>
            <Tag color={color}>
              {daysAgo === null ? '从未使用' : `${daysAgo}天前`}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string, record: ApiKeyStats) => (
        <Space direction="vertical" size="small">
          <div>{dayjs(createdAt).format('YYYY-MM-DD')}</div>
          <Tag color="blue">{record.daysSinceCreated}天前创建</Tag>
        </Space>
      ),
    },
    {
      title: '平均日使用',
      key: 'dailyAverage',
      render: (record: ApiKeyStats) => {
        const average = record.daysSinceCreated > 0 
          ? (record.usageCount / record.daysSinceCreated).toFixed(1)
          : '0';
        return <span>{average} 次/天</span>;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>API KEY 使用统计</h2>
        <Space>
          <span>统计周期：</span>
          <Select
            value={days}
            onChange={(value) => setDays(value)}
            style={{ width: 120 }}
          >
            <Option value={7}>最近7天</Option>
            <Option value={30}>最近30天</Option>
            <Option value={90}>最近90天</Option>
            <Option value={365}>最近一年</Option>
          </Select>
        </Space>
      </div>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总 API KEY 数量"
                  value={data.summary.totalKeys}
                  prefix={<KeyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="活跃 API KEY"
                  value={data.summary.activeKeys}
                  prefix={<ApiOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="近期使用"
                  value={data.summary.recentlyUsedKeys}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                  suffix={`/ ${days}天`}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总调用次数"
                  value={data.summary.totalUsage}
                  prefix={<BarChartOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={12}>
              <Card>
                <Statistic
                  title="平均每个 KEY 使用次数"
                  value={data.summary.averageUsage}
                  precision={1}
                  valueStyle={{ color: '#13c2c2' }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic
                  title="日均调用次数"
                  value={data.summary.totalUsage / days}
                  precision={1}
                  suffix="次/天"
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="详细统计" style={{ marginTop: '24px' }}>
            <Table
              columns={columns}
              dataSource={data.apiKeys}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个 API KEY`,
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
};
