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
          <h4>错误分布</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中..</ElTag>
            <ElTag v-else type="danger">{{ totalErrors }} 次</ElTag>
          </div>
        </div>
      </template>

      <div style="height: 320px">
        <ArtHBarChart :loading="loading" :data="chartValues" :xAxisData="chartLabels" barWidth="30%" />
      </div>
    </ElCard>

    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>最近错误</h4>
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
        <template #timestamp="{ row }">
          {{ formatDateTime(row.timestamp) }}
        </template>
        <template #statusCode="{ row }">
          <ElTag type="danger" effect="plain">{{ row.statusCode }}</ElTag>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageErrors, type UsageErrorRecentItem } from '@/api/usage'

  defineOptions({ name: 'ErrorStatistics' })

  const loading = ref(false)
  const distribution = ref<Record<string, number>>({})
  const rows = ref<UsageErrorRecentItem[]>([])
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  const searchFormState = reactive<Record<string, any>>({
    period: 7,
    groupBy: 'status',
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
      key: 'groupBy',
      label: '分组依据',
      type: 'select',
      props: {
        clearable: false,
        options: [
          { label: '状态码', value: 'status' },
          { label: '端点', value: 'endpoint' },
          { label: '客户端', value: 'client' }
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
    params.groupBy = String(searchFormState.groupBy || 'status')
    if (searchFormState.apiKeyId) params.apiKeyId = Number(searchFormState.apiKeyId)
    return params
  }

  const load = async () => {
    loading.value = true
    try {
      const data = await getUsageErrors(buildQueryParams())
      distribution.value = data?.distribution || {}
      rows.value = Array.isArray(data?.recent) ? data.recent : []
      pagination.total = rows.value.length
      if (pagination.current > Math.ceil((pagination.total || 1) / pagination.size)) {
        pagination.current = 1
      }
    } finally {
      loading.value = false
    }
  }

  const distributionList = computed(() => {
    return Object.entries(distribution.value || {})
      .map(([key, count]) => ({ key, count: Number(count || 0) }))
      .sort((a, b) => b.count - a.count)
  })

  const chartLabels = computed(() => distributionList.value.slice(0, 20).map((i) => i.key))
  const chartValues = computed(() => distributionList.value.slice(0, 20).map((i) => i.count))
  const totalErrors = computed(() => Number(rows.value.length || 0))

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return rows.value.slice(start, start + pagination.size)
  })

  const formatDateTime = (val: any) => {
    if (!val) return '-'
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return String(val)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const { columns, columnChecks } = useTableColumns<UsageErrorRecentItem>(() => [
    { prop: 'timestamp', label: '时间', minWidth: 170, useSlot: true },
    { prop: 'endpoint', label: '端点', minWidth: 240 },
    { prop: 'statusCode', label: '状态码', width: 110, useSlot: true },
    { prop: 'message', label: '错误信息', minWidth: 260 }
  ])

  const handleSearch = async () => {
    pagination.current = 1
    await load()
  }

  const handleReset = async () => {
    searchFormState.period = 7
    searchFormState.groupBy = 'status'
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
