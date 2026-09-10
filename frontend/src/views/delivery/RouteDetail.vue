<template>
  <div class="page" v-loading="loading">
    <div class="page-header">
      <h2>
        <el-button link icon="Back" @click="$router.back()">返回</el-button>
        {{ detail?.name }}
      </h2>
      <div class="toolbar" v-if="detail">
        <el-tag :type="ROUTE_STATUS[detail.status]?.type">{{ ROUTE_STATUS[detail.status]?.label }}</el-tag>
        <el-tag type="info" effect="plain">{{ ROUTE_TYPE[detail.routeType] }}</el-tag>
        <el-button v-if="canStart" type="warning" @click="start">开始配送</el-button>
      </div>
    </div>

    <el-alert v-if="detail?.note" type="warning" :closable="false" :title="detail.note" style="margin-bottom: 14px" />

    <div class="card" v-if="detail">
      <el-table :data="detail.tasks" :row-class-name="rowClass">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="餐盒编号" width="100">
          <template #default="{ row }">
            <el-tag effect="dark" size="small">{{ row.boxNumber }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="elderName" label="长者" width="90" />
        <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="dishName" label="菜品" min-width="140" show-overflow-tooltip />
        <el-table-column label="签收方式" width="90">
          <template #default="{ row }">{{ SIGN_METHOD[row.signMethod] }}</template>
        </el-table-column>
        <el-table-column label="注意事项" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span :style="{ color: row.notes ? '#e6a23c' : '#909399' }">{{ row.notes || '无' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="TASK_STATUS[row.status]?.type">{{ TASK_STATUS[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="送达信息" min-width="190">
          <template #default="{ row }">
            <template v-if="row.status === 'DELIVERED'">
              <div class="muted">{{ row.temperature }}℃ · {{ row.signerName }}（{{ SIGN_METHOD[row.signMethod] }}）</div>
              <div class="muted">老人状态：{{ ELDER_CONDITION[row.elderCondition] }}<span v-if="row.hasLeftover"> · 有剩餐</span></div>
            </template>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING' && isOwner && ['ACCEPTED', 'IN_PROGRESS'].includes(detail.status)">
              <el-button link type="success" @click="openDeliver(row)">送达登记</el-button>
              <el-button link type="danger" @click="openException(row)">上报异常</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="card" v-if="detail?.exceptions?.length">
      <h3>本路线异常记录</h3>
      <el-table :data="detail.exceptions" size="small">
        <el-table-column label="类型" width="130">
          <template #default="{ row }">{{ EXCEPTION_TYPE[row.type] }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="EXCEPTION_STATUS[row.status]?.type">{{ EXCEPTION_STATUS[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="150">
          <template #default="{ row }">{{ fmtDateTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="deliverVisible" title="送达登记" width="460px">
      <el-form label-width="90px">
        <el-form-item label="餐盒编号">
          <el-tag effect="dark">{{ current?.boxNumber }}</el-tag>
          <span style="margin-left: 8px">{{ current?.elderName }}</span>
        </el-form-item>
        <el-form-item label="餐品温度" required>
          <el-input-number v-model="deliverForm.temperature" :min="0" :max="100" :step="0.5" />
          <span class="muted" style="margin-left: 8px">℃（热链应≥60℃）</span>
        </el-form-item>
        <el-form-item label="签收方式">
          <el-radio-group v-model="deliverForm.signMethod">
            <el-radio v-for="(v, k) in SIGN_METHOD" :key="k" :value="k">{{ v }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="签收人" required>
          <el-input v-model="deliverForm.signerName" placeholder="本人姓名 / 代收人姓名" />
        </el-form-item>
        <el-form-item v-if="deliverForm.signMethod !== 'SELF'" label="与老人关系">
          <el-input v-model="deliverForm.signerRelation" placeholder="如：女儿 / 邻居" />
        </el-form-item>
        <el-form-item label="老人状态">
          <el-radio-group v-model="deliverForm.elderCondition">
            <el-radio v-for="(v, k) in ELDER_CONDITION" :key="k" :value="k">{{ v }}</el-radio>
          </el-radio-group>
          <el-alert v-if="deliverForm.elderCondition === 'POOR'" type="error" :closable="false" style="margin-top: 6px"
            title="选择「较差」将自动生成健康异常工单通知社区工作人员" />
        </el-form-item>
        <el-form-item label="剩餐情况">
          <el-checkbox v-model="deliverForm.hasLeftover">老人反馈有剩餐（厨房将据此调整份量）</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deliverVisible = false">取消</el-button>
        <el-button type="success" :loading="submitting" @click="submitDeliver">确认送达</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="exceptionVisible" title="上报异常" width="460px">
      <el-form label-width="90px">
        <el-form-item label="餐盒编号">
          <el-tag effect="dark">{{ current?.boxNumber }}</el-tag>
          <span style="margin-left: 8px">{{ current?.elderName }}</span>
        </el-form-item>
        <el-form-item label="异常类型" required>
          <el-select v-model="exceptionForm.type" style="width: 100%">
            <el-option v-for="(v, k) in EXCEPTION_TYPE" :key="k" :label="v" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="情况说明">
          <el-input v-model="exceptionForm.description" type="textarea" :rows="3"
            placeholder="如：敲门无人应答，电话未接通 / 邻居王阿姨代收 / 餐盒破损洒漏" />
        </el-form-item>
        <el-alert type="warning" :closable="false" title="上报后任务将转交社区工作人员处理，老人连续无人签收会影响后续路线安排" />
      </el-form>
      <template #footer>
        <el-button @click="exceptionVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitException">提交异常</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { deliveryApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { ROUTE_STATUS, ROUTE_TYPE, TASK_STATUS, SIGN_METHOD, ELDER_CONDITION, EXCEPTION_TYPE, EXCEPTION_STATUS, fmtDateTime } from '../../utils/dict'

const route = useRoute()
const auth = useAuthStore()
const detail = ref(null)
const loading = ref(false)
const submitting = ref(false)
const deliverVisible = ref(false)
const exceptionVisible = ref(false)
const current = ref(null)
const deliverForm = ref({ temperature: 62, signMethod: 'SELF', signerName: '', signerRelation: '', elderCondition: 'GOOD', hasLeftover: false })
const exceptionForm = ref({ type: 'NOT_HOME', description: '' })

const isOwner = computed(() => detail.value?.volunteerId === auth.user?.id)
const canStart = computed(() => isOwner.value && detail.value?.status === 'ACCEPTED')

function rowClass({ row }) {
  return row.status === 'EXCEPTION' ? 'exc-row' : ''
}

async function load() {
  loading.value = true
  try {
    detail.value = await deliveryApi.routeDetail(route.params.id)
  } finally {
    loading.value = false
  }
}

async function start() {
  await deliveryApi.start(detail.value.id)
  ElMessage.success('已开始配送')
  load()
}

function openDeliver(row) {
  current.value = row
  deliverForm.value = { temperature: 62, signMethod: 'SELF', signerName: row.elderName, signerRelation: '', elderCondition: 'GOOD', hasLeftover: false }
  deliverVisible.value = true
}

async function submitDeliver() {
  if (!deliverForm.value.signerName) {
    ElMessage.warning('请填写签收人')
    return
  }
  submitting.value = true
  try {
    await deliveryApi.deliver(current.value.id, deliverForm.value)
    ElMessage.success('送达登记成功')
    deliverVisible.value = false
    load()
  } finally {
    submitting.value = false
  }
}

function openException(row) {
  current.value = row
  exceptionForm.value = { type: 'NOT_HOME', description: '' }
  exceptionVisible.value = true
}

async function submitException() {
  submitting.value = true
  try {
    await deliveryApi.reportException(current.value.id, exceptionForm.value)
    ElMessage.success('异常已上报，社区工作人员将接手处理')
    exceptionVisible.value = false
    load()
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style>
.exc-row { background: #fef0f0 !important; }
</style>
