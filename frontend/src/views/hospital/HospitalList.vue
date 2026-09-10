<template>
  <div class="page">
    <div class="page-header">
      <h2>住院管理 · 停餐联动</h2>
      <div class="toolbar">
        <el-button v-if="isStaff" type="danger" plain icon="FirstAidKit" @click="openAdmit()">住院登记</el-button>
      </div>
    </div>

    <el-alert v-if="isFamily" type="info" :closable="false" style="margin-bottom: 14px"
      title="老人住院后请及时标记，平台将自动暂停后续配餐，并联动处理当日餐品；出院后由社区工作人员重新确认饮食禁忌与送餐地址，再恢复送餐。" />

    <!-- ========== 家属：我家老人 ========== -->
    <template v-if="isFamily">
      <div class="card">
        <h3>我家老人</h3>
        <el-table :data="myElders" v-loading="loadingMine">
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="ELDER_STATUS[row.status]?.type">{{ ELDER_STATUS[row.status]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="address" label="送餐地址" min-width="200" show-overflow-tooltip />
          <el-table-column label="忌口" min-width="120">
            <template #default="{ row }">{{ (row.dietaryRestrictions || []).join('、') || '无' }}</template>
          </el-table-column>
          <el-table-column label="住院情况" min-width="160">
            <template #default="{ row }">
              <template v-if="row.activeRecord">
                <el-tag size="small" :type="HOSPITAL_STATUS[row.activeRecord.status]?.type">
                  {{ HOSPITAL_STATUS[row.activeRecord.status]?.label }}
                </el-tag>
                <span class="muted" style="margin-left: 6px">{{ fmtDateTime(row.activeRecord.createdAt) }}</span>
              </template>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <el-button v-if="!['HOSPITALIZED', 'DISCHARGE_PENDING'].includes(row.status)"
                link type="danger" @click="openAdmit(row)">标记住院</el-button>
              <el-button v-if="row.status === 'HOSPITALIZED' && row.activeRecord"
                link type="success" @click="openDischarge(row.activeRecord, row.name)">标记出院</el-button>
              <span v-if="row.status === 'DISCHARGE_PENDING'" class="muted">待社区确认恢复</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loadingMine && !myElders.length" description="未关联老人档案，请联系社区工作人员" :image-size="80" />
      </div>

      <div class="card">
        <h3>住院记录</h3>
        <record-table :list="records" :loading="loadingRecords" :is-staff="false"
          @discharge="openDischarge" @resume="openResume" />
      </div>
    </template>

    <!-- ========== 社区/管理员/厨房 ========== -->
    <template v-if="isStaff || isKitchen">
      <el-tabs v-model="tab" class="card tabs-card">
        <el-tab-pane label="住院记录" name="records">
          <div class="toolbar" style="margin-bottom: 12px">
            <el-radio-group v-model="recordStatus" @change="loadRecords">
              <el-radio-button value="">全部</el-radio-button>
              <el-radio-button value="HOSPITALIZED">住院中</el-radio-button>
              <el-radio-button value="DISCHARGE_PENDING">出院待确认</el-radio-button>
              <el-radio-button value="RESUMED">已恢复</el-radio-button>
            </el-radio-group>
          </div>
          <record-table :list="records" :loading="loadingRecords" :is-staff="isStaff"
            @discharge="openDischarge" @resume="openResume" />
        </el-tab-pane>

        <el-tab-pane label="餐盒处置" name="disposals">
          <disposal-table :list="disposals" :loading="loadingDisposals" />
        </el-tab-pane>

        <el-tab-pane label="厨房损耗" name="losses">
          <el-table :data="losses" v-loading="loadingLosses">
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="elderName" label="住院长者" width="100" />
            <el-table-column label="餐盒" width="90">
              <template #default="{ row }">{{ row.boxNumber || '-' }}</template>
            </el-table-column>
            <el-table-column prop="dishName" label="菜品" min-width="150" show-overflow-tooltip />
            <el-table-column label="损耗原因" width="130">
              <template #default="{ row }">
                <el-tag size="small" :type="DISPOSAL_ACTION[row.action]?.type">{{ DISPOSAL_ACTION[row.action]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="份数" width="70" align="center" />
            <el-table-column prop="reason" label="说明" min-width="230" show-overflow-tooltip />
            <el-table-column label="登记时间" width="150">
              <template #default="{ row }">{{ fmtDateTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingLosses && !losses.length" description="暂无损耗记录" :image-size="80" />
        </el-tab-pane>

        <el-tab-pane v-if="isStaff" label="备用名单" name="backup">
          <el-alert type="info" :closable="false" style="margin-bottom: 12px"
            title="备用名单用于接收「已备餐但老人住院」转出的餐品；在长者档案中勾选「纳入备用名单」即可加入。" />
          <el-table :data="backupList" v-loading="loadingBackup">
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="building" label="楼栋" width="110" />
            <el-table-column prop="address" label="地址" min-width="230" show-overflow-tooltip />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="ELDER_STATUS[row.status]?.type">{{ ELDER_STATUS[row.status]?.label }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingBackup && !backupList.length" description="暂无备用名单，请在长者档案中设置" :image-size="80" />
        </el-tab-pane>
      </el-tabs>
    </template>

    <!-- ========== 志愿者：待我处置 ========== -->
    <template v-if="isVolunteer">
      <div class="card">
        <h3>待处置餐盒（老人住院，餐盒已出库）</h3>
        <el-table :data="pendingDisposals" v-loading="loadingDisposals">
          <el-table-column prop="date" label="日期" width="100" />
          <el-table-column prop="elderName" label="住院长者" width="100" />
          <el-table-column label="餐盒" width="90">
            <template #default="{ row }">
              <el-tag effect="dark" size="small">{{ row.boxNumber }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="dishName" label="菜品" min-width="150" show-overflow-tooltip />
          <el-table-column prop="note" label="处置要求" min-width="230" show-overflow-tooltip />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" size="small" @click="openHandle(row)">处置</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loadingDisposals && !pendingDisposals.length" description="暂无待处置餐盒" :image-size="80" />
      </div>
      <div class="card">
        <h3>处置记录</h3>
        <disposal-table :list="doneDisposals" :loading="loadingDisposals" />
      </div>
    </template>

    <!-- ========== 住院登记对话框 ========== -->
    <el-dialog v-model="admitVisible" title="住院登记（登记后自动暂停后续配餐）" width="480px">
      <el-form label-width="90px">
        <el-form-item v-if="isStaff" label="长者" required>
          <el-select v-model="admitForm.elderId" filterable placeholder="选择长者" style="width: 100%">
            <el-option v-for="e in admitElders" :key="e.id" :label="`${e.name}（${ELDER_STATUS[e.status]?.label}）`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="长者">
          <span>{{ admitForm.elderName }}</span>
        </el-form-item>
        <el-form-item label="住院说明">
          <el-input v-model="admitForm.reason" type="textarea" :rows="3" placeholder="如：突发脑梗，入住朝阳医院（选填）" />
        </el-form-item>
        <el-alert type="warning" :closable="false"
          title="登记后：暂停后续配餐；当天餐按「未备餐 / 已备餐未出库 / 已出库」自动联动处置" />
      </el-form>
      <template #footer>
        <el-button @click="admitVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitAdmit">确认住院</el-button>
      </template>
    </el-dialog>

    <!-- ========== 出院对话框 ========== -->
    <el-dialog v-model="dischargeVisible" title="标记出院" width="440px">
      <el-form label-width="90px">
        <el-form-item label="长者">
          <span>{{ current?.elder?.name || current?.displayName }}</span>
        </el-form-item>
        <el-form-item label="出院说明">
          <el-input v-model="dischargeNote" type="textarea" :rows="3" placeholder="如：已出院回家休养（选填）" />
        </el-form-item>
        <el-alert type="info" :closable="false"
          title="出院后进入「出院待确认」：社区工作人员重新确认饮食禁忌与送餐地址后，才会恢复排餐" />
      </el-form>
      <template #footer>
        <el-button @click="dischargeVisible = false">取消</el-button>
        <el-button type="success" :loading="submitting" @click="submitDischarge">确认出院</el-button>
      </template>
    </el-dialog>

    <!-- ========== 恢复确认对话框（社区） ========== -->
    <el-dialog v-model="resumeVisible" title="恢复送餐确认（重新核对饮食禁忌与送餐地址）" width="560px">
      <template v-if="current">
        <el-descriptions :column="1" border size="small" style="margin-bottom: 14px">
          <el-descriptions-item label="长者">{{ current.elder?.name }}</el-descriptions-item>
          <el-descriptions-item label="住院">{{ current.reason || '-' }}（{{ fmtDateTime(current.createdAt) }} 标记）</el-descriptions-item>
          <el-descriptions-item label="出院">
            {{ current.dischargedAt ? fmtDateTime(current.dischargedAt) : '-' }}{{ current.dischargeNote ? ' · ' + current.dischargeNote : '' }}
          </el-descriptions-item>
        </el-descriptions>
        <el-form label-width="110px">
          <el-form-item label="饮食禁忌">
            <el-select v-model="resumeForm.dietaryRestrictions" multiple filterable allow-create default-first-option
              style="width: 100%" placeholder="与家属/老人核对后可修改">
              <el-option v-for="o in RESTRICTION_OPTIONS" :key="o" :label="o" :value="o" />
            </el-select>
          </el-form-item>
          <el-form-item label="送餐地址">
            <el-input v-model="resumeForm.address" placeholder="与家属/老人核对后可修改" />
          </el-form-item>
          <el-form-item label="确认事项" required>
            <div>
              <el-checkbox v-model="resumeForm.dietConfirmed">已与老人/家属重新核对饮食禁忌</el-checkbox>
              <br />
              <el-checkbox v-model="resumeForm.addressConfirmed">已与老人/家属重新核对送餐地址</el-checkbox>
            </div>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="resumeForm.note" type="textarea" :rows="2" placeholder="如：医嘱新增低嘌呤要求（选填）" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="resumeVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!resumeForm.dietConfirmed || !resumeForm.addressConfirmed"
          @click="submitResume">确认并恢复排餐</el-button>
      </template>
    </el-dialog>

    <!-- ========== 志愿者处置对话框 ========== -->
    <el-dialog v-model="handleVisible" title="餐盒处置（老人住院，餐盒已出库）" width="500px">
      <template v-if="current">
        <el-descriptions :column="1" border size="small" style="margin-bottom: 14px">
          <el-descriptions-item label="餐盒">{{ current.boxNumber }} · {{ current.dishName }}</el-descriptions-item>
          <el-descriptions-item label="住院长者">{{ current.elderName }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-width="90px">
          <el-form-item label="处置方式" required>
            <el-radio-group v-model="handleForm.action" class="action-radios">
              <el-radio value="RETURN_KITCHEN">
                退回厨房 <span class="muted">计入厨房损耗，不核销补贴</span>
              </el-radio>
              <el-radio value="TRANSFER_NEIGHBOR">
                转交同楼栋老人 <span class="muted">计入接收人送达与补贴</span>
              </el-radio>
              <el-radio value="DISCARD">
                报损 <span class="muted">计入厨房损耗，不核销补贴</span>
              </el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="handleForm.action === 'TRANSFER_NEIGHBOR'" label="接收老人" required>
            <el-select v-model="handleForm.transferToElderId" style="width: 100%" placeholder="选择同楼栋老人">
              <el-option v-for="c in candidates" :key="c.id" :label="`${c.name}（${c.address}）`" :value="c.id" />
            </el-select>
            <div v-if="!candidates.length" class="muted" style="margin-top: 4px">该楼栋暂无其他可接收老人，请选退回厨房或报损</div>
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="handleForm.note" type="textarea" :rows="2"
              :placeholder="handleForm.action === 'DISCARD' ? '如：餐盒破损/超时无法转交' : '选填'" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitHandle">确认处置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { hospitalApi, eldersApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import DisposalTable from './DisposalTable.vue'
import RecordTable from './RecordTable.vue'
import {
  ELDER_STATUS, HOSPITAL_STATUS, DISPOSAL_ACTION,
  RESTRICTION_OPTIONS, fmtDateTime,
} from '../../utils/dict'

const auth = useAuthStore()
const role = computed(() => auth.user?.role)
const isStaff = computed(() => ['ADMIN', 'COMMUNITY_WORKER'].includes(role.value))
const isKitchen = computed(() => role.value === 'KITCHEN_STAFF')
const isVolunteer = computed(() => role.value === 'VOLUNTEER')
const isFamily = computed(() => role.value === 'FAMILY')

const tab = ref('records')
const submitting = ref(false)

// 家属：我家老人
const myElders = ref([])
const loadingMine = ref(false)

// 住院记录
const records = ref([])
const loadingRecords = ref(false)
const recordStatus = ref('')

// 处置单 / 损耗 / 备用名单
const disposals = ref([])
const loadingDisposals = ref(false)
const losses = ref([])
const loadingLosses = ref(false)
const backupList = ref([])
const loadingBackup = ref(false)

const pendingDisposals = computed(() => disposals.value.filter((d) => d.status === 'PENDING'))
const doneDisposals = computed(() => disposals.value.filter((d) => d.status === 'DONE'))

// 对话框状态
const admitVisible = ref(false)
const admitForm = ref({ elderId: null, elderName: '', reason: '' })
const admitElders = ref([])
const dischargeVisible = ref(false)
const dischargeNote = ref('')
const resumeVisible = ref(false)
const resumeForm = ref({ dietaryRestrictions: [], address: '', dietConfirmed: false, addressConfirmed: false, note: '' })
const handleVisible = ref(false)
const handleForm = ref({ action: 'RETURN_KITCHEN', transferToElderId: null, note: '' })
const candidates = ref([])
const current = ref(null)

async function loadMine() {
  loadingMine.value = true
  try {
    myElders.value = await hospitalApi.myElders()
  } finally {
    loadingMine.value = false
  }
}

async function loadRecords() {
  loadingRecords.value = true
  try {
    records.value = await hospitalApi.records(recordStatus.value ? { status: recordStatus.value } : {})
  } finally {
    loadingRecords.value = false
  }
}

async function loadDisposals() {
  loadingDisposals.value = true
  try {
    disposals.value = await hospitalApi.disposals()
  } finally {
    loadingDisposals.value = false
  }
}

async function loadLosses() {
  loadingLosses.value = true
  try {
    losses.value = await hospitalApi.losses()
  } finally {
    loadingLosses.value = false
  }
}

async function loadBackup() {
  loadingBackup.value = true
  try {
    backupList.value = await hospitalApi.backupList()
  } finally {
    loadingBackup.value = false
  }
}

function reload() {
  if (isFamily.value) {
    loadMine()
    loadRecords()
  } else if (isVolunteer.value) {
    loadDisposals()
  } else {
    loadRecords()
    loadDisposals()
    loadLosses()
    if (isStaff.value) loadBackup()
  }
}

// ---------- 住院登记 ----------
async function openAdmit(elder) {
  admitForm.value = { elderId: elder?.id || null, elderName: elder?.name || '', reason: '' }
  if (isStaff.value) {
    const all = await eldersApi.list()
    admitElders.value = all.filter((e) => !['HOSPITALIZED', 'DISCHARGE_PENDING'].includes(e.status))
  }
  admitVisible.value = true
}

async function submitAdmit() {
  if (!admitForm.value.elderId) {
    ElMessage.warning('请选择长者')
    return
  }
  submitting.value = true
  try {
    const res = await hospitalApi.admit({ elderId: admitForm.value.elderId, reason: admitForm.value.reason || undefined })
    admitVisible.value = false
    await ElMessageBox.alert(res.message, '住院联动处理结果', { confirmButtonText: '知道了', type: 'success' })
    reload()
  } finally {
    submitting.value = false
  }
}

// ---------- 出院 ----------
function openDischarge(record, elderName) {
  current.value = { ...record, displayName: elderName || record.elder?.name }
  dischargeNote.value = ''
  dischargeVisible.value = true
}

async function submitDischarge() {
  submitting.value = true
  try {
    await hospitalApi.discharge(current.value.id, { note: dischargeNote.value || undefined })
    dischargeVisible.value = false
    ElMessage.success('已标记出院，待社区确认后恢复送餐')
    reload()
  } finally {
    submitting.value = false
  }
}

// ---------- 恢复确认 ----------
function openResume(record) {
  current.value = record
  resumeForm.value = {
    dietaryRestrictions: [...(record.elder?.dietaryRestrictions || [])],
    address: record.elder?.address || '',
    dietConfirmed: false,
    addressConfirmed: false,
    note: '',
  }
  resumeVisible.value = true
}

async function submitResume() {
  submitting.value = true
  try {
    await hospitalApi.resume(current.value.id, resumeForm.value)
    resumeVisible.value = false
    ElMessage.success('已确认，长者恢复正常排餐')
    reload()
  } finally {
    submitting.value = false
  }
}

// ---------- 志愿者处置 ----------
async function openHandle(disposal) {
  current.value = disposal
  handleForm.value = { action: 'RETURN_KITCHEN', transferToElderId: null, note: '' }
  candidates.value = await hospitalApi.candidates(disposal.id)
  handleVisible.value = true
}

async function submitHandle() {
  if (handleForm.value.action === 'TRANSFER_NEIGHBOR' && !handleForm.value.transferToElderId) {
    ElMessage.warning('请选择同楼栋接收老人')
    return
  }
  submitting.value = true
  try {
    const res = await hospitalApi.handle(current.value.id, {
      action: handleForm.value.action,
      transferToElderId: handleForm.value.transferToElderId || undefined,
      note: handleForm.value.note || undefined,
    })
    handleVisible.value = false
    ElMessageBox.alert(res.subsidyNote || '处置完成', '处置结果', { confirmButtonText: '知道了', type: 'success' })
    loadDisposals()
  } finally {
    submitting.value = false
  }
}

onMounted(reload)
</script>

<style scoped>
.tabs-card { padding-top: 4px; }
.action-radios :deep(.el-radio) { display: flex; margin-bottom: 8px; height: auto; }
</style>
