import React, { useState, useEffect } from "react";
import { 
  Card, Row, Col, Statistic, Table, Tag, Spin, DatePicker, Select, Space, Button, message,
  Tabs, Progress, Badge, Tooltip, Typography, Divider, Alert
} from "antd";
import {
  ApiOutlined, DatabaseOutlined, ClockCircleOutlined, AlertOutlined,
  CloudDownloadOutlined, GlobalOutlined, MobileOutlined, DesktopOutlined,
  ThunderboltOutlined, LineChartOutlined, BarChartOutlined, PieChartOutlined,
  SyncOutlined, ExportOutlined, FilterOutlined
} from "@ant-design/icons";
import { usageAPI, apiKeysAPI } from "../../utils/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/zh-cn';

// 配置dayjs插件
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');
// 暂时注释图表组件，使用Antd内置的

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface UsageData {
  logs: any[];
  metrics: any;
  clients: any[];
  realtime: any;
  errors: any;
  performance: any;
  endpoints: any[];
  geo: any[];
  devices: any;
}

export const UsageAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsageData>({
    logs: [],
    metrics: {},
    clients: [],
    realtime: {},
    errors: {},
    performance: {},
    endpoints: [],
    geo: [],
    devices: {}
  });
  
  const [filters, setFilters] = useState({
    dateRange: [dayjs().subtract(7, 'days'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs],
    apiKeyId: undefined as number | undefined,
    clientId: undefined as string | undefined,
    period: 'day' as 'day' | 'week' | 'month',
    groupBy: 'day' as 'hour' | 'day' | 'week' | 'month'
  });

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(false); // 是否自动加载（默认不自动，按缓存策略控制）

  // 加载API Keys列表
  useEffect(() => {
    loadApiKeys();
  }, []);

  // 首次挂载时尝试从缓存恢复，若无缓存则启用自动加载
  useEffect(() => {
    try {
      const cacheStr = sessionStorage.getItem('usageAnalyticsCache');
      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        if (cache?.data) {
          // 恢复数据
          setData(cache.data);
          // 恢复筛选
          if (cache.filters) {
            setFilters((prev) => ({
              ...prev,
              dateRange: [dayjs(cache.filters.dateRange?.[0] || dayjs().subtract(7, 'days')), dayjs(cache.filters.dateRange?.[1] || dayjs())] as [dayjs.Dayjs, dayjs.Dayjs],
              apiKeyId: cache.filters.apiKeyId ?? undefined,
              clientId: cache.filters.clientId ?? undefined,
              period: cache.filters.period || prev.period,
              groupBy: cache.filters.groupBy || prev.groupBy,
            }));
          }
          // 有缓存则不自动加载
          setAutoLoadEnabled(false);
          return;
        }
      }
    } catch (e) {
      console.error('恢复使用分析缓存失败:', e);
    }
    // 无缓存：允许自动加载
    setAutoLoadEnabled(true);
  }, []);

  // 加载数据
  useEffect(() => {
    if (!autoLoadEnabled) return;
    loadData();
  }, [filters, autoLoadEnabled]);

  const loadApiKeys = async () => {
    try {
      const response = await apiKeysAPI.getApiKeys();
      setApiKeys(response.data || []);
    } catch (error) {
      console.error('加载API Keys失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = filters.dateRange;
      const params = {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        apiKeyId: filters.apiKeyId,
        clientId: filters.clientId,
        period: filters.period,
        groupBy: filters.groupBy
      };

      // 并行加载所有数据
      const [logs, metrics, clients, realtime, errors, performance, endpoints, geo, devices] = await Promise.allSettled([
        usageAPI.getApiLogs({ ...params, limit: 100 }),
        usageAPI.getUsageMetrics(params),
        usageAPI.getClientStats({ apiKeyId: filters.apiKeyId, top: 10 }),
        usageAPI.getRealtimeStats(),
        usageAPI.getErrorAnalysis({ apiKeyId: filters.apiKeyId }),
        usageAPI.getPerformanceMetrics({ apiKeyId: filters.apiKeyId }),
        usageAPI.getEndpointStats({ apiKeyId: filters.apiKeyId, top: 10 }),
        usageAPI.getGeoAnalysis({ apiKeyId: filters.apiKeyId }),
        usageAPI.getDeviceAnalysis({ apiKeyId: filters.apiKeyId })
      ]);

      const nextData = {
        logs: logs.status === 'fulfilled' ? logs.value.data || [] : [],
        metrics: metrics.status === 'fulfilled' ? metrics.value.data || {} : {},
        clients: clients.status === 'fulfilled' ? clients.value.data || [] : [],
        realtime: realtime.status === 'fulfilled' ? realtime.value.data || {} : {},
        errors: errors.status === 'fulfilled' ? errors.value.data || {} : {},
        performance: performance.status === 'fulfilled' ? performance.value.data || {} : {},
        endpoints: endpoints.status === 'fulfilled' ? endpoints.value.data || [] : [],
        geo: geo.status === 'fulfilled' ? geo.value.data || [] : [],
        devices: devices.status === 'fulfilled' ? devices.value.data || {} : {}
      };
      setData(nextData);

      // 缓存当前数据和筛选
      try {
        sessionStorage.setItem('usageAnalyticsCache', JSON.stringify({
          filters: {
            dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')],
            apiKeyId: filters.apiKeyId,
            clientId: filters.clientId,
            period: filters.period,
            groupBy: filters.groupBy,
          },
          data: nextData,
        }));
      } catch (e) {
        console.error('缓存使用分析失败:', e);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // API调用日志表格列
  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (ts: string) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    },
    {
      title: '客户端ID',
      dataIndex: 'clientId',
      key: 'clientId',
      width: 120,
      ellipsis: true,
      render: (id: string) => <Tag color="blue">{id}</Tag>
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      width: 200,
      render: (endpoint: string, record: any) => (
        <Space>
          <Tag color={record.method === 'GET' ? 'green' : 'orange'}>{record.method}</Tag>
          <Text code>{endpoint}</Text>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 100,
      render: (code: number) => (
        <Badge 
          status={code < 400 ? "success" : code < 500 ? "warning" : "error"}
          text={code}
        />
      )
    },
    {
      title: '响应时间',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 120,
      render: (time: number) => {
        const color = time < 100 ? 'green' : time < 500 ? 'orange' : 'red';
        return <Tag color={color}>{time}ms</Tag>;
      }
    },
    {
      title: 'IP地址',
      dataIndex: ['metadata', 'ip'],
      key: 'ip',
      width: 140
    },
    {
      title: '用户代理',
      dataIndex: ['metadata', 'userAgent'],
      key: 'userAgent',
      ellipsis: true,
      render: (ua: string) => (
        <Tooltip title={ua}>
          <Text ellipsis style={{ width: 200 }}>{ua}</Text>
        </Tooltip>
      )
    }
  ];

  // 客户端统计表格列
  const clientColumns = [
    {
      title: '客户端ID',
      dataIndex: 'clientId',
      key: 'clientId',
      render: (id: string) => <Tag color="blue">{id}</Tag>
    },
    {
      title: '名称',
      dataIndex: ['info', 'name'],
      key: 'name',
    },
    {
      title: '版本',
      dataIndex: ['info', 'version'],
      key: 'version',
    },
    {
      title: '请求次数',
      dataIndex: 'requestCount',
      key: 'requestCount',
      sorter: (a: any, b: any) => a.requestCount - b.requestCount,
      render: (count: number) => <Statistic value={count} valueStyle={{ fontSize: 14 }} />
    },
    {
      title: '错误率',
      dataIndex: 'errorRate',
      key: 'errorRate',
      render: (rate: number) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate > 10 ? "exception" : rate > 5 ? "normal" : "success"}
        />
      )
    },
    {
      title: '平均响应时间',
      dataIndex: 'avgResponseTime',
      key: 'avgResponseTime',
      render: (time: number) => <Tag color={time < 200 ? 'green' : 'orange'}>{time}ms</Tag>
    },
    {
      title: '最后活跃',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      render: (date: string) => dayjs(date).fromNow()
    }
  ];

  // 端点统计表格列
  const endpointColumns = [
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (endpoint: string, record: any) => (
        <Space>
          <Tag color="cyan">{record.method}</Tag>
          <Text code>{endpoint}</Text>
        </Space>
      )
    },
    {
      title: '调用次数',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate: number) => (
        <Progress percent={rate} size="small" strokeColor="#52c41a" />
      )
    },
    {
      title: '平均响应时间',
      dataIndex: 'avgTime',
      key: 'avgTime',
      render: (time: number) => `${time}ms`
    },
    {
      title: 'P95响应时间',
      dataIndex: 'p95Time',
      key: 'p95Time',
      render: (time: number) => `${time}ms`
    }
  ];

  // 导出数据
  const handleExport = async (type: 'logs' | 'metrics' | 'summary', format: 'csv' | 'json' | 'pdf') => {
    try {
      const [startDate, endDate] = filters.dateRange;
      const response = await usageAPI.exportReport({
        type,
        format,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        apiKeyId: filters.apiKeyId
      });
      // 后端已按 format 返回文件流，前端直接使用 Blob 下载
      const blob = response as unknown as Blob;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-${type}-${dayjs().format('YYYYMMDD')}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
      console.error('导出失败:', error);
    }
  };

  // 准备图表数据
  const prepareChartData = () => {
    // 时间序列数据
    const timeSeriesData = data.metrics.timeSeries || [];
    
    // 设备分布数据
    const deviceData = [
      { type: '桌面', value: data.devices.desktop || 0 },
      { type: '移动', value: data.devices.mobile || 0 },
      { type: '平板', value: data.devices.tablet || 0 },
      { type: '其他', value: data.devices.other || 0 }
    ];

    // 地理分布数据
    const geoData = data.geo.slice(0, 10);

    return { timeSeriesData, deviceData, geoData };
  };

  const { timeSeriesData, deviceData, geoData } = prepareChartData();

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和过滤器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <LineChartOutlined /> 使用数据分析
            </Title>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => {
                  if (dates) {
                    setAutoLoadEnabled(true);
                    setFilters({ ...filters, dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs] });
                  }
                }}
              />
              <Select
                placeholder="选择API Key"
                style={{ width: 200 }}
                allowClear
                value={filters.apiKeyId}
                onChange={(value) => { setAutoLoadEnabled(true); setFilters({ ...filters, apiKeyId: value }); }}
              >
                {apiKeys.map(key => (
                  <Option key={key.id} value={key.id}>{key.name}</Option>
                ))}
              </Select>
              <Select
                value={filters.period}
                style={{ width: 120 }}
                onChange={(value) => { setAutoLoadEnabled(true); setFilters({ ...filters, period: value }); }}
              >
                <Option value="day">按天</Option>
                <Option value="week">按周</Option>
                <Option value="month">按月</Option>
              </Select>
              <Button icon={<SyncOutlined />} onClick={loadData}>刷新</Button>
              <Button icon={<ExportOutlined />} onClick={() => handleExport('summary', 'csv')}>导出</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 实时统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日请求"
              value={data.realtime.todayRequests || 0}
              prefix={<ApiOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: '#52c41a' }}>
                  ↑ {data.realtime.requestsGrowth || 0}%
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃客户端"
              value={data.realtime.activeClients || 0}
              prefix={<MobileOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={data.realtime.avgResponseTime || 0}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: data.realtime.avgResponseTime < 200 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="错误率"
              value={data.realtime.errorRate || 0}
              suffix="%"
              prefix={<AlertOutlined />}
              precision={2}
              valueStyle={{ color: data.realtime.errorRate > 5 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容标签页 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><BarChartOutlined /> 概览</span>} key="overview">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {/* 请求趋势图 */}
                <Col span={24}>
                  <Card title="请求趋势" size="small">
                    {timeSeriesData.length > 0 ? (
                      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
                        <Text>图表组件待集成</Text>
                      </div>
                    ) : (
                      <Alert message="暂无数据" type="info" />
                    )}
                  </Card>
                </Col>

                {/* 设备分布和地理分布 */}
                <Col span={12}>
                  <Card title="设备分布" size="small">
                    {deviceData.some(d => d.value > 0) ? (
                      <div style={{ padding: 20 }}>
                        {deviceData.map((item: any) => (
                          <div key={item.type} style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>{item.type}</Text>
                              <Text strong>{item.value}</Text>
                            </div>
                            <Progress 
                              percent={(item.value / deviceData.reduce((sum: number, d: any) => sum + d.value, 0)) * 100} 
                              showInfo={false}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert message="暂无数据" type="info" />
                    )}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="地理分布 TOP10" size="small">
                    {geoData.length > 0 ? (
                      <div style={{ padding: 20 }}>
                        {geoData.map((item: any, index: number) => (
                          <div key={index} style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>{(/^unknown$/i.test(item.location) ? '未知' : item.location)}</Text>
                              <Text strong>{item.count}</Text>
                            </div>
                            <Progress 
                              percent={(item.count / Math.max(...geoData.map((g: any) => g.count))) * 100} 
                              showInfo={false}
                              strokeColor="#1890ff"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert message="暂无数据" type="info" />
                    )}
                  </Card>
                </Col>
              </Row>
            )}
          </TabPane>

          <TabPane tab={<span><DatabaseOutlined /> API日志</span>} key="logs">
            <Table
              columns={logColumns}
              dataSource={data.logs}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </TabPane>

          <TabPane tab={<span><MobileOutlined /> 客户端分析</span>} key="clients">
            <Table
              columns={clientColumns}
              dataSource={data.clients}
              rowKey="clientId"
              loading={loading}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 个客户端`
              }}
            />
          </TabPane>

          <TabPane tab={<span><ThunderboltOutlined /> 端点性能</span>} key="endpoints">
            <Table
              columns={endpointColumns}
              dataSource={data.endpoints}
              rowKey="endpoint"
              loading={loading}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 个端点`
              }}
            />
          </TabPane>

          <TabPane tab={<span><AlertOutlined /> 错误分析</span>} key="errors">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card title="错误分布">
                  <div style={{ padding: 20 }}>
                    {data.errors.distribution ? (
                      Object.entries(data.errors.distribution).map(([code, count]: any) => (
                        <div key={code} style={{ marginBottom: 10 }}>
                          <Text strong>{code}:</Text>
                          <Progress percent={(count / data.errors.total) * 100} />
                        </div>
                      ))
                    ) : (
                      <Alert message="暂无错误数据" type="success" />
                    )}
                  </div>
                </Card>
              </Col>
              <Col span={16}>
                <Card title="最近错误">
                  <Table
                    dataSource={data.errors.recent || []}
                    columns={[
                      {
                        title: '时间',
                        dataIndex: 'timestamp',
                        key: 'timestamp',
                        render: (ts: string) => dayjs(ts).format('HH:mm:ss')
                      },
                      {
                        title: '端点',
                        dataIndex: 'endpoint',
                        key: 'endpoint'
                      },
                      {
                        title: '错误码',
                        dataIndex: 'statusCode',
                        key: 'statusCode',
                        render: (code: number) => <Tag color="red">{code}</Tag>
                      },
                      {
                        title: '错误信息',
                        dataIndex: 'message',
                        key: 'message',
                        ellipsis: true
                      }
                    ]}
                    size="small"
                    pagination={false}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};
