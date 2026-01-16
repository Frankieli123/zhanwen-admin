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

    <ElRow :gutter="20" class="kpi-cards">
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">请求数</div>
          <div class="value">{{ metrics.count }}</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">平均耗时</div>
          <div class="value">{{ metrics.avgResponseTime }} ms</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">最小耗时</div>
          <div class="value">{{ metrics.minResponseTime }} ms</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">最大耗时</div>
          <div class="value">{{ metrics.maxResponseTime }} ms</div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20" class="kpi-cards">
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">P50</div>
          <div class="value">{{ percentile('p50') }} ms</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">P90</div>
          <div class="value">{{ percentile('p90') }} ms</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">P95</div>
          <div class="value">{{ percentile('p95') }} ms</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never" class="kpi-card">
          <div class="label">P99</div>
          <div class="value">{{ percentile('p99') }} ms</div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>分位详情</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中..</ElTag>
            <ElTag v-else type="success">{{ percentileRows.length }} 条</ElTag>
          </div>
        </div>
      </template>

      <ArtTableHeader
        v-model:columns="columnChecks"
        @refresh="handleRefresh"
        layout="refresh,fullscreen,columns"
        fullClass="art-table-card"
      />

      <ArtTable :loading="loading" :data="percentileRows" :columns="columns" :pagination="{ total: percentileRows.length, size: 20, current: 1 }" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsagePerformance, type UsagePerformanceData } from '@/api/usage'

  defineOptions({ name: 'PerformanceStatistics' })

  const loading = ref(false)
  const metrics = ref<UsagePerformanceData>({
    count: 0,
    avgResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    percentiles: {}
  })

  const searchFormState = reactive<Record<string, any>>({
    period: 7,
    apiKeyId: undefined
  })

  const searchFormModel = computed<Record<string, any>>({
    get: () => searchFormState,
    set: (v) => Object.assign(searchFormState, v || {})
  })

  const searchItems = computed(() => [
    {
      key: 'period',
      label: '时间范围',
      type: 'select',
      props: {
        clearable: false,
        options: [
          { label: '最近24小时', value: 1 },
          { label: '最近7天', value: 7 },
          { label: '最近30天', value: 30 }
        ]
      }
    },
    {
      key: 'apiKeyId',
      label: '密钥ID',
      type: 'number',
      props: { placeholder: '可选', min: 1, controls: false }
    }
  ])

  const buildQueryParams = () => {
    const params: Record<string, any> = {}
    params.period = Number(searchFormState.period || 7)
    if (searchFormState.apiKeyId) params.apiKeyId = Number(searchFormState.apiKeyId)
    return params
  }

  const load = async () => {
    loading.value = true
    try {
      const data = await getUsagePerformance(buildQueryParams())
      metrics.value = data || {
        count: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        percentiles: {}
      }
    } finally {
      loading.value = false
    }
  }

  const percentile = (k: string) => {
    return Number(metrics.value?.percentiles?.[k] || 0)
  }

  const percentileRows = computed(() => {
    const map = metrics.value?.percentiles || {}
    return Object.keys(map)
      .map((k) => ({ name: String(k).toUpperCase(), value: Number(map[k] || 0) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const { columns, columnChecks } = useTableColumns<{ name: string; value: number }>(() => [
    { prop: 'name', label: '分位', width: 120 },
    { prop: 'value', label: '耗时(ms)', width: 120 }
  ])

  const handleSearch = async () => load()

  const handleReset = async () => {
    searchFormState.period = 7
    searchFormState.apiKeyId = undefined
    await load()
  }

  const handleRefresh = async () => load()

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
  .kpi-cards {
    margin-bottom: 20px;
  }

  .kpi-card {
    text-align: center;

    .label {
      font-size: 14px;
      color: var(--el-text-color-secondary);
      margin-bottom: 8px;
    }

    .value {
      font-size: 24px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

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
