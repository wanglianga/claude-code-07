<template>
  <div class="page">
    <div class="page-header">
      <h2>配送路线</h2>
      <div class="toolbar">
        <el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" :clearable="false" @change="load" />
      </div>
    </div>

    <el-alert v-if="isVolunteer" type="info" :closable="false" style="margin-bottom: 14px"
      title="接单后请按路线顺序配送；送达时登记餐温、签收人与老人状态；遇到老人不在家、洒漏、拒收等情况请及时上报异常，社区工作人员会接手处理。" />

    <div class="route-grid" v-loading="loading">
      <div v-for="r in routes" :key="r.id" class="route-card" :class="{ mine: r.volunteerId === userId }">
        <div class="route-head">
          <div>
            <div class="route-name">{{ r.name }}</div>
            <div class="muted">{{ ROUTE_TYPE[r.routeType] }}</div>
          </div>
          <el-tag :type="ROUTE_STATUS[r.status]?.type">{{ ROUTE_STATUS[r.status]?.label }}</el-tag>
        </div>
        <div class="route-body">
          <div class="progress-line">
            <el-progress :percentage="r.taskCount ? Math.round((r.doneCount / r.taskCount) * 100) : 0" :stroke-width="10" />
            <span class="muted">{{ r.doneCount }}/{{ r.taskCount }} 户</span>
          </div>
          <div class="muted" v-if="r.volunteer">配送员：{{ r.volunteer.name }}</div>
          <div class="muted" v-if="r.note">{{ r.note }}</div>
        </div>
        <div class="route-foot">
          <el-button v-if="isVolunteer && r.status === 'OPEN'" type="primary" size="small" @click="accept(r)">接单</el-button>
          <el-button v-if="isVolunteer && r.status === 'ACCEPTED' && r.volunteerId === userId" type="warning" size="small" @click="start(r)">开始配送</el-button>
          <el-button size="small" @click="$router.push(`/delivery/routes/${r.id}`)">查看明细</el-button>
        </div>
      </div>
      <el-empty v-if="!loading && !routes.length" description="当日暂无配送路线（厨房确认排餐并派单后生成）" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { deliveryApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { ROUTE_STATUS, ROUTE_TYPE, today } from '../../utils/dict'

const auth = useAuthStore()
const isVolunteer = computed(() => auth.user?.role === 'VOLUNTEER')
const userId = computed(() => auth.user?.id)
const date = ref(today())
const routes = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    routes.value = await deliveryApi.routes(date.value)
  } finally {
    loading.value = false
  }
}

async function accept(r) {
  await deliveryApi.accept(r.id)
  ElMessage.success('接单成功，请按时取餐配送')
  load()
}

async function start(r) {
  await deliveryApi.start(r.id)
  ElMessage.success('已开始配送')
  load()
}

onMounted(load)
</script>

<style scoped>
.route-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.route-card { background: #fff; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.route-card.mine { border: 1px solid #67c23a; }
.route-head { display: flex; justify-content: space-between; align-items: flex-start; }
.route-name { font-weight: 600; color: #303133; }
.route-body { margin: 12px 0; display: flex; flex-direction: column; gap: 8px; }
.progress-line { display: flex; align-items: center; gap: 10px; }
.progress-line :deep(.el-progress) { flex: 1; }
.route-foot { display: flex; gap: 8px; }
</style>
