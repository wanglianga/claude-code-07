<template>
  <div class="page" v-loading="loading">
    <div class="page-header">
      <h2>
        <el-button link icon="Back" @click="$router.back()">返回</el-button>
        {{ elder?.name }} 的档案
      </h2>
      <div class="toolbar" v-if="canEdit && elder">
        <el-button type="warning" plain @click="statusDialog = true">变更状态</el-button>
      </div>
    </div>

    <template v-if="elder">
      <div class="card">
        <h3>基本信息
          <el-tag :type="ELDER_STATUS[elder.status]?.type" style="margin-left: 8px">{{ ELDER_STATUS[elder.status]?.label }}</el-tag>
          <el-tag v-if="elder.consecutiveMissed >= 2" type="danger" style="margin-left: 6px">连续 {{ elder.consecutiveMissed }} 次未签收</el-tag>
        </h3>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="姓名">{{ elder.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ elder.gender === 'MALE' ? '男' : '女' }}</el-descriptions-item>
          <el-descriptions-item label="出生日期">{{ elder.birthDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ elder.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="送餐地址" :span="2">{{ elder.address }}</el-descriptions-item>
          <el-descriptions-item label="紧急联系人">{{ elder.emergencyContactName || '-' }}（{{ elder.emergencyContactRelation || '-' }}）</el-descriptions-item>
          <el-descriptions-item label="联系人电话">{{ elder.emergencyContactPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="补贴资格">
            <el-tag size="small" :type="SUBSIDY[elder.subsidyLevel]?.type">{{ SUBSIDY[elder.subsidyLevel]?.label }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="慢病情况" :span="3">
            <el-tag v-for="d in elder.chronicDiseases || []" :key="d" size="small" type="warning" effect="plain" style="margin-right: 4px">{{ d }}</el-tag>
            <span v-if="!(elder.chronicDiseases || []).length" class="muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="咀嚼能力">{{ CHEWING[elder.chewingAbility] }}</el-descriptions-item>
          <el-descriptions-item label="忌口">
            <el-tag v-for="d in elder.dietaryRestrictions || []" :key="d" size="small" effect="plain" style="margin-right: 4px">{{ d }}</el-tag>
            <span v-if="!(elder.dietaryRestrictions || []).length" class="muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="过敏">
            <el-tag v-for="a in elder.allergies || []" :key="a" size="small" type="danger" effect="plain" style="margin-right: 4px">{{ a }}</el-tag>
            <span v-if="!(elder.allergies || []).length" class="muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="送餐备注" :span="3">{{ elder.deliveryNote || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态说明" :span="3">{{ elder.statusNote || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="card">
        <h3>营养建议</h3>
        <el-table :data="elder.advices" size="small">
          <el-table-column label="餐型" width="130">
            <template #default="{ row }">
              <el-tag size="small" :type="MEAL_TYPE[row.mealType]?.type">{{ MEAL_TYPE[row.mealType]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="startDate" label="开始" width="110" />
          <el-table-column label="结束" width="110">
            <template #default="{ row }">{{ row.endDate || '长期' }}</template>
          </el-table-column>
          <el-table-column prop="note" label="建议说明" min-width="200" show-overflow-tooltip />
          <el-table-column label="营养师" width="110">
            <template #default="{ row }">{{ row.nutritionist?.name }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.active ? 'success' : 'info'">{{ row.active ? '生效' : '失效' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!elder.advices?.length" description="暂无营养建议" :image-size="60" />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
        <div class="card">
          <h3>状态变更记录</h3>
          <el-timeline style="padding-left: 4px">
            <el-timeline-item v-for="log in elder.statusLogs" :key="log.id" :timestamp="fmtDateTime(log.createdAt)" placement="top">
              <span v-if="log.fromStatus">{{ ELDER_STATUS[log.fromStatus]?.label }} → </span>
              <el-tag size="small" :type="ELDER_STATUS[log.toStatus]?.type">{{ ELDER_STATUS[log.toStatus]?.label }}</el-tag>
              <div class="muted">{{ log.reason }} · 操作人：{{ log.changedBy?.name || '-' }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!elder.statusLogs?.length" description="暂无记录" :image-size="60" />
        </div>
        <div class="card">
          <h3>最近配送</h3>
          <el-table :data="elder.recentTasks" size="small">
            <el-table-column prop="boxNumber" label="餐盒" width="90" />
            <el-table-column prop="dishName" label="菜品" min-width="130" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="TASK_STATUS[row.status]?.type">{{ TASK_STATUS[row.status]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="140">
              <template #default="{ row }">{{ fmtDateTime(row.deliveredAt || row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!elder.recentTasks?.length" description="暂无配送记录" :image-size="60" />
        </div>
      </div>

      <div class="card">
        <h3>相关异常工单</h3>
        <el-table :data="elder.exceptions" size="small">
          <el-table-column label="类型" width="130">
            <template #default="{ row }">{{ EXCEPTION_TYPE[row.type] }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="EXCEPTION_STATUS[row.status]?.type">{{ EXCEPTION_STATUS[row.status]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="resolution" label="处理结果" min-width="160" show-overflow-tooltip />
          <el-table-column label="时间" width="140">
            <template #default="{ row }">{{ fmtDateTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!elder.exceptions?.length" description="暂无异常记录" :image-size="60" />
      </div>
    </template>

    <el-dialog v-model="statusDialog" title="变更长者状态" width="440px">
      <el-form label-width="80px">
        <el-form-item label="新状态">
          <el-select v-model="statusForm.status" style="width: 100%">
            <el-option v-for="(v, k) in ELDER_STATUS" :key="k" :label="v.label" :value="k" :disabled="k === elder?.status" />
          </el-select>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="statusForm.reason" type="textarea" :rows="3" placeholder="如：老人住院 / 家属申请暂停 / 恢复正常送餐" />
        </el-form-item>
        <el-alert v-if="['PAUSED', 'HOSPITALIZED'].includes(statusForm.status)" type="warning" :closable="false"
          title="暂停/住院后，厨房下一轮排餐将自动跳过该长者，未来待配送任务会被取消" />
      </el-form>
      <template #footer>
        <el-button @click="statusDialog = false">取消</el-button>
        <el-button type="primary" :loading="changing" @click="changeStatus">确认变更</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { eldersApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { ELDER_STATUS, SUBSIDY, MEAL_TYPE, TASK_STATUS, EXCEPTION_TYPE, EXCEPTION_STATUS, fmtDateTime } from '../../utils/dict'

const CHEWING = { NORMAL: '正常', SOFT: '需软烂', LIQUID: '流食' }
const route = useRoute()
const auth = useAuthStore()
const canEdit = computed(() => ['ADMIN', 'COMMUNITY_WORKER'].includes(auth.user?.role))

const elder = ref(null)
const loading = ref(false)
const statusDialog = ref(false)
const changing = ref(false)
const statusForm = ref({ status: '', reason: '' })

async function load() {
  loading.value = true
  try {
    elder.value = await eldersApi.detail(route.params.id)
  } finally {
    loading.value = false
  }
}

async function changeStatus() {
  if (!statusForm.value.status) {
    ElMessage.warning('请选择新状态')
    return
  }
  changing.value = true
  try {
    await eldersApi.changeStatus(elder.value.id, statusForm.value)
    ElMessage.success('状态已变更，下一轮排餐将按新状态执行')
    statusDialog.value = false
    statusForm.value = { status: '', reason: '' }
    load()
  } finally {
    changing.value = false
  }
}

onMounted(load)
</script>
