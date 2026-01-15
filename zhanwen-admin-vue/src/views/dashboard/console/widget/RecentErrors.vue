<template>
  <div class="card art-custom-card">
    <div class="card-header">
      <h3 class="box-title">最近错误</h3>
      <ElButton link type="primary" @click="goDetail">查看详情</ElButton>
    </div>

    <div class="meta">
      <ElTag v-if="loading" type="warning">加载中..</ElTag>
      <ElTag v-else type="danger">{{ rows.length }} 条</ElTag>
    </div>

    <ArtTable
      :loading="loading"
      :data="rows"
      :columns="columns"
      :pagination="{ total: rows.length, size: 8, current: 1 }"
    >
      <template #timestamp="{ row }">
        {{ formatDateTime(row.timestamp) }}
      </template>
      <template #statusCode="{ row }">
        <ElTag type="danger" effect="plain">{{ row.statusCode }}</ElTag>
      </template>
    </ArtTable>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageErrors, type UsageErrorRecentItem } from '@/api/usage'

  defineOptions({ name: 'RecentErrors' })

  const router = useRouter()
  const loading = ref(false)
  const rows = ref<UsageErrorRecentItem[]>([])

  const load = async () => {
    loading.value = true
    try {
      const data = await getUsageErrors({ period: 7, groupBy: 'status' })
      rows.value = Array.isArray(data?.recent) ? data.recent.slice(0, 10) : []
    } finally {
      loading.value = false
    }
  }

  const formatDateTime = (val: any) => {
    if (!val) return '-'
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return String(val)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const { columns } = useTableColumns<UsageErrorRecentItem>(() => [
    { prop: 'timestamp', label: '时间', minWidth: 170, useSlot: true },
    { prop: 'endpoint', label: '端点', minWidth: 200 },
    { prop: 'statusCode', label: '状态码', width: 110, useSlot: true },
    { prop: 'message', label: '错误信息', minWidth: 220 }
  ])

  const goDetail = () => {
    router.push('/statistics/errors')
  }

  onMounted(() => load())
</script>

<style lang="scss" scoped>
  .card {
    box-sizing: border-box;
    width: 100%;
    padding: 16px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .meta {
    margin-bottom: 10px;
  }
</style>

