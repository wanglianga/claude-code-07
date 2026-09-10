<template>
  <div class="page">
    <div class="page-header">
      <h2>营养建议</h2>
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索长者姓名" clearable style="width: 180px" />
      </div>
    </div>

    <div class="card">
      <h3>长者用餐建议一览（点击"新增建议"为长者调整餐型）</h3>
      <el-table :data="filtered" v-loading="loading">
        <el-table-column prop="name" label="长者" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="ELDER_STATUS[row.status]?.type">{{ ELDER_STATUS[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="慢病/忌口/过敏" min-width="200">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="d in row.chronicDiseases || []" :key="'c' + d" size="small" type="warning" effect="plain">{{ d }}</el-tag>
              <el-tag v-for="d in row.dietaryRestrictions || []" :key="'r' + d" size="small" effect="plain">忌{{ d }}</el-tag>
              <el-tag v-for="a in row.allergies || []" :key="'a' + a" size="small" type="danger" effect="plain">{{ a }}过敏</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="咀嚼" width="90">
          <template #default="{ row }">{{ CHEWING[row.chewingAbility] }}</template>
        </el-table-column>
        <el-table-column label="当前建议" width="130">
          <template #default="{ row }">
            <el-tag v-if="currentAdvice(row.id)" size="small" :type="MEAL_TYPE[currentAdvice(row.id).mealType]?.type">
              {{ MEAL_TYPE[currentAdvice(row.id).mealType]?.label }}
            </el-tag>
            <span v-else class="muted">未制定</span>
          </template>
        </el-table-column>
        <el-table-column label="建议说明" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ currentAdvice(row.id)?.note || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAdvice(row)">新增建议</el-button>
            <el-button v-if="currentAdvice(row.id)" link type="warning" @click="stopAdvice(row)">临时停餐</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="`为 ${current?.name} 制定建议`" width="480px">
      <el-form label-width="90px">
        <el-form-item label="餐型">
          <el-select v-model="adviceForm.mealType" style="width: 100%">
            <el-option v-for="(v, k) in MEAL_TYPE" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="adviceForm.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="adviceForm.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="留空表示长期" />
        </el-form-item>
        <el-form-item label="建议说明">
          <el-input v-model="adviceForm.note" type="textarea" :rows="3" placeholder="如：糖尿病需低盐低糖餐，注意花生过敏" />
        </el-form-item>
        <el-alert type="info" :closable="false" title="保存后旧建议自动失效，厨房下一轮排餐将按新建议执行" />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveAdvice">保存建议</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { eldersApi, nutritionApi } from '../../api'
import { ELDER_STATUS, MEAL_TYPE, today } from '../../utils/dict'

const CHEWING = { NORMAL: '正常', SOFT: '需软烂', LIQUID: '流食' }
const elders = ref([])
const advices = ref([])
const loading = ref(false)
const keyword = ref('')
const dialogVisible = ref(false)
const saving = ref(false)
const current = ref(null)
const adviceForm = ref({ mealType: 'NORMAL', startDate: today(), endDate: '', note: '' })

const filtered = computed(() =>
  elders.value.filter((e) => !keyword.value || e.name.includes(keyword.value)),
)

function currentAdvice(elderId) {
  return advices.value.find((a) => a.elderId === elderId && a.active)
}

async function load() {
  loading.value = true
  try {
    ;[elders.value, advices.value] = await Promise.all([
      eldersApi.list({}),
      nutritionApi.list({}),
    ])
  } finally {
    loading.value = false
  }
}

function openAdvice(elder) {
  current.value = elder
  const cur = currentAdvice(elder.id)
  adviceForm.value = {
    mealType: cur?.mealType || 'NORMAL',
    startDate: today(),
    endDate: '',
    note: cur?.note || '',
  }
  dialogVisible.value = true
}

async function saveAdvice() {
  saving.value = true
  try {
    await nutritionApi.create({
      elderId: current.value.id,
      ...adviceForm.value,
      endDate: adviceForm.value.endDate || undefined,
    })
    ElMessage.success('建议已保存，下一轮排餐生效')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function stopAdvice(elder) {
  await ElMessageBox.confirm(`确认为 ${elder.name} 设置临时停餐？停餐期间厨房不再为其排餐。`, '临时停餐', { type: 'warning' })
  await nutritionApi.create({
    elderId: elder.id,
    mealType: 'STOPPED',
    startDate: today(),
    note: '营养师临时停餐',
  })
  ElMessage.success('已设置临时停餐')
  load()
}

onMounted(load)
</script>
