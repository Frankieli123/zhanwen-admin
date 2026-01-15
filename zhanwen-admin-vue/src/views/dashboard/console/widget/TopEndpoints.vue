<template>
  <div class="card art-custom-card">
    <div class="card-header">
      <h3 class="box-title">Top 端点（最近7天）</h3>
      <ElButton link type="primary" @click="goDetail">查看详情</ElButton>
    </div>

    <div class="chart">
      <ArtHBarChart :loading="loading" :data="chartValues" :xAxisData="chartLabels" barWidth="30%" />
    </div>

    <ArtTable
      :loading="loading"
      :data="tableRows"
      :columns="columns"
      :pagination="{ total: tableRows.length, size: 6, current: 1 }"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTableColumns } from '@/composables/useTableColumns'
  import { getUsageEndpoints, type UsageEndpointItem } from '@/api/usage'

  defineOptions({ name: 'TopEndpoints' })

  const router = useRouter()
  const loading = ref(false)
  const rows = ref<UsageEndpointItem[]>([])

  const load = async () => {
    loading.value = true
    try {
      const data = await getUsageEndpoints({ period: 7, top: 10 })
      rows.value = Array.isArray(data) ? data : []
    } finally {
      loading.value = false
    }
  }

  const chartLabels = computed(() => rows.value.map((r) => `${r.method} ${r.endpoint}`))
  const chartValues = computed(() => rows.value.map((r) => Number(r.count || 0)))
  const tableRows = computed(() => rows.value.slice(0, 6))

  const { columns } = useTableColumns<UsageEndpointItem>(() => [
    { prop: 'method', label: '方法', width: 80 },
    { prop: 'endpoint', label: '端点', minWidth: 220 },
    { prop: 'count', label: '次数', width: 90 }
  ])

  const goDetail = () => {
    router.push('/statistics/endpoints')
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

  .chart {
    height: 260px;
    margin-bottom: 10px;
  }
</style>

