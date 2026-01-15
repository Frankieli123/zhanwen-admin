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
          <h4>客户端信息</h4>
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
        :data="rows"
        :columns="columns"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #clientId="{ row }">
          <div class="mono cell-copy">
            <span class="cell-copy__text">{{ row.clientId }}</span>
            <ElTooltip content="复制客户端ID" placement="top">
              <i class="iconfont-sys iconsys-copy cell-copy__icon" @click="copyText(row.clientId)" />
            </ElTooltip>
          </div>
        </template>
        <template #platform="{ row }">
          <ElTag size="small" type="info" effect="plain">{{ row.platform || '-' }}</ElTag>
        </template>
        <template #isActive="{ row }">
          <ElTag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '启用' : '停用' }}</ElTag>
        </template>
        <template #firstSeen="{ row }">
          {{ formatDateTime(row.firstSeen) }}
        </template>
        <template #lastActiveAt="{ row }">
          {{ formatDateTime(row.lastActiveAt) }}
        </template>
        <template #buildTime="{ row }">
          {{ formatDateTime(row.buildTime) }}
        </template>
        <template #totalCost="{ row }">
          {{ formatCost(row.totalCost) }}
        </template>
        <template #periodErrorRate="{ row }">
          {{ formatPercent(row.periodErrorRate) }}
        </template>
        <template #periodCost="{ row }">
          {{ formatCost(row.periodCost) }}
        </template>
        <template #periodLastSeen="{ row }">
          {{ formatDateTime(row.periodLastSeen) }}
        </template>
        <template #screenInfo="{ row }">
          {{ formatScreen(row.screenInfo) }}
        </template>
        <template #deviceInfo="{ row }">
          {{ formatDevice(row.deviceInfo) }}
        </template>
        <template #networkInfo="{ row }">
          {{ formatNetwork(row.networkInfo) }}
        </template>
        <template #userAgent="{ row }">
          <span class="ua">{{ row.userAgent || '-' }}</span>
        </template>
        <template #operation="{ row }">
          <div class="op-btns">
            <ElTooltip content="查看详情" placement="top">
              <ElButton class="op-btn op-view" @click="openDetail(row)">
                <i class="iconfont-sys iconsys-liulan" />
              </ElButton>
            </ElTooltip>
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <ElDrawer v-model="detailVisible" title="客户端详情" size="45%">
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="客户端ID">{{ detailData?.clientId || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="名称">{{ detailData?.name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="平台">{{ detailData?.platform || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="detailData?.isActive ? 'success' : 'info'">
            {{ detailData?.isActive ? '启用' : '停用' }}
          </ElTag>
        </ElDescriptionsItem>

        <ElDescriptionsItem label="版本(登记)">{{ detailData?.version || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="版本(上报)">{{ detailData?.appVersion || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="构建时间">{{ formatDateTime(detailData?.buildTime) }}</ElDescriptionsItem>

        <ElDescriptionsItem label="语言">{{ detailData?.language || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="时区">{{ detailData?.timezone || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="UserAgent">
          <div class="pre">{{ detailData?.userAgent || '-' }}</div>
        </ElDescriptionsItem>

        <ElDescriptionsItem label="首次出现">{{ formatDateTime(detailData?.firstSeen) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="最后活跃">{{ formatDateTime(detailData?.lastActiveAt) }}</ElDescriptionsItem>

        <ElDescriptionsItem label="累计调用">{{ detailData?.totalRequests ?? '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="累计Token">{{ detailData?.totalTokens ?? '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="累计成本">{{ formatCost(detailData?.totalCost) }}</ElDescriptionsItem>

        <ElDescriptionsItem label="周期调用">{{ detailData?.periodRequests ?? '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="周期错误">{{ detailData?.periodErrors ?? '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="周期错误率">{{ formatPercent(detailData?.periodErrorRate) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="周期平均耗时(ms)">{{ detailData?.periodAvgResponseTime ?? '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="周期Token">{{ detailData?.periodTokens ?? '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="周期成本">{{ formatCost(detailData?.periodCost) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="周期最后调用">{{ formatDateTime(detailData?.periodLastSeen) }}</ElDescriptionsItem>

        <ElDescriptionsItem label="屏幕信息">
          <pre class="json-block">{{ formatJson(detailData?.screenInfo) }}</pre>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="设备信息">
          <pre class="json-block">{{ formatJson(detailData?.deviceInfo) }}</pre>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="网络信息">
          <pre class="json-block">{{ formatJson(detailData?.networkInfo) }}</pre>
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, onActivated, onDeactivated, onMounted, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageClientsDetail, type ClientDetailItem } from '@/api/usage'

  defineOptions({ name: 'ClientDetails' })

  const loading = ref(false)
  const rows = ref<ClientDetailItem[]>([])
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  const searchFormState = reactive<Record<string, any>>({
    dateRange: undefined,
    q: '',
    platform: '',
    isActive: undefined,
    apiKeyId: undefined
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
      key: 'q',
      label: '搜索',
      type: 'input',
      props: { placeholder: 'Client ID / 名称', clearable: true }
    },
    {
      key: 'platform',
      label: '平台',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: [
          { label: 'web', value: 'web' },
          { label: 'ios', value: 'ios' },
          { label: 'android', value: 'android' },
          { label: 'wechat', value: 'wechat' }
        ]
      }
    },
    {
      key: 'isActive',
      label: '状态',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: [
          { label: '启用', value: true },
          { label: '停用', value: false }
        ]
      }
    },
    {
      key: 'apiKeyId',
      label: '密钥ID',
      type: 'number',
      props: { min: 1, controls: false, placeholder: '可选' }
    }
  ])

  const buildQueryParams = () => {
    const params: Record<string, any> = {
      page: pagination.current,
      limit: pagination.size,
      period: 30
    }
    const range = searchFormState.dateRange
    if (Array.isArray(range) && range.length === 2) {
      const [startDate, endDate] = range
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
    }
    const q = String(searchFormState.q || '').trim()
    if (q) params.q = q
    const platform = String(searchFormState.platform || '').trim()
    if (platform) params.platform = platform
    if (typeof searchFormState.isActive === 'boolean') params.isActive = searchFormState.isActive
    if (searchFormState.apiKeyId) params.apiKeyId = Number(searchFormState.apiKeyId)
    return params
  }

  const load = async () => {
    loading.value = true
    try {
      const resp = await getUsageClientsDetail(buildQueryParams())
      rows.value = Array.isArray(resp?.data) ? resp.data : []
      pagination.total = Number(resp?.pagination?.total || 0)
    } finally {
      loading.value = false
    }
  }

  const handleSearch = async () => {
    pagination.current = 1
    await load()
  }

  const handleReset = async () => {
    searchFormState.dateRange = undefined
    searchFormState.q = ''
    searchFormState.platform = ''
    searchFormState.isActive = undefined
    searchFormState.apiKeyId = undefined
    pagination.current = 1
    await load()
  }

  const handleRefresh = async () => load()

  const handleSizeChange = async (size: number) => {
    pagination.size = size
    pagination.current = 1
    await load()
  }

  const handleCurrentChange = async (page: number) => {
    pagination.current = page
    await load()
  }

  const formatDateTime = (val: any) => {
    if (!val) return '-'
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return String(val)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const formatPercent = (val: any) => {
    const n = Number(val)
    if (!Number.isFinite(n)) return '-'
    return `${n.toFixed(0)}%`
  }

  const formatCost = (val: any) => {
    const n = Number(val)
    if (!Number.isFinite(n)) return '-'
    return n.toFixed(6)
  }

  const formatJson = (val: any) => {
    if (!val) return '{}'
    try {
      return JSON.stringify(val, null, 2)
    } catch {
      return String(val)
    }
  }

  const formatScreen = (info: any) => {
    const w = Number(info?.width)
    const h = Number(info?.height)
    const dpr = Number(info?.dpr)
    if (Number.isFinite(w) && Number.isFinite(h)) {
      const d = Number.isFinite(dpr) ? `@${dpr}` : ''
      return `${Math.trunc(w)}×${Math.trunc(h)}${d}`
    }
    return '-'
  }

  const formatDevice = (info: any) => {
    const mem = Number(info?.deviceMemory)
    const cpu = Number(info?.hardwareConcurrency)
    const parts: string[] = []
    if (Number.isFinite(mem) && mem > 0) parts.push(`${mem}GB`)
    if (Number.isFinite(cpu) && cpu > 0) parts.push(`${cpu}核`)
    return parts.length ? parts.join(' / ') : '-'
  }

  const formatNetwork = (info: any) => {
    const eff = String(info?.effectiveType || '').trim()
    const rtt = Number(info?.rtt)
    const down = Number(info?.downlink)
    const parts: string[] = []
    if (eff) parts.push(eff)
    if (Number.isFinite(rtt)) parts.push(`${Math.round(rtt)}ms`)
    if (Number.isFinite(down)) parts.push(`${down.toFixed(1)}Mb`)
    return parts.length ? parts.join(' / ') : '-'
  }

  const copyText = async (text: string) => {
    const t = String(text || '').trim()
    if (!t) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(t)
        ElMessage.success('已复制')
        return
      }
    } catch {
      // ignore
    }
    try {
      const el = document.createElement('textarea')
      el.value = t
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      ElMessage.success('已复制')
    } catch {
      ElMessage.error('复制失败')
    }
  }

  const detailVisible = ref(false)
  const detailData = ref<ClientDetailItem | null>(null)

  const openDetail = (row: ClientDetailItem) => {
    detailData.value = row
    detailVisible.value = true
  }

  const { columns, columnChecks } = useTableColumns<ClientDetailItem>(() => [
    { prop: 'clientId', label: '客户端ID', minWidth: 200, useSlot: true },
    { prop: 'name', label: '名称', minWidth: 160 },
    { prop: 'platform', label: '平台', width: 110, useSlot: true },
    { prop: 'isActive', label: '状态', width: 90, useSlot: true },
    { prop: 'version', label: '版本(登记)', width: 120 },
    { prop: 'appVersion', label: '版本(上报)', width: 120 },
    { prop: 'buildTime', label: '构建时间', minWidth: 170, useSlot: true },
    { prop: 'lastActiveAt', label: '最后活跃', minWidth: 170, useSlot: true },
    { prop: 'firstSeen', label: '首次出现', minWidth: 170, useSlot: true },
    { prop: 'totalRequests', label: '累计调用', width: 100 },
    { prop: 'totalTokens', label: '累计Token', width: 120 },
    { prop: 'totalCost', label: '累计成本', width: 120, useSlot: true },
    { prop: 'periodRequests', label: '周期调用', width: 100 },
    { prop: 'periodErrors', label: '周期错误', width: 100 },
    { prop: 'periodErrorRate', label: '周期错误率', width: 110, useSlot: true },
    { prop: 'periodAvgResponseTime', label: '周期平均耗时(ms)', width: 140 },
    { prop: 'periodTokens', label: '周期Token', width: 120 },
    { prop: 'periodCost', label: '周期成本', width: 120, useSlot: true },
    { prop: 'periodLastSeen', label: '周期最后调用', minWidth: 170, useSlot: true },
    { prop: 'language', label: '语言', width: 90 },
    { prop: 'timezone', label: '时区', width: 140 },
    { prop: 'screenInfo', label: '屏幕', width: 140, useSlot: true },
    { prop: 'deviceInfo', label: '设备', width: 140, useSlot: true },
    { prop: 'networkInfo', label: '网络', width: 160, useSlot: true },
    { prop: 'userAgent', label: 'UserAgent', minWidth: 240, useSlot: true },
    { prop: 'operation', label: '操作', width: 90, fixed: 'right', useSlot: true }
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

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
  }

  .cell-copy {
    display: inline-flex;
    align-items: center;
    gap: 8px;

    &__text {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__icon {
      cursor: pointer;
      color: var(--el-text-color-secondary);
    }

    &__icon:hover {
      color: var(--el-color-primary);
    }
  }

  .ua {
    display: inline-block;
    max-width: 360px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }

  .pre {
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .json-block {
    background: var(--el-fill-color-light);
    padding: 10px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.4;
    overflow-x: auto;
    margin: 0;
  }
</style>

