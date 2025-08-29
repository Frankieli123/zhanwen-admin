import React, { useState, useEffect } from "react";
import { 
  Card, Row, Col, Statistic, Table, Tag, Spin, DatePicker, Select, Space, Button, message,
  Tabs, Progress, Badge, Tooltip, Typography, Divider, Alert, Descriptions
} from "antd";
import {
  ApiOutlined, DatabaseOutlined, ClockCircleOutlined, AlertOutlined,
  CloudDownloadOutlined, GlobalOutlined, MobileOutlined, DesktopOutlined,
  ThunderboltOutlined, LineChartOutlined, BarChartOutlined, PieChartOutlined,
  SyncOutlined, ExportOutlined, FilterOutlined, CopyOutlined
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
  metricsData: any[];
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
    devices: {},
    metricsData: []
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
      const params: any = {
        startDate: startDate.startOf('day').toISOString(),
        endDate: endDate.endOf('day').toISOString(),
        apiKeyId: filters.apiKeyId,
        clientId: filters.clientId,
        groupBy: filters.groupBy
      };
      // 清理空过滤参数，确保“全部”不传 apiKeyId，避免后端被动过滤
      if (params.apiKeyId == null) delete params.apiKeyId;
      if (!params.clientId) delete params.clientId;
      const apiKeyParam = filters.apiKeyId == null ? {} : { apiKeyId: filters.apiKeyId };

      // 并行加载所有数据
      const [logs, metrics, clients, realtime, errors, performance, endpoints, geo, devices, metricsData] = await Promise.allSettled([
        usageAPI.getApiLogs({ ...params, limit: 100 }),
        usageAPI.getUsageMetrics(params),
        usageAPI.getClientStats({ ...apiKeyParam, top: 10 }),
        usageAPI.getRealtimeStats(),
        usageAPI.getErrorAnalysis({ ...apiKeyParam }),
        usageAPI.getPerformanceMetrics({ ...apiKeyParam }),
        usageAPI.getEndpointStats({ ...apiKeyParam, top: 10 }),
        usageAPI.getGeoAnalysis({ ...apiKeyParam }),
        usageAPI.getDeviceAnalysis({ ...apiKeyParam }),
        usageAPI.getMetricsData({ ...params, limit: 100 })
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
        devices: devices.status === 'fulfilled' ? devices.value.data || {} : {},
        metricsData: metricsData.status === 'fulfilled' ? metricsData.value.data || [] : []
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

  // API调用日志表格列（扩展以适配更详细的上报字段）
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
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
      render: (uid: string) => uid ? <Tag color="purple">{uid}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: '客户端ID',
      dataIndex: 'clientId',
      key: 'clientId',
      width: 140,
      ellipsis: true,
      render: (id: string) => <Tag color="blue">{id}</Tag>
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (pf: string) => pf ? (
        <Tag color={pf === 'web' ? 'geekblue' : pf === 'ios' ? 'gold' : pf === 'android' ? 'green' : 'default'}>
          {pf}
        </Tag>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      width: 220,
      render: (endpoint: string, record: any) => (
        <Space>
          <Tag color={record.method === 'GET' ? 'green' : 'orange'}>{record.method}</Tag>
          <Text code>{endpoint}</Text>
        </Space>
      )
    },
    {
      title: '状态码',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 100,
      render: (code: number) => (
        <Badge 
          status={code < 400 ? 'success' : code < 500 ? 'warning' : 'error'}
          text={code}
        />
      )
    },
    {
      title: '调用状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => (
        <Badge status={s === 'success' ? 'success' : s === 'error' ? 'error' : 'default'} text={s || '-'} />
      )
    },
    {
      title: '模型',
      key: 'model',
      width: 160,
      render: (_: any, record: any) => {
        const model = record.modelId ?? record?.metadata?.model ?? record?.metadata?.modelId;
        return model ? <Tag color="cyan">{model}</Tag> : <Text type="secondary">-</Text>;
      }
    },
    {
      title: 'Tokens',
      dataIndex: 'tokensUsed',
      key: 'tokensUsed',
      width: 110,
      render: (v: number) => v != null ? <Text>{new Intl.NumberFormat().format(v)}</Text> : <Text type="secondary">-</Text>
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 110,
      render: (v: number) => v != null ? <Tag color="gold">{v.toFixed(6)}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: '响应时间',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 120,
      render: (_: any, record: any) => {
        const time = record?.responseTime ?? record?.responseTimeMs ?? record?.response_time_ms;
        if (time == null) return <Text type="secondary">-</Text>;
        const color = time < 100 ? 'green' : time < 500 ? 'orange' : 'red';
        return <Tag color={color}>{time}ms</Tag>;
      }
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      width: 220,
      render: (msg: string) => msg ? (
        <Tooltip title={msg}><Text ellipsis style={{ width: 200 }}>{msg}</Text></Tooltip>
      ) : <Text type="secondary">-</Text>
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
          <Text ellipsis style={{ width: 220 }}>{ua}</Text>
        </Tooltip>
      )
    }
  ];

  // 日志展开内容：展示 requestId/sessionId/metadata 与 clientInfo 详情
  const renderLogExpanded = (record: any) => {
    const ci = record?.clientInfo || {};
    const md = record?.metadata || {};
    const copyToClipboard = async (text?: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
      } catch (e) {
        message.warning('复制失败');
      }
    };

    const screenInfo = ci?.screen ? `${ci.screen.width}x${ci.screen.height} / depth:${ci.screen.colorDepth ?? ci.screen.depth ?? '-'} / pxDepth:${ci.screen.pixelDepth ?? '-'}` : '-';
    const viewportInfo = ci?.viewport ? `${ci.viewport.width}x${ci.viewport.height}` : '-';
    const conn = ci?.connection || {};
    const connInfo = conn?.effectiveType || conn?.downlink || conn?.rtt || conn?.saveData != null
      ? `${conn.effectiveType ?? '-'} / ${conn.downlink ?? '-'}Mbps / ${conn.rtt ?? '-'}ms / save:${conn.saveData ?? '-'}`
      : '-';

    return (
      <div style={{ padding: '8px 16px' }}>
        <Descriptions size="small" column={2} title="请求详情" bordered>
          <Descriptions.Item label="请求ID">
            <Space>
              <Text code>{record?.requestId || '-'}</Text>
              {record?.requestId && <Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(record.requestId)} />}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="会话ID">
            <Space>
              <Text code>{record?.sessionId || '-'}</Text>
              {record?.sessionId && <Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(record.sessionId)} />}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="用户ID">{record?.userId || '-'}</Descriptions.Item>
          <Descriptions.Item label="平台">{record?.platform || '-'}</Descriptions.Item>
          <Descriptions.Item label="模型ID">{record?.modelId ?? md?.modelId ?? md?.model ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Tokens">{record?.tokensUsed ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="成本">{record?.cost ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="调用状态">{record?.status || '-'}</Descriptions.Item>
          {record?.errorMessage && (
            <Descriptions.Item label="错误信息" span={2}>
              <Text type="danger">{record.errorMessage}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider style={{ margin: '12px 0' }} />

        <Descriptions size="small" column={2} title="元数据 (metadata)" bordered>
          <Descriptions.Item label="model">{md?.model || '-'}</Descriptions.Item>
          <Descriptions.Item label="promptType">{md?.promptType || '-'}</Descriptions.Item>
          <Descriptions.Item label="userAgent" span={2}>
            <Text ellipsis>{md?.userAgent || '-'}</Text>
          </Descriptions.Item>
          {md?.endpoint && (
            <Descriptions.Item label="endpoint" span={2}>
              <Text code>{md.endpoint}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider style={{ margin: '12px 0' }} />

        <Descriptions size="small" column={2} title="客户端信息 (clientInfo)" bordered>
          <Descriptions.Item label="userAgent" span={2}>{ci?.userAgent || '-'}</Descriptions.Item>
          <Descriptions.Item label="language">{ci?.language || '-'}</Descriptions.Item>
          <Descriptions.Item label="languages">{Array.isArray(ci?.languages) ? ci.languages.join(', ') : '-'}</Descriptions.Item>
          <Descriptions.Item label="platform">{ci?.platform || '-'}</Descriptions.Item>
          <Descriptions.Item label="cookieEnabled">{ci?.cookieEnabled?.toString() ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="onLine">{ci?.onLine?.toString() ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="screen">{screenInfo}</Descriptions.Item>
          <Descriptions.Item label="viewport">{viewportInfo}</Descriptions.Item>
          <Descriptions.Item label="timezone">{ci?.timezone || '-'}</Descriptions.Item>
          <Descriptions.Item label="deviceMemory">{ci?.deviceMemory ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="hardwareConcurrency">{ci?.hardwareConcurrency ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="connection">{connInfo}</Descriptions.Item>
          <Descriptions.Item label="appVersion">{ci?.appVersion || '-'}</Descriptions.Item>
          <Descriptions.Item label="buildTime">{ci?.buildTime || '-'}</Descriptions.Item>
        </Descriptions>
      </div>
    );
  };

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

  // 使用指标表格列
  const metricsColumns = [
    {
      title: '时间',
      dataIndex: 'created',
      key: 'created',
      width: 180,
      render: (ts: string) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a: any, b: any) => new Date(a.created).getTime() - new Date(b.created).getTime()
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '指标名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => {
        const displayNames = {
          api_calls: 'API调用次数',
          total_tokens: 'Token使用量',
          successful_requests: '成功请求数',
          failed_requests: '失败请求数',
          unique_users: '独立用户数',
          session_duration: '会话时长',
          response_time: '响应时间',
          error_rate: '错误率'
        };
        return <Tag color="blue">{(displayNames as any)[name] || name}</Tag>;
      }
    },
    {
      title: '指标值',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      render: (v: string | number) => <Text strong>{new Intl.NumberFormat().format(Number(v))}</Text>
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (pf: string) => pf ? (
        <Tag color={pf === 'web' ? 'geekblue' : pf === 'ios' ? 'gold' : pf === 'android' ? 'green' : 'default'}>
          {pf}
        </Tag>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: '客户端ID',
      dataIndex: 'clientId',
      key: 'clientId',
      width: 140,
      ellipsis: true,
      render: (id: string) => id ? <Tag color="purple">{id}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
      render: (uid: string) => uid ? <Tag color="cyan">{uid}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: '会话ID',
      dataIndex: 'sessionId',
      key: 'sessionId',
      width: 140,
      ellipsis: true,
      render: (sid: string) => sid ? <Text code>{sid}</Text> : <Text type="secondary">-</Text>
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 180,
      render: (ts: string) => ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : <Text type="secondary">-</Text>
    }
  ];

  // 指标展开内容：展示 metadata 与 clientInfo 详情
  const renderMetricExpanded = (record: any) => {
    const ci = record?.clientInfo || {};
    const md = record?.metadata || {};
    
    const copyToClipboard = async (text?: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
      } catch (e) {
        message.warning('复制失败');
      }
    };

    const screenInfo = ci?.screen ? `${ci.screen.width}x${ci.screen.height} / depth:${ci.screen.colorDepth ?? ci.screen.depth ?? '-'} / pxDepth:${ci.screen.pixelDepth ?? '-'}` : '-';
    const viewportInfo = ci?.viewport ? `${ci.viewport.width}x${ci.viewport.height}` : '-';
    const conn = ci?.connection || {};
    const connInfo = conn?.effectiveType || conn?.downlink || conn?.rtt || conn?.saveData != null
      ? `${conn.effectiveType ?? '-'} / ${conn.downlink ?? '-'}Mbps / ${conn.rtt ?? '-'}ms / save:${conn.saveData ?? '-'}`
      : '-';

    return (
      <div style={{ padding: '8px 16px' }}>
        <Descriptions size="small" column={2} title="指标详情" bordered>
          <Descriptions.Item label="指标名称">{record?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="指标值">{record?.value || '-'}</Descriptions.Item>
          <Descriptions.Item label="日期">{record?.date ? dayjs(record.date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
          <Descriptions.Item label="平台">{record?.platform || '-'}</Descriptions.Item>
          <Descriptions.Item label="客户端ID">
            <Space>
              <Text code>{record?.clientId || '-'}</Text>
              {record?.clientId && <Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(record.clientId)} />}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="会话ID">
            <Space>
              <Text code>{record?.sessionId || '-'}</Text>
              {record?.sessionId && <Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(record.sessionId)} />}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="用户ID">{record?.userId || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{record?.created ? dayjs(record.created).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: '12px 0' }} />

        <Descriptions size="small" column={2} title="元数据 (metadata)" bordered>
          {Object.keys(md).length > 0 ? (
            Object.entries(md).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Descriptions.Item>
            ))
          ) : (
            <Descriptions.Item label="无数据" span={2}>-</Descriptions.Item>
          )}
        </Descriptions>

        {ci && Object.keys(ci).length > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Descriptions size="small" column={2} title="客户端信息 (clientInfo)" bordered>
              <Descriptions.Item label="userAgent" span={2}>{ci?.userAgent || '-'}</Descriptions.Item>
              <Descriptions.Item label="language">{ci?.language || '-'}</Descriptions.Item>
              <Descriptions.Item label="languages">{Array.isArray(ci?.languages) ? ci.languages.join(', ') : '-'}</Descriptions.Item>
              <Descriptions.Item label="platform">{ci?.platform || '-'}</Descriptions.Item>
              <Descriptions.Item label="cookieEnabled">{ci?.cookieEnabled?.toString() ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="onLine">{ci?.onLine?.toString() ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="screen">{screenInfo}</Descriptions.Item>
              <Descriptions.Item label="viewport">{viewportInfo}</Descriptions.Item>
              <Descriptions.Item label="timezone">{ci?.timezone || '-'}</Descriptions.Item>
              <Descriptions.Item label="deviceMemory">{ci?.deviceMemory ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="hardwareConcurrency">{ci?.hardwareConcurrency ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="connection">{connInfo}</Descriptions.Item>
              <Descriptions.Item label="appVersion">{ci?.appVersion || '-'}</Descriptions.Item>
              <Descriptions.Item label="buildTime">{ci?.buildTime || '-'}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </div>
    );
  };

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
      const exportParams: any = {
        type,
        format,
        startDate: startDate.startOf('day').toISOString(),
        endDate: endDate.endOf('day').toISOString(),
      };
      if (filters.apiKeyId != null) exportParams.apiKeyId = filters.apiKeyId;
      const response = await usageAPI.exportReport(exportParams);
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
                value={filters.apiKeyId !== undefined ? String(filters.apiKeyId) : undefined}
                onChange={(value) => {
                  setAutoLoadEnabled(true);
                  const next = (value === undefined || value === '__ALL__') ? undefined : Number(value);
                  setFilters({ ...filters, apiKeyId: next });
                }}
              >
                <Option value="__ALL__">全部</Option>
                {apiKeys.map(key => (
                  <Option key={key.id} value={String(key.id)}>{key.name}</Option>
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
              scroll={{ x: 1600 }}
              expandable={{
                expandedRowRender: (record) => renderLogExpanded(record),
                rowExpandable: (record) => Boolean(record?.clientInfo || record?.metadata)
              }}
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

          <TabPane tab={<span><BarChartOutlined /> 使用指标</span>} key="metrics-data">
            <Table
              columns={metricsColumns}
              dataSource={data.metricsData}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1400 }}
              expandable={{
                expandedRowRender: (record) => renderMetricExpanded(record),
                rowExpandable: (record) => Boolean(record?.clientInfo || record?.metadata)
              }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条指标记录`
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
