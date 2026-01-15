<template>
  <div class="art-page-view">
    <ArtSearchBar
      v-model="searchFormModel"
      :items="searchItems"
      :is-expand="false"
      :show-expand="true"
      :show-reset="true"
      :show-search="true"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>客户端上报指标</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else type="success">{{ pagination.total }} 条</ElTag>
          </div>
        </div>
      </template>

      <ArtTableHeader
        v-model:columns="columnChecks"
        @refresh="handleRefresh"
        layout="refresh,size,fullscreen,columns"
        fullClass="art-table-card"
      />

      <ArtTable
        :loading="loading"
        :pagination="pagination"
        :data="pagedRows"
        :columns="columns"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #date="{ row }">
          {{ formatDate(row.date) }}
        </template>
        <template #name="{ row }">
          <div class="metric-name-cell">
            <span class="cn-name">{{ getMetricLabel(row.name) }}</span>
            <span class="raw-name">{{ row.name }}</span>
          </div>
        </template>
        <template #value="{ row }">
          {{ formatMetricValue(row.name, row.value) }}
        </template>
        <template #description="{ row }">
          {{ getMetricDesc(row.name) }}
        </template>
        <template #updatedAt="{ row }">
          {{ formatDateTime(row.lastUpdated || row.created) }}
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageMetricsData, type UsageMetricDataItem, type UsageMetricsDataParams } from '@/api/usage'

  defineOptions({ name: 'ClientMetrics' })

  const loading = ref(false)
  const rows = ref<UsageMetricDataItem[]>([])
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  const searchFormState = reactive<Record<string, any>>({
    dateRange: undefined,
    clientId: '',
    metricName: '',
    limit: 200
  })

  const searchFormModel = computed<Record<string, any>>({
    get: () => searchFormState,
    set: (v) => Object.assign(searchFormState, v || {})
  })

  const searchItems = computed(() => [
    {
      key: 'dateRange',
      label: '日期',
      type: 'daterange',
      props: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
        clearable: true
      }
    },
    {
      key: 'clientId',
      label: '客户端ID',
      type: 'input',
      props: { placeholder: '可选', clearable: true }
    },
    {
      key: 'metricName',
      label: '指标名',
      type: 'input',
      props: { placeholder: '如 client_ai_reading_request_count', clearable: true }
    },
    {
      key: 'limit',
      label: '拉取条数',
      type: 'number',
      props: { min: 1, max: 1000, controls: false }
    }
  ])

  const metricDict: Record<string, { label: string; desc: string }> = {
    client_app_open_count: { label: '启动次数', desc: '应用被打开/启动的次数（按天累计）' },
    client_active_ms_sum: { label: '前台活跃时长', desc: '应用在前台/可见状态的活跃时长累计（ms）' },
    client_online_count: { label: '上线次数', desc: '检测到网络恢复/在线事件的次数' },
    client_offline_count: { label: '离线次数', desc: '检测到网络断开/离线事件的次数' },

    client_pv_divination_count: { label: '页面访问：起卦', desc: '进入起卦页次数' },
    client_pv_history_count: { label: '页面访问：历史', desc: '进入历史页次数' },
    client_pv_settings_count: { label: '页面访问：设置', desc: '进入设置页次数' },
    client_pv_result_count: { label: '页面访问：结果', desc: '进入结果页次数' },
    client_pv_detail_count: { label: '页面访问：详情', desc: '进入卦象详情页次数' },
    client_pv_aireading_count: { label: '页面访问：详细解读', desc: '进入详细解读页次数' },

    client_divination_generate_time_count: { label: '起卦次数：正时卦', desc: '按时间起卦成功次数' },
    client_divination_generate_realtime_count: { label: '起卦次数：实时卦', desc: '实时起卦成功次数' },
    client_divination_generate_random_count: { label: '起卦次数：活时卦', desc: '随机/活时起卦成功次数' },

    client_ai_reading_request_count: { label: 'AI解读：请求次数', desc: '向后端发起“详细解读”请求次数' },
    client_ai_reading_success_count: { label: 'AI解读：成功次数', desc: '详细解读请求成功次数' },
    client_ai_reading_error_count: { label: 'AI解读：失败次数', desc: '详细解读请求失败次数（非取消）' },
    client_ai_reading_abort_count: { label: 'AI解读：取消次数', desc: '详细解读请求被取消/中止的次数' },
    client_ai_reading_latency_ms_sum: { label: 'AI解读：耗时总和', desc: '详细解读端到端耗时累计（ms）' },
    client_ai_reading_latency_ms_count: { label: 'AI解读：耗时计数', desc: '耗时统计样本数（用于计算平均耗时）' },

    client_js_error_count: { label: '前端错误次数', desc: 'window error 事件次数（不含敏感细节）' },
    client_unhandled_rejection_count: { label: '未处理Promise拒绝', desc: 'unhandledrejection 事件次数（不含敏感细节）' },

    client_perf_lcp_ms_sum: { label: '性能：LCP总和', desc: 'Largest Contentful Paint 累计（ms）' },
    client_perf_lcp_count: { label: '性能：LCP计数', desc: 'LCP 样本数' },
    client_perf_fcp_ms_sum: { label: '性能：FCP总和', desc: 'First Contentful Paint 累计（ms）' },
    client_perf_fcp_count: { label: '性能：FCP计数', desc: 'FCP 样本数' },
    client_perf_ttfb_ms_sum: { label: '性能：TTFB总和', desc: 'Time To First Byte 累计（ms）' },
    client_perf_ttfb_count: { label: '性能：TTFB计数', desc: 'TTFB 样本数' },
    client_perf_fid_ms_sum: { label: '性能：FID总和', desc: 'First Input Delay 累计（ms）' },
    client_perf_fid_count: { label: '性能：FID计数', desc: 'FID 样本数' },
    client_perf_cls_x1000_sum: { label: '性能：CLS总和', desc: 'Cumulative Layout Shift 累计（x1000）' },
    client_perf_cls_count: { label: '性能：CLS计数', desc: 'CLS 样本数' }
  }

  const buildQueryParams = (): UsageMetricsDataParams => {
    const params: UsageMetricsDataParams = { limit: Number(searchFormState.limit || 200) }
    const clientId = String(searchFormState.clientId || '').trim()
    if (clientId) params.clientId = clientId
    const metricName = String(searchFormState.metricName || '').trim()
    if (metricName) params.metricName = metricName
    const range = searchFormState.dateRange
    if (Array.isArray(range) && range.length === 2) {
      const [startDate, endDate] = range
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
    }
    return params
  }

  const load = async () => {
    loading.value = true
    try {
      const data = await getUsageMetricsData(buildQueryParams())
      rows.value = Array.isArray(data) ? data : []
      pagination.total = rows.value.length
      if (pagination.current > Math.ceil((pagination.total || 1) / pagination.size)) {
        pagination.current = 1
      }
    } finally {
      loading.value = false
    }
  }

  const handleSearch = async () => {
    pagination.current = 1
    await load()
  }

  const handleReset = async () => {
    searchFormState.clientId = ''
    searchFormState.metricName = ''
    searchFormState.dateRange = undefined
    searchFormState.limit = 200
    pagination.current = 1
    await load()
  }

  const handleRefresh = async () => load()

  const handleSizeChange = async (size: number) => {
    pagination.size = size
    pagination.current = 1
  }

  const handleCurrentChange = async (page: number) => {
    pagination.current = page
  }

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return rows.value.slice(start, start + pagination.size)
  })

  const getMetricLabel = (name?: string) => {
    const key = String(name || '')
    return metricDict[key]?.label || key || '-'
  }

  const getMetricDesc = (name?: string) => {
    const key = String(name || '')
    return metricDict[key]?.desc || '-'
  }

  const formatDurationMs = (ms: number) => {
    if (!Number.isFinite(ms)) return '-'
    if (ms >= 3600000) return `${(ms / 3600000).toFixed(2)} 小时`
    if (ms >= 60000) return `${(ms / 60000).toFixed(2)} 分钟`
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)} 秒`
    return `${Math.round(ms)} ms`
  }

  const formatMetricValue = (name: string, value: string) => {
    const key = String(name || '')
    const n = Number(value)
    if (!Number.isFinite(n)) return String(value ?? '-')

    if (key === 'client_active_ms_sum') return formatDurationMs(n)
    if (key === 'client_perf_cls_x1000_sum') return `${(n / 1000).toFixed(4)}（累加）`
    if (/_ms_sum$/.test(key) || key.endsWith('_latency_ms_sum')) return formatDurationMs(n)
    return String(Math.trunc(n))
  }

  const formatDate = (val: any) => {
    if (!val) return '-'
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return String(val)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const formatDateTime = (val: any) => {
    if (!val) return '-'
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return String(val)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const { columns, columnChecks } = useTableColumns<UsageMetricDataItem>(() => [
    { prop: 'date', label: '日期', width: 120, useSlot: true },
    { prop: 'name', label: '指标', minWidth: 240, useSlot: true },
    { prop: 'value', label: '值', width: 150, useSlot: true },
    { prop: 'clientId', label: '客户端ID', minWidth: 160 },
    { prop: 'platform', label: '平台', width: 90 },
    { prop: 'description', label: '说明', minWidth: 260, useSlot: true },
    { prop: 'updatedAt', label: '更新时间', width: 180, useSlot: true }
  ])

  const wasDeactivated = ref(false)
  onMounted(() => load())
  onDeactivated(() => {
    wasDeactivated.value = true
  })
  onActivated(() => {
    if (!wasDeactivated.value) return
    wasDeactivated.value = false
    load()
  })
</script>

<style lang="scss" scoped>
  .table-header-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .table-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .metric-name-cell {
    display: flex;
    flex-direction: column;
    line-height: 1.35;

    .cn-name {
      font-weight: 500;
    }

    .raw-name {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }
</style>

