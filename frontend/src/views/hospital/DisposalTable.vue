<template>
  <el-table :data="list" v-loading="loading">
    <el-table-column prop="date" label="日期" width="100" />
    <el-table-column prop="elderName" label="住院长者" width="90" />
    <el-table-column label="阶段" width="115">
      <template #default="{ row }">
        <el-tag size="small" :type="DISPOSAL_STAGE[row.stage]?.type" effect="plain">{{ DISPOSAL_STAGE[row.stage]?.label }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="处置方式" width="130">
      <template #default="{ row }">
        <el-tag size="small" :type="DISPOSAL_ACTION[row.action]?.type">{{ DISPOSAL_ACTION[row.action]?.label }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="boxNumber" label="餐盒" width="85">
      <template #default="{ row }">{{ row.boxNumber || '-' }}</template>
    </el-table-column>
    <el-table-column label="接收人" width="90">
      <template #default="{ row }">{{ row.transferToElderName || '-' }}</template>
    </el-table-column>
    <el-table-column label="厨房损耗" width="85" align="center">
      <template #default="{ row }">
        <el-tag v-if="row.kitchenLoss" size="small" type="danger">损耗</el-tag>
        <span v-else class="muted">无</span>
      </template>
    </el-table-column>
    <el-table-column prop="subsidyNote" label="补贴核销影响" min-width="210" show-overflow-tooltip />
    <el-table-column label="处置人" width="100">
      <template #default="{ row }">{{ row.handledBy?.name || '系统自动' }}</template>
    </el-table-column>
    <el-table-column label="状态" width="115">
      <template #default="{ row }">
        <el-tag size="small" :type="DISPOSAL_STATUS[row.status]?.type">{{ DISPOSAL_STATUS[row.status]?.label }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="时间" width="150">
      <template #default="{ row }">{{ fmtDateTime(row.handledAt || row.createdAt) }}</template>
    </el-table-column>
  </el-table>
</template>

<script setup>
import { DISPOSAL_STAGE, DISPOSAL_ACTION, DISPOSAL_STATUS, fmtDateTime } from '../../utils/dict'

defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
</script>
