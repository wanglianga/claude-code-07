<template>
  <div class="page">
    <div class="page-header">
      <h2>厨房排餐</h2>
      <div class="toolbar">
        <el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" :clearable="false" @change="load" />
        <el-button type="primary" icon="MagicStick" @click="generate">按营养建议生成排餐</el-button>
        <el-button type="warning" icon="Van" :disabled="!confirmedCount" @click="dispatch">生成配送任务</el-button>
      </div>
    </div>

    <div class="stat-cards" v-if="eligible">
      <div class="stat-card" v-for="(v, k) in MEAL_TYPE" :key="k">
        <div class="label">{{ v.label }}</div>
        <div class="value">{{ eligible[k]?.length ?? 0 }}</div>
        <div class="sub">应排餐长者（已排除暂停/住院/停餐）</div>
      </div>
    </div>

    <div class="card">
      <h3>{{ date }} 排餐计划</h3>
      <el-table :data="schedules" v-loading="loading">
        <el-table-column label="餐型" width="120">
          <template #default="{ row }">
            <el-tag :type="MEAL_TYPE[row.mealType]?.type">{{ MEAL_TYPE[row.mealType]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="菜品" min-width="180">
          <template #default="{ row }">{{ row.dish?.name }}</template>
        </el-table-column>
        <el-table-column prop="plannedPortions" label="份数" width="80" align="center" />
        <el-table-column prop="packingTime" label="打包时间" width="100" align="center" />
        <el-table-column prop="insulationRequirement" label="保温要求" min-width="140" />
        <el-table-column prop="note" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="SCHEDULE_STATUS[row.status]?.type">{{ SCHEDULE_STATUS[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'DRAFT'">
              <el-button link type="primary" @click="openEdit(row)">调整</el-button>
              <el-button link type="success" @click="confirm(row)">确认</el-button>
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </template>
            <span v-else class="muted">已锁定</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !schedules.length" description="当日暂无排餐，点击右上角按营养建议生成" :image-size="80" />
    </div>

    <div class="card">
      <h3>近 7 天菜品反馈（拒收 / 洒漏 / 剩餐，用于调整菜单与份数）</h3>
      <el-table :data="feedback" size="small">
        <el-table-column prop="dishName" label="菜品" min-width="160" />
        <el-table-column label="餐型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="MEAL_TYPE[row.mealType]?.type">{{ MEAL_TYPE[row.mealType]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="配送份数" width="90" align="center" />
        <el-table-column prop="delivered" label="送达" width="80" align="center" />
        <el-table-column prop="refused" label="拒收" width="80" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.refused ? '#f56c6c' : 'inherit' }">{{ row.refused }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="spilled" label="洒漏" width="80" align="center" />
        <el-table-column prop="leftover" label="剩餐反馈" width="90" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.leftover ? '#e6a23c' : 'inherit' }">{{ row.leftover }}</span>
          </template>
        </el-table-column>
        <el-table-column label="建议" min-width="180">
          <template #default="{ row }">
            <span class="muted">{{ suggestion(row) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!feedback.length" description="近 7 天暂无配送数据" :image-size="60" />
    </div>

    <el-dialog v-model="editVisible" title="调整排餐" width="480px">
      <el-form label-width="90px">
        <el-form-item label="菜品">
          <el-select v-model="editForm.dishId" style="width: 100%">
            <el-option v-for="d in dishOptions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="份数">
          <el-input-number v-model="editForm.plannedPortions" :min="1" :max="200" />
        </el-form-item>
        <el-form-item label="打包时间">
          <el-time-picker v-model="editForm.packingTime" format="HH:mm" value-format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="保温要求">
          <el-input v-model="editForm.insulationRequirement" placeholder="如：保温箱≥60℃" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.note" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { kitchenApi, dishesApi } from '../../api'
import { MEAL_TYPE, SCHEDULE_STATUS, today } from '../../utils/dict'

const date = ref(today())
const schedules = ref([])
const eligible = ref(null)
const feedback = ref([])
const dishes = ref([])
const loading = ref(false)
const editVisible = ref(false)
const editForm = ref({})

const confirmedCount = computed(() => schedules.value.filter((s) => s.status === 'CONFIRMED').length)
const dishOptions = computed(() => dishes.value.filter((d) => d.mealType === editForm.value.mealType && d.active))

function suggestion(row) {
  if (row.refused >= 2) return '拒收较多，建议更换菜品或调整口味'
  if (row.leftover >= 2) return '剩餐较多，建议减少单份份量'
  if (row.spilled >= 1) return '有洒漏，检查打包与保温箱固定'
  return '反馈正常'
}

async function load() {
  loading.value = true
  try {
    ;[schedules.value, eligible.value] = await Promise.all([
      kitchenApi.schedules(date.value),
      kitchenApi.eligible(date.value),
    ])
    const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    feedback.value = await kitchenApi.feedback(from, date.value)
  } finally {
    loading.value = false
  }
}

async function generate() {
  try {
    await kitchenApi.generate(date.value)
    ElMessage.success('已按营养建议生成排餐草稿')
    load()
  } catch (e) { /* 拦截器已提示 */ }
}

function openEdit(row) {
  editForm.value = { ...row, dishId: row.dishId }
  editVisible.value = true
}

async function saveEdit() {
  await kitchenApi.updateSchedule(editForm.value.id, {
    dishId: editForm.value.dishId,
    plannedPortions: editForm.value.plannedPortions,
    packingTime: editForm.value.packingTime,
    insulationRequirement: editForm.value.insulationRequirement,
    note: editForm.value.note,
  })
  ElMessage.success('已保存')
  editVisible.value = false
  load()
}

async function confirm(row) {
  await kitchenApi.confirm(row.id)
  ElMessage.success(`已确认 ${MEAL_TYPE[row.mealType]?.label}`)
  load()
}

async function remove(row) {
  await ElMessageBox.confirm('确认删除该排餐草稿？', '提示', { type: 'warning' })
  await kitchenApi.remove(row.id)
  load()
}

async function dispatch() {
  await ElMessageBox.confirm(
    `将根据 ${date.value} 已确认的排餐生成配送路线与任务（连续未签收≥2次的老人会排入电话确认路线，观察期老人安排熟悉情况的志愿者）。确认生成？`,
    '生成配送任务',
    { type: 'warning' },
  )
  try {
    const routes = await kitchenApi.dispatch(date.value)
    ElMessage.success(`已生成 ${routes.length} 条配送路线，志愿者可接单`)
    load()
  } catch (e) { /* 拦截器已提示 */ }
}

onMounted(async () => {
  dishes.value = await dishesApi.list({ all: '1' })
  load()
})
</script>
