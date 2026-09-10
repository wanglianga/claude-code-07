<template>
  <div class="page">
    <div class="page-header">
      <h2>补贴结算</h2>
      <div class="toolbar">
        <el-date-picker v-model="period" type="month" value-format="YYYY-MM" :clearable="false" @change="load" />
        <el-button type="primary" @click="generate">生成结算单</el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" style="margin-bottom: 14px"
      title="结算规则：实际送达（含代收确认）× 补贴单价；异常退餐不计入；补贴单价按结算时长者档案的补贴资格计算（部分补贴 6 元/餐，全额补贴 12 元/餐）" />

    <div class="stat-cards" v-if="list.length">
      <div class="stat-card"><div class="label">结算长者数</div><div class="value">{{ list.length }}</div></div>
      <div class="stat-card"><div class="label">送达总份数</div><div class="value">{{ totals.delivered }}</div></div>
      <div class="stat-card"><div class="label">代收确认</div><div class="value">{{ totals.proxy }}</div></div>
      <div class="stat-card"><div class="label">异常退餐</div><div class="value" style="color:#f56c6c">{{ totals.exceptions }}</div></div>
      <div class="stat-card"><div class="label">补贴总额</div><div class="value">¥{{ totals.amount.toFixed(2) }}</div></div>
    </div>

    <div class="card">
      <el-table :data="list" v-loading="loading">
        <el-table-column label="长者" width="110">
          <template #default="{ row }">{{ row.elder?.name }}</template>
        </el-table-column>
        <el-table-column prop="period" label="结算周期" width="100" />
        <el-table-column label="补贴资格" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="SUBSIDY[row.elder?.subsidyLevel]?.type">{{ SUBSIDY[row.elder?.subsidyLevel]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deliveredCount" label="实际送达" width="90" align="center" />
        <el-table-column prop="proxyCount" label="代收确认" width="90" align="center" />
        <el-table-column prop="exceptionCount" label="异常退餐" width="90" align="center" />
        <el-table-column label="单价" width="90" align="center">
          <template #default="{ row }">¥{{ Number(row.unitSubsidy).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="结算金额" width="110" align="center">
          <template #default="{ row }">
            <b>¥{{ Number(row.totalAmount).toFixed(2) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="SETTLEMENT_STATUS[row.status]?.type">{{ SETTLEMENT_STATUS[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING' && isAdmin" link type="success" @click="settle(row)">确认结算</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !list.length" description="该周期暂无结算单，点击右上角生成" :image-size="80" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { settlementsApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { SUBSIDY, SETTLEMENT_STATUS } from '../../utils/dict'

const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const period = ref(new Date().toISOString().slice(0, 7))
const list = ref([])
const loading = ref(false)

const totals = computed(() => ({
  delivered: list.value.reduce((s, r) => s + r.deliveredCount, 0),
  proxy: list.value.reduce((s, r) => s + r.proxyCount, 0),
  exceptions: list.value.reduce((s, r) => s + r.exceptionCount, 0),
  amount: list.value.reduce((s, r) => s + Number(r.totalAmount), 0),
}))

async function load() {
  loading.value = true
  try {
    list.value = await settlementsApi.list({ period: period.value })
  } finally {
    loading.value = false
  }
}

async function generate() {
  await settlementsApi.generate(period.value)
  ElMessage.success('结算单已生成/更新')
  load()
}

async function settle(row) {
  await ElMessageBox.confirm(`确认结算 ${row.elder?.name} ${row.period} 补贴 ¥${Number(row.totalAmount).toFixed(2)}？`, '确认结算', { type: 'warning' })
  await settlementsApi.settle(row.id)
  ElMessage.success('已结算')
  load()
}

onMounted(load)
</script>
