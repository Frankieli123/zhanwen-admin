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
      <ElCol :span="10">
        <ElCard class="art-table-card" shadow="never">
          <template #header>
            <div class="table-header-wrapper">
              <h4>设备分布</h4>
              <div class="table-info">
                <ElTag v-if="loading" type="warning">加载中..</ElTag>
                <ElTag v-else type="success">{{ totalCount }} 次</ElTag>
              </div>
            </div>
          </template>

          <div class="chart-wrap">
            <ArtRingChart
              :data="chartData"
              :loading="loading"
              :showLegend="true"
              legendPosition="bottom"
              :radius="['50%', '70%']"
            />
          </div>
        </ElCard>
      </ElCol>

      <ElCol :span="14">
        <ElCard class="art-table-card" shadow="never">
          <template #header>
            <div class="table-header-wrapper">
              <h4>详细数据</h4>
              <div class="table-info">
                <ElTag v-if="loading" type="warning">加载中..</ElTag>
                <ElTag v-else type="success">{{ rows.length }} 条</ElTag>
              </div>
            </div>
          </template>

          <ArtTableHeader v-model:columns="columnChecks" @refresh="handleRefresh" layout="refresh,columns" />

          <ArtTable :loading="loading" :data="rows" :columns="columns" :pagination="{ total: rows.length, size: 100, current: 1 }" />
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageDevices, type UsageDevicesData } from '@/api/usage'

  defineOptions({ name: 'DeviceStatistics' })

  const loading = ref(false)
  const data = ref<UsageDevicesData>({ desktop: 0, mobile: 0, tablet: 0, other: 0 })

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
      label: 'API Key ID',
      type: 'number',
      props: { placeholder: '可选', min: 1, controls: false }
    }
  ])

  const deviceLabel = (k: string) => {
    if (k === 'desktop') return '桌面端'
    if (k === 'mobile') return '移动端'
    if (k === 'tablet') return '平板'
    return '其他'
  }

  const buildRows = (v: UsageDevicesData) => {
    const list = [
      { device: 'desktop', label: deviceLabel('desktop'), count: Number(v.desktop || 0) },
      { device: 'mobile', label: deviceLabel('mobile'), count: Number(v.mobile || 0) },
      { device: 'tablet', label: deviceLabel('tablet'), count: Number(v.tablet || 0) },
      { device: 'other', label: deviceLabel('other'), count: Number(v.other || 0) }
    ]
    return list.sort((a, b) => b.count - a.count)
  }

  const rows = computed(() => buildRows(data.value))
  const totalCount = computed(() => rows.value.reduce((s, r) => s + r.count, 0))
  const chartData = computed(() => rows.value.map((r) => ({ name: r.label, value: r.count })))

  const { columns, columnChecks } = useTableColumns<{ device: string; label: string; count: number }>(() => [
    { prop: 'label', label: '设备类型', minWidth: 150 },
    { prop: 'count', label: '请求数', width: 110 }
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
      const v = await getUsageDevices(buildQueryParams())
      data.value = {
        desktop: Number(v?.desktop || 0),
        mobile: Number(v?.mobile || 0),
        tablet: Number(v?.tablet || 0),
        other: Number(v?.other || 0)
      }
    } finally {
      loading.value = false
    }
  }

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

  .chart-wrap {
    height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

