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
          <h4>模型统计</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中..</ElTag>
            <ElTag v-else type="success">{{ totalRequests }} 次调用 / {{ totalTokens }} Token数</ElTag>
          </div>
        </div>
      </template>

      <ArtTableHeader
        v-model:columns="columnChecks"
        @refresh="handleRefresh"
        layout="refresh,fullscreen,columns"
        fullClass="art-table-card"
      />

      <ArtTable :loading="loading" :data="rows" :columns="columns">
        <template #successRate="{ row }">
          {{ formatPercent(row.successRate) }}
        </template>
        <template #isActive="{ row }">
          <ElTag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '启用' : '停用' }}</ElTag>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getModelAnalytics } from '@/api/analytics'

  defineOptions({ name: 'ModelStatistics' })

  interface ModelStatRow {
    id: number
    model: string
    provider: string
    totalRequests: number
    successRate: number
    avgResponseTime: number
    errorCount: number
    totalTokens: number
    totalCost: string
    isActive: boolean
  }

  const loading = ref(false)
  const rows = ref<ModelStatRow[]>([])

  const searchFormState = reactive<Record<string, any>>({
    dateRange: undefined
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
    }
  ])

  const buildQueryParams = () => {
    const params: Record<string, any> = {}
    const range = searchFormState.dateRange
    if (Array.isArray(range) && range.length === 2) {
      const [startDate, endDate] = range
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
    }
    return params
  }

  const normalizeRows = (data: any): ModelStatRow[] => {
    const list = Array.isArray(data) ? data : []
    return list.map((item: any) => ({
      id: Number(item?.id || 0),
      model: String(item?.displayName || item?.name || ''),
      provider: String(item?.provider || ''),
      totalRequests: Number(item?.usage?.totalRequests || 0),
      successRate: Number(item?.usage?.successRate || 0),
      avgResponseTime: Number(item?.usage?.avgResponseTime || 0),
      errorCount: Number(item?.usage?.errorCount || 0),
      totalTokens: Number(item?.costs?.totalTokens || 0),
      totalCost: String(item?.costs?.totalCost || '0.000000'),
      isActive: !!item?.isActive
    }))
  }

  const load = async () => {
    loading.value = true
    try {
      const params = buildQueryParams()
      const data = await getModelAnalytics(params)
      rows.value = normalizeRows(data)
    } finally {
      loading.value = false
    }
  }

  const handleSearch = async () => load()
  const handleReset = async () => {
    searchFormState.dateRange = undefined
    await load()
  }
  const handleRefresh = async () => load()

  const totalRequests = computed(() => rows.value.reduce((s, r) => s + (r.totalRequests || 0), 0))
  const totalTokens = computed(() => rows.value.reduce((s, r) => s + (r.totalTokens || 0), 0))

  const formatPercent = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '-'
    return `${n.toFixed(1)}%`
  }

  const { columns, columnChecks } = useTableColumns<ModelStatRow>(() => [
    { prop: 'model', label: '模型', minWidth: 220 },
    { prop: 'provider', label: '服务商', minWidth: 140 },
    { prop: 'totalRequests', label: '调用', width: 100 },
    { prop: 'successRate', label: '成功率', width: 110, useSlot: true },
    { prop: 'avgResponseTime', label: '平均耗时(ms)', width: 130 },
    { prop: 'errorCount', label: '错误', width: 90 },
    { prop: 'totalTokens', label: 'Token数', width: 120 },
    { prop: 'totalCost', label: '成本', width: 120 },
    { prop: 'isActive', label: '状态', width: 90, useSlot: true }
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
    gap: 10px;
  }
</style>
