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

    <ElRow :gutter="20">
      <ElCol :span="24">
        <ElCard class="art-table-card" shadow="never">
          <template #header>
            <div class="table-header-wrapper">
              <h4>调用概览</h4>
              <div class="table-info">
                <ElTag v-if="loadingMetrics" type="warning">加载中..</ElTag>
                <ElTag v-else type="success">{{ totalRequests }} 次调用 / {{ totalErrors }} 次错误</ElTag>
              </div>
            </div>
          </template>

          <ArtLineChart
            :data="lineSeries"
            :xAxisData="xAxisData"
            :loading="loadingMetrics"
            :showLegend="true"
            symbol="none"
          />
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>调用日志</h4>
          <div class="table-info">
            <ElTag v-if="loadingLogs" type="warning">加载中..</ElTag>
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
        :loading="loadingLogs"
        :pagination="pagination"
        :data="logRows"
        :columns="columns"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #timestamp="{ row }">
          {{ formatDateTime(row.timestamp) }}
        </template>
        <template #modelName="{ row }">
          {{ row.modelName || (row.modelId != null ? String(row.modelId) : '-') }}
          <span v-if="row.providerName">({{ row.providerName }})</span>
        </template>
        <template #status="{ row }">
          <ElTag :type="statusTagType(row.status)">{{ row.status || '-' }}</ElTag>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import type { LineDataItem } from '@/types/component/chart'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageLogs, getUsageMetrics, type UsageLogItem, type UsageMetricsPoint } from '@/api/usage'

  defineOptions({ name: 'UsageStatistics' })

  const loadingMetrics = ref(false)
  const loadingLogs = ref(false)

  const metrics = ref<UsageMetricsPoint[]>([])
  const logRows = ref<UsageLogItem[]>([])
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  const searchFormState = reactive<Record<string, any>>({
    dateRange: undefined,
    groupBy: 'day',
    apiKeyId: undefined,
    clientId: ''
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
      key: 'groupBy',
      label: '分组',
      type: 'select',
      props: {
        placeholder: '选择分组',
        clearable: false,
        options: [
          { label: '按小时', value: 'hour' },
          { label: '按天', value: 'day' },
          { label: '按周', value: 'week' },
          { label: '按月', value: 'month' }
        ]
      }
    },
    {
      key: 'apiKeyId',
      label: '密钥ID',
      type: 'number',
      props: {
        min: 1,
        controls: false,
        placeholder: '可选'
      }
    },
    {
      key: 'clientId',
      label: '客户端ID',
      type: 'input',
      props: { placeholder: '可选', clearable: true }
    }
  ])

  const buildQueryParams = () => {
    const params: Record<string, any> = { groupBy: searchFormState.groupBy }
    const range = searchFormState.dateRange
    if (Array.isArray(range) && range.length === 2) {
      const [startDate, endDate] = range
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
    }
    const clientId = String(searchFormState.clientId || '').trim()
    if (clientId) params.clientId = clientId
    if (searchFormState.apiKeyId) params.apiKeyId = Number(searchFormState.apiKeyId)
    return params
  }

  const loadMetrics = async () => {
    loadingMetrics.value = true
    try {
      const params = buildQueryParams()
      const data = await getUsageMetrics(params)
      metrics.value = Array.isArray(data?.timeSeries) ? data.timeSeries : []
    } finally {
      loadingMetrics.value = false
    }
  }

  const loadLogs = async () => {
    loadingLogs.value = true
    try {
      const params = buildQueryParams()
      const resp = await getUsageLogs({
        ...params,
        page: pagination.current,
        limit: pagination.size
      })
      logRows.value = Array.isArray(resp?.data) ? resp.data : []
      pagination.total = Number(resp?.pagination?.total || 0)
    } finally {
      loadingLogs.value = false
    }
  }

  const loadAll = async () => {
    await Promise.all([loadMetrics(), loadLogs()])
  }

  const handleSearch = async () => {
    pagination.current = 1
    await loadAll()
  }

  const handleReset = async () => {
    pagination.current = 1
    await loadAll()
  }

  const handleRefresh = async () => {
    await loadAll()
  }

  const handleSizeChange = async (size: number) => {
    pagination.size = size
    pagination.current = 1
    await loadLogs()
  }

  const handleCurrentChange = async (page: number) => {
    pagination.current = page
    await loadLogs()
  }

  const totalRequests = computed(() => metrics.value.reduce((s, p) => s + (p.requests || 0), 0))
  const totalErrors = computed(() => metrics.value.reduce((s, p) => s + (p.errors || 0), 0))

  const xAxisData = computed(() => metrics.value.map((p) => p.time))
  const lineSeries = computed<LineDataItem[]>(() => [
    { name: '请求数', data: metrics.value.map((p) => p.requests || 0) },
    { name: '错误数', data: metrics.value.map((p) => p.errors || 0) }
  ])

  const statusTagType = (status?: string) => {
    const s = String(status || '').toLowerCase()
    if (s === 'success' || s === 'ok') return 'success'
    if (!s) return 'info'
    return 'danger'
  }

  const formatDateTime = (val: any) => {
    if (!val) return '-'
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return String(val)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const { columns, columnChecks } = useTableColumns<UsageLogItem>(() => [
    { prop: 'timestamp', label: '时间', minWidth: 170, useSlot: true },
    { prop: 'endpoint', label: '接口', minWidth: 240 },
    { prop: 'method', label: '方法', width: 90 },
    { prop: 'statusCode', label: '状态码', width: 90 },
    { prop: 'status', label: '状态', width: 90, useSlot: true },
    { prop: 'responseTime', label: '耗时(ms)', width: 110 },
    { prop: 'modelName', label: '模型', minWidth: 180, useSlot: true },
    { prop: 'tokensUsed', label: 'Token数', width: 110 },
    { prop: 'cost', label: '成本', width: 110 },
    { prop: 'clientId', label: '客户端', minWidth: 160 },
    { prop: 'platform', label: '平台', width: 90 },
    { prop: 'requestId', label: '请求ID', minWidth: 180 },
    { prop: 'errorMessage', label: '错误', minWidth: 220 }
  ])

  const wasDeactivated = ref(false)

  onMounted(() => loadAll())
  onDeactivated(() => {
    wasDeactivated.value = true
  })
  onActivated(() => {
    if (!wasDeactivated.value) return
    wasDeactivated.value = false
    loadAll()
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
</style>
