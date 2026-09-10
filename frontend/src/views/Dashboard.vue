<template>
  <div class="page">
    <div class="page-header">
      <h2>工作台</h2>
      <span class="muted">{{ overview?.today?.date || '' }}</span>
    </div>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="label">在册长者</div>
        <div class="value">{{ overview?.elderTotal ?? '-' }}</div>
        <div class="sub">正常 {{ overview?.eldersByStatus?.NORMAL ?? 0 }} · 观察 {{ overview?.eldersByStatus?.OBSERVING ?? 0 }} · 暂停 {{ overview?.eldersByStatus?.PAUSED ?? 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="label">今日配送任务</div>
        <div class="value">{{ overview?.today?.taskTotal ?? 0 }}</div>
        <div class="sub">已送达 {{ overview?.today?.delivered ?? 0 }} · 异常 {{ overview?.today?.exception ?? 0 }} · 待配送 {{ overview?.today?.pending ?? 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="label">今日路线</div>
        <div class="value">{{ overview?.today?.routeCount ?? 0 }}</div>
        <div class="sub">已完成 {{ overview?.today?.routeCompleted ?? 0 }} 条</div>
      </div>
      <div class="stat-card">
        <div class="label">待处理异常</div>
        <div class="value" :style="{ color: overview?.pendingExceptions ? '#f56c6c' : '#303133' }">{{ overview?.pendingExceptions ?? 0 }}</div>
        <div class="sub">处理中 {{ overview?.processingExceptions ?? 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="label">本月累计送达</div>
        <div class="value">{{ overview?.monthDelivered ?? 0 }}</div>
        <div class="sub">份</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px">
      <div class="card">
        <h3>近 7 天配送趋势</h3>
        <div class="trend-bars">
          <div v-for="t in trend" :key="t.date" class="trend-col">
            <span class="trend-num">{{ t.delivered }}</span>
            <div class="trend-bar" :style="{ height: barHeight(t.delivered) }" :title="`送达 ${t.delivered}`"></div>
            <div v-if="t.exception" class="trend-bar exc" :style="{ height: barHeight(t.exception) }" :title="`异常 ${t.exception}`"></div>
            <span class="trend-date">{{ t.date.slice(5) }}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>长者状态分布</h3>
        <div v-for="(v, k) in overview?.eldersByStatus || {}" :key="k" style="margin-bottom: 10px">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px">
            <span>{{ ELDER_STATUS[k]?.label || k }}</span><span>{{ v }}</span>
          </div>
          <el-progress :percentage="pct(v)" :color="progressColor(k)" :show-text="false" :stroke-width="8" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { statsApi } from '../api'
import { ELDER_STATUS } from '../utils/dict'

const overview = ref(null)
const trend = ref([])

const COLORS = { NORMAL: '#67c23a', OBSERVING: '#e6a23c', PAUSED: '#909399', HOSPITALIZED: '#f56c6c', VISIT_NEEDED: '#b88230' }
function progressColor(k) { return COLORS[k] || '#409eff' }
function pct(v) {
  const total = overview.value?.elderTotal || 1
  return Math.round((v / total) * 100)
}
function barHeight(v) {
  const max = Math.max(1, ...trend.value.map((t) => t.delivered))
  return `${Math.max(2, Math.round((v / max) * 110))}px`
}

onMounted(async () => {
  overview.value = await statsApi.overview()
  trend.value = await statsApi.trend(7)
})
</script>
