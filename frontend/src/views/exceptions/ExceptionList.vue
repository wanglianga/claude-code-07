<template>
  <div class="page">
    <div class="page-header">
      <h2>异常工单</h2>
      <div class="toolbar">
        <el-radio-group v-model="status" @change="load">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="PENDING">待处理</el-radio-button>
          <el-radio-button value="PROCESSING">处理中</el-radio-button>
          <el-radio-button value="RESOLVED">已办结</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="card">
      <el-table :data="list" v-loading="loading">
        <el-table-column label="工单" width="70">
          <template #default="{ row }">#{{ row.id }}</template>
        </el-table-column>
        <el-table-column label="异常类型" width="130">
          <template #default="{ row }">
            <el-tag size="small" type="danger" effect="plain">{{ EXCEPTION_TYPE[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="长者" width="90">
          <template #default="{ row }">{{ row.task?.elderName }}</template>
        </el-table-column>
        <el-table-column label="长者当前状态" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.elder" size="small" :type="ELDER_STATUS[row.elder.status]?.type">{{ ELDER_STATUS[row.elder.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="情况描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="上报人" width="100">
          <template #default="{ row }">{{ row.reportedBy?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="EXCEPTION_STATUS[row.status]?.type">{{ EXCEPTION_STATUS[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理人" width="100">
          <template #default="{ row }">{{ row.handler?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="resolution" label="处理结果" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.resolution || '-' }}</template>
        </el-table-column>
        <el-table-column label="上报时间" width="150">
          <template #default="{ row }">{{ fmtDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <template v-if="canHandle">
              <el-button v-if="row.status === 'PENDING'" link type="primary" @click="claim(row)">认领</el-button>
              <el-button v-if="row.status !== 'RESOLVED'" link type="success" @click="openResolve(row)">办结</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !list.length" description="暂无异常工单" :image-size="80" />
    </div>

    <el-dialog v-model="resolveVisible" :title="`办结工单 #${current?.id}（${EXCEPTION_TYPE[current?.type]}）`" width="520px">
      <el-descriptions :column="1" border size="small" style="margin-bottom: 14px">
        <el-descriptions-item label="长者">{{ current?.task?.elderName }}（{{ current?.elder ? ELDER_STATUS[current.elder.status]?.label : '-' }}）</el-descriptions-item>
        <el-descriptions-item label="情况">{{ current?.description || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-form label-width="110px">
        <el-form-item label="处理说明" required>
          <el-input v-model="resolveForm.resolution" type="textarea" :rows="3"
            placeholder="如：已电话联系家属确认邻居代收有效 / 已上门确认老人身体不适，建议就医" />
        </el-form-item>
        <el-form-item label="餐食处理">
          <el-radio-group v-model="resolveForm.taskOutcome">
            <el-radio value="DELIVERED">确认送达（代收/补送，计入补贴）</el-radio>
            <el-radio value="RETURNED">确认退餐（不计入送达）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="长者状态调整">
          <el-select v-model="resolveForm.newElderStatus" clearable placeholder="不调整" style="width: 100%">
            <el-option v-for="(v, k) in ELDER_STATUS" :key="k" :label="v.label" :value="k" />
          </el-select>
          <div class="muted" style="margin-top: 4px">调整后长者档案状态同步更新，厨房下一轮排餐自动按新状态执行</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitResolve">确认办结</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { exceptionsApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { EXCEPTION_TYPE, EXCEPTION_STATUS, ELDER_STATUS, fmtDateTime } from '../../utils/dict'

const auth = useAuthStore()
const canHandle = computed(() => ['ADMIN', 'COMMUNITY_WORKER'].includes(auth.user?.role))
const list = ref([])
const loading = ref(false)
const status = ref('')
const resolveVisible = ref(false)
const submitting = ref(false)
const current = ref(null)
const resolveForm = ref({ resolution: '', taskOutcome: 'RETURNED', newElderStatus: '' })

async function load() {
  loading.value = true
  try {
    list.value = await exceptionsApi.list(status.value ? { status: status.value } : {})
  } finally {
    loading.value = false
  }
}

async function claim(row) {
  await exceptionsApi.claim(row.id)
  ElMessage.success('已认领，请尽快处理')
  load()
}

function openResolve(row) {
  current.value = row
  resolveForm.value = { resolution: '', taskOutcome: 'RETURNED', newElderStatus: '' }
  resolveVisible.value = true
}

async function submitResolve() {
  if (!resolveForm.value.resolution.trim()) {
    ElMessage.warning('请填写处理说明')
    return
  }
  submitting.value = true
  try {
    await exceptionsApi.resolve(current.value.id, {
      ...resolveForm.value,
      newElderStatus: resolveForm.value.newElderStatus || undefined,
    })
    ElMessage.success('工单已办结')
    resolveVisible.value = false
    load()
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
