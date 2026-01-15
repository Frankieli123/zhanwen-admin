<template>
  <el-row :gutter="20" :style="{ marginTop: showWorkTab ? '0' : '10px' }" class="card-list">
    <el-col v-for="(item, index) in dataList" :key="index" :sm="12" :md="6" :lg="6">
      <div class="card art-custom-card">
        <span class="des subtitle">{{ item.des }}</span>
        <ArtCountTo class="number box-title" :target="item.num" :duration="1300" />
        <div class="change-box">
          <span class="change-text">较上周</span>
          <span
            class="change"
            :class="[item.change.indexOf('+') === -1 ? 'text-danger' : 'text-success']"
          >
            {{ item.change }}
          </span>
        </div>
        <i class="iconfont-sys" v-html="item.icon"></i>
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
  import { reactive, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useSettingStore } from '@/store/modules/setting'
  import { getClientStats, getUsageMetrics } from '@/api/usage'

  const { showWorkTab } = storeToRefs(useSettingStore())

  const dataList = reactive([
    {
      des: '近7天调用',
      icon: '&#xe721;',
      startVal: 0,
      duration: 1000,
      num: 0,
      change: '+0%'
    },
    {
      des: '活跃客户端Top100(7天)',
      icon: '&#xe724;',
      startVal: 0,
      duration: 1000,
      num: 0,
      change: '+0%'
    },
    {
      des: '近7天错误',
      icon: '&#xe7aa;',
      startVal: 0,
      duration: 1000,
      num: 0,
      change: '+0%'
    },
    {
      des: '平均响应(ms)',
      icon: '&#xe82a;',
      startVal: 0,
      duration: 1000,
      num: 0,
      change: '+0%'
    }
  ])

  const sumMetrics = (data: any) => {
    const series = Array.isArray(data?.timeSeries) ? data.timeSeries : []
    const requests = series.reduce((acc: number, cur: any) => acc + Number(cur?.requests || 0), 0)
    const errors = series.reduce((acc: number, cur: any) => acc + Number(cur?.errors || 0), 0)

    let weightedRt = 0
    let weightedN = 0
    for (const p of series) {
      const r = Number(p?.requests || 0)
      const rt = Number(p?.avgResponseTime || 0)
      if (r > 0 && rt >= 0) {
        weightedRt += rt * r
        weightedN += r
      }
    }
    const avgResponseTime = weightedN ? Math.round(weightedRt / weightedN) : 0
    return { requests, errors, avgResponseTime }
  }

  const calcChange = (current: number, previous: number, higherBetter: boolean = true) => {
    if (!previous) return current ? '+100%' : '+0%'
    const raw = ((current - previous) / previous) * 100
    const pct = higherBetter ? raw : -raw
    const sign = pct > 0 ? '+' : pct < 0 ? '' : '+'
    return `${sign}${pct.toFixed(0)}%`
  }

  onMounted(async () => {
    try {
      const now = new Date()
      const day = 24 * 60 * 60 * 1000
      const start7 = new Date(now.getTime() - 7 * day)
      const start14 = new Date(now.getTime() - 14 * day)

      const [currMetricsRes, prevMetricsRes, clientsRes] = await Promise.allSettled([
        getUsageMetrics({ startDate: start7.toISOString(), endDate: now.toISOString(), groupBy: 'day' }),
        getUsageMetrics({ startDate: start14.toISOString(), endDate: start7.toISOString(), groupBy: 'day' }),
        getClientStats({ period: 7, top: 100 })
      ])

      const currMetricsRaw = currMetricsRes.status === 'fulfilled' ? currMetricsRes.value : undefined
      const prevMetricsRaw = prevMetricsRes.status === 'fulfilled' ? prevMetricsRes.value : undefined
      const clients = clientsRes.status === 'fulfilled' ? clientsRes.value : undefined

      const curr = sumMetrics(currMetricsRaw)
      const prev = sumMetrics(prevMetricsRaw)

      dataList[0].num = curr.requests
      dataList[0].change = calcChange(curr.requests, prev.requests)

      dataList[1].num = Array.isArray(clients) ? clients.length : 0

      dataList[2].num = curr.errors
      dataList[2].change = calcChange(curr.errors, prev.errors, false)

      dataList[3].num = curr.avgResponseTime
      dataList[3].change = calcChange(curr.avgResponseTime, prev.avgResponseTime, false)
    } catch {
      // keep defaults
    }
  })
</script>

<style lang="scss" scoped>
  .card-list {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    background-color: transparent !important;

    .art-custom-card {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      height: 140px;
      padding: 0 18px;
      list-style: none;
      transition: all 0.3s ease;

      $icon-size: 52px;

      .iconfont-sys {
        position: absolute;
        top: 0;
        right: 20px;
        bottom: 0;
        width: $icon-size;
        height: $icon-size;
        margin: auto;
        overflow: hidden;
        font-size: 22px;
        line-height: $icon-size;
        color: var(--el-color-primary) !important;
        text-align: center;
        background-color: var(--el-color-primary-light-9);
        border-radius: 12px;
      }

      .des {
        display: block;
        height: 14px;
        font-size: 14px;
        line-height: 14px;
      }

      .number {
        display: block;
        margin-top: 10px;
        font-size: 28px;
        font-weight: 400;
      }

      .change-box {
        display: flex;
        align-items: center;
        margin-top: 10px;

        .change-text {
          display: block;
          font-size: 13px;
          color: var(--art-text-gray-600);
        }

        .change {
          display: block;
          margin-left: 5px;
          font-size: 13px;
          font-weight: bold;

          &.text-success {
            color: var(--el-color-success);
          }

          &.text-danger {
            color: var(--el-color-danger);
          }
        }
      }
    }
  }

  .dark {
    .card-list {
      .art-custom-card {
        .iconfont-sys {
          background-color: #232323 !important;
        }
      }
    }
  }
</style>
