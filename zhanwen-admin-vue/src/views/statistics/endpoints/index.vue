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

    <ElCard class="art-table-card" shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div class="table-header-wrapper">
          <h4>端点分析</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中..</ElTag>
            <ElTag v-else type="success">{{ rows.length }} 条</ElTag>
          </div>
        </div>
      </template>

      <div style="height: 360px">
        <ArtHBarChart :loading="loading" :data="chartValues" :xAxisData="chartLabels" barWidth="30%" />
      </div>
    </ElCard>

    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>端点列表</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中..</ElTag>
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
        <template #successRate="{ row }">
          <ElTag :type="successRateTagType(row.successRate)">
            {{ formatPercent(row.successRate) }}
          </ElTag>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageEndpoints, type UsageEndpointItem } from '@/api/usage'

  defineOptions({ name: 'EndpointStatistics' })

  const loading = ref(false)
  const rows = ref<UsageEndpointItem[]>([])
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  const searchFormState = reactive<Record<string, any>>({
    period: 7,
    top: 50,
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
      key: 'top',
      label: 'Top',
      type: 'select',
      props: {
        clearable: false,
        options: [
          { label: '10', value: 10 },
          { label: '20', value: 20 },
          { label: '50', value: 50 },
          { label: '100', value: 100 }
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
    params.top = Number(searchFormState.top || 50)
    if (searchFormState.apiKeyId) params.apiKeyId = Number(searchFormState.apiKeyId)
    return params
  }

  const load = async () => {
    loading.value = true
    try {
      const data = await getUsageEndpoints(buildQueryParams())
      rows.value = Array.isArray(data) ? data : []
      pagination.total = rows.value.length
      if (pagination.current > Math.ceil((pagination.total || 1) / pagination.size)) {
        pagination.current = 1
      }
    } finally {
      loading.value = false
    }
  }

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return rows.value.slice(start, start + pagination.size)
  })

  const chartLabels = computed(() => rows.value.slice(0, 20).map((r) => `${r.method} ${r.endpoint}`))
  const chartValues = computed(() => rows.value.slice(0, 20).map((r) => Number(r.count || 0)))

  const formatPercent = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '-'
    return `${n.toFixed(1)}%`
  }

  const successRateTagType = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return 'info'
    if (n >= 99) return 'success'
    if (n >= 95) return 'warning'
    return 'danger'
  }

  const { columns, columnChecks } = useTableColumns<UsageEndpointItem>(() => [
    { prop: 'method', label: '方法', width: 90 },
    { prop: 'endpoint', label: '端点', minWidth: 260 },
    { prop: 'count', label: '调用次数', width: 110 },
    { prop: 'successRate', label: '成功率', width: 110, useSlot: true },
    { prop: 'avgTime', label: '平均耗时(ms)', width: 140 },
    { prop: 'p95Time', label: 'P95耗时(ms)', width: 140 }
  ])

  const handleSearch = async () => {
    pagination.current = 1
    await load()
  }

  const handleReset = async () => {
    searchFormState.period = 7
    searchFormState.top = 50
    searchFormState.apiKeyId = undefined
    pagination.current = 1
    await load()
  }

  const handleRefresh = async () => load()

  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }

  const handleCurrentChange = (page: number) => {
    pagination.current = page
  }

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
</style>
