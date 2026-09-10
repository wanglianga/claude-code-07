<template>
  <div class="page">
    <div class="page-header">
      <h2>长者档案</h2>
      <div class="toolbar">
        <el-input v-model="query.keyword" placeholder="搜索姓名" clearable style="width: 160px" @change="load" />
        <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px" @change="load">
          <el-option v-for="(v, k) in ELDER_STATUS" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-button v-if="canEdit" type="primary" icon="Plus" @click="openForm()">新建档案</el-button>
      </div>
    </div>

    <div class="card">
      <el-table :data="list" v-loading="loading" @row-click="(r) => $router.push(`/elders/${r.id}`)" style="cursor: pointer">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column label="年龄" width="70">
          <template #default="{ row }">{{ age(row.birthDate) }}</template>
        </el-table-column>
        <el-table-column prop="address" label="送餐地址" min-width="200" show-overflow-tooltip />
        <el-table-column label="慢病" min-width="130">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="d in row.chronicDiseases || []" :key="d" size="small" type="warning" effect="plain">{{ d }}</el-tag>
              <span v-if="!(row.chronicDiseases || []).length" class="muted">无</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="咀嚼" width="90">
          <template #default="{ row }">{{ CHEWING[row.chewingAbility] }}</template>
        </el-table-column>
        <el-table-column label="过敏" min-width="100">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="a in row.allergies || []" :key="a" size="small" type="danger" effect="plain">{{ a }}</el-tag>
              <span v-if="!(row.allergies || []).length" class="muted">无</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="补贴" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="SUBSIDY[row.subsidyLevel]?.type">{{ SUBSIDY[row.subsidyLevel]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="ELDER_STATUS[row.status]?.type">{{ ELDER_STATUS[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="连续未签收" width="90" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.consecutiveMissed >= 2 ? '#f56c6c' : 'inherit', fontWeight: row.consecutiveMissed >= 2 ? 600 : 400 }">
              {{ row.consecutiveMissed }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="$router.push(`/elders/${row.id}`)">详情</el-button>
            <el-button v-if="canEdit" link type="primary" @click.stop="openForm(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="form.id ? '编辑档案' : '新建长者档案'" width="720px" top="4vh">
      <el-form :model="form" label-width="96px" label-position="left">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="性别" required>
              <el-radio-group v-model="form.gender">
                <el-radio value="MALE">男</el-radio><el-radio value="FEMALE">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="出生日期"><el-date-picker v-model="form.birthDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="送餐地址" required><el-input v-model="form.address" /></el-form-item></el-col>
          <el-col :span="4"><el-form-item label="楼栋"><el-input v-model="form.building" placeholder="如：3栋" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="慢病情况">
              <el-select v-model="form.chronicDiseases" multiple filterable allow-create default-first-option style="width: 100%" placeholder="选择或输入">
                <el-option v-for="o in CHRONIC_OPTIONS" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="咀嚼能力">
              <el-select v-model="form.chewingAbility" style="width: 100%">
                <el-option v-for="(v, k) in CHEWING" :key="k" :label="v" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="忌口">
              <el-select v-model="form.dietaryRestrictions" multiple filterable allow-create default-first-option style="width: 100%" placeholder="选择或输入">
                <el-option v-for="o in RESTRICTION_OPTIONS" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="过敏">
              <el-select v-model="form.allergies" multiple filterable allow-create default-first-option style="width: 100%" placeholder="选择或输入">
                <el-option v-for="o in ALLERGY_OPTIONS" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="紧急联系人"><el-input v-model="form.emergencyContactName" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="联系人电话"><el-input v-model="form.emergencyContactPhone" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="关系"><el-input v-model="form.emergencyContactRelation" placeholder="如：儿子" /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="补贴资格">
              <el-select v-model="form.subsidyLevel" style="width: 100%">
                <el-option v-for="(v, k) in SUBSIDY" :key="k" :label="v.label" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="16"><el-form-item label="送餐备注"><el-input v-model="form.deliveryNote" placeholder="志愿者可见，如：敲门请大声" /></el-form-item></el-col>
          <el-col :span="24">
            <el-form-item label="备用名单">
              <el-checkbox v-model="form.backupEligible">纳入备用名单（其他老人住院时，可接收转出的餐品）</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { eldersApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { ELDER_STATUS, SUBSIDY, CHRONIC_OPTIONS, RESTRICTION_OPTIONS, ALLERGY_OPTIONS } from '../../utils/dict'

const CHEWING = { NORMAL: '正常', SOFT: '需软烂', LIQUID: '流食' }
const auth = useAuthStore()
const canEdit = computed(() => ['ADMIN', 'COMMUNITY_WORKER'].includes(auth.user?.role))

const list = ref([])
const loading = ref(false)
const query = ref({ keyword: '', status: '' })
const formVisible = ref(false)
const saving = ref(false)
const emptyForm = () => ({
  id: null, name: '', gender: 'FEMALE', birthDate: '', phone: '', address: '', building: '',
  backupEligible: false,
  chronicDiseases: [], chewingAbility: 'NORMAL', dietaryRestrictions: [], allergies: [],
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  subsidyLevel: 'NONE', deliveryNote: '',
})
const form = ref(emptyForm())

function age(birth) {
  if (!birth) return '-'
  return new Date().getFullYear() - new Date(birth).getFullYear()
}

async function load() {
  loading.value = true
  try {
    list.value = await eldersApi.list(query.value)
  } finally {
    loading.value = false
  }
}

function openForm(row) {
  form.value = row ? { ...emptyForm(), ...row } : emptyForm()
  formVisible.value = true
}

async function save() {
  if (!form.value.name || !form.value.address) {
    ElMessage.warning('请填写姓名和送餐地址')
    return
  }
  saving.value = true
  try {
    const { id, ...data } = form.value
    if (id) {
      await eldersApi.update(id, data)
      ElMessage.success('档案已更新')
    } else {
      await eldersApi.create(data)
      ElMessage.success('档案已建立')
    }
    formVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
