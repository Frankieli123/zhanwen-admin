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
      <ElCol :span="14">
        <ElCard class="art-table-card" shadow="never">
          <template #header>
            <div class="table-header-wrapper">
              <h4>地域分布</h4>
              <div class="table-info">
                <ElTag v-if="loading" type="warning">加载中..</ElTag>
                <ElTag v-else type="success">{{ rows.length }} 条</ElTag>
              </div>
            </div>
          </template>

          <div style="height: 420px">
            <ArtHBarChart :loading="loading" :data="chartValues" :xAxisData="chartLabels" barWidth="30%" />
          </div>
        </ElCard>
      </ElCol>

      <ElCol :span="10">
        <ElCard class="art-table-card" shadow="never">
          <template #header>
            <div class="table-header-wrapper">
              <h4>列表详情</h4>
              <div class="table-info">
                <ElTag v-if="loading" type="warning">加载中..</ElTag>
                <ElTag v-else type="success">{{ rows.length }} 条</ElTag>
              </div>
            </div>
          </template>

          <ArtTableHeader v-model:columns="columnChecks" @refresh="handleRefresh" layout="refresh,columns" />

          <ArtTable :loading="loading" :data="rows" :columns="columns" :pagination="{ total: rows.length, size: 50, current: 1 }" />
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageGeo, type UsageGeoItem } from '@/api/usage'

  defineOptions({ name: 'GeoStatistics' })

  const loading = ref(false)
  const rows = ref<UsageGeoItem[]>([])

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
      const data = await getUsageGeo(buildQueryParams())
      rows.value = Array.isArray(data) ? data : []
    } finally {
      loading.value = false
    }
  }

  const distributionList = computed(() => {
    return rows.value
      .map((r) => ({ location: String(r.location || 'Unknown'), count: Number(r.count || 0) }))
      .sort((a, b) => b.count - a.count)
  })

  const chartLabels = computed(() => distributionList.value.slice(0, 20).map((i) => i.location))
  const chartValues = computed(() => distributionList.value.slice(0, 20).map((i) => i.count))

  const { columns, columnChecks } = useTableColumns<UsageGeoItem>(() => [
    { prop: 'location', label: '地区', minWidth: 160 },
    { prop: 'count', label: '请求数', width: 110 }
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
