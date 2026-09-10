<template>
  <el-table :data="list" v-loading="loading">
    <el-table-column label="长者" width="90">
      <template #default="{ row }">{{ row.elder?.name }}</template>
    </el-table-column>
    <el-table-column label="记录状态" width="110">
      <template #default="{ row }">
        <el-tag :type="HOSPITAL_STATUS[row.status]?.type">{{ HOSPITAL_STATUS[row.status]?.label }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="标记" width="90">
      <template #default="{ row }">
        <el-tag size="small" effect="plain" :type="row.markChannel === 'FAMILY' ? 'warning' : 'primary'">
          {{ MARK_CHANNEL[row.markChannel] }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="reason" label="住院说明" min-width="150" show-overflow-tooltip>
      <template #default="{ row }">{{ row.reason || '-' }}</template>
    </el-table-column>
    <el-table-column label="当日餐联动" min-width="220">
      <template #default="{ row }">
        <div v-for="d in row.disposals" :key="d.id" style="font-size: 12px; line-height: 22px">
          <el-tag size="small" :type="DISPOSAL_STAGE[d.stage]?.type" effect="plain">{{ DISPOSAL_STAGE[d.stage]?.label }}</el-tag>
          →
          <el-tag size="small" :type="DISPOSAL_ACTION[d.action]?.type">{{ DISPOSAL_ACTION[d.action]?.label }}</el-tag>
          <span v-if="d.transferToElderName" class="muted">（{{ d.transferToElderName }}）</span>
          <el-tag v-if="d.kitchenLoss" size="small" type="danger" effect="plain" style="margin-left: 4px">损耗</el-tag>
        </div>
        <span v-if="!row.disposals?.length" class="muted">当日无餐/已送达</span>
      </template>
    </el-table-column>
    <el-table-column label="住院时间" width="150">
      <template #default="{ row }">{{ fmtDateTime(row.createdAt) }}</template>
    </el-table-column>
    <el-table-column label="出院时间" width="150">
      <template #default="{ row }">{{ row.dischargedAt ? fmtDateTime(row.dischargedAt) : '-' }}</template>
    </el-table-column>
    <el-table-column label="恢复确认" min-width="150">
      <template #default="{ row }">
        <template v-if="row.status === 'RESUMED'">
          <div class="muted">禁忌✓ 地址✓</div>
          <div class="muted">{{ row.resumedBy?.name }} · {{ fmtDateTime(row.resumedAt) }}</div>
        </template>
        <span v-else class="muted">-</span>
      </template>
    </el-table-column>
    <el-table-column v-if="isStaff" label="操作" width="170" fixed="right">
      <template #default="{ row }">
        <el-button v-if="row.status === 'HOSPITALIZED'" link type="success" @click="$emit('discharge', row)">标记出院</el-button>
        <el-button v-if="row.status === 'DISCHARGE_PENDING'" link type="primary" @click="$emit('resume', row)">恢复确认</el-button>
      </template>
    </el-table-column>
  </el-table>
  <el-empty v-if="!loading && !list.length" description="暂无住院记录" :image-size="80" />
</template>

<script setup>
import {
  HOSPITAL_STATUS, MARK_CHANNEL,
  DISPOSAL_STAGE, DISPOSAL_ACTION, fmtDateTime,
} from '../../utils/dict'

defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isStaff: { type: Boolean, default: false },
})
defineEmits(['discharge', 'resume'])
</script>
