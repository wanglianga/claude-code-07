<template>
  <div class="page">
    <div class="page-header">
      <h2>菜品管理</h2>
      <el-button type="primary" icon="Plus" @click="openForm()">新增菜品</el-button>
    </div>
    <div class="card">
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="name" label="菜品名称" min-width="180" />
        <el-table-column label="餐型" width="130">
          <template #default="{ row }">
            <el-tag :type="MEAL_TYPE[row.mealType]?.type">{{ MEAL_TYPE[row.mealType]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="过敏原" min-width="140">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="a in row.allergens || []" :key="a" size="small" type="danger" effect="plain">{{ a }}</el-tag>
              <span v-if="!(row.allergens || []).length" class="muted">无</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.active ? 'success' : 'info'">{{ row.active ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link :type="row.active ? 'danger' : 'success'" @click="toggle(row)">
              {{ row.active ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑菜品' : '新增菜品'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="餐型">
          <el-select v-model="form.mealType" style="width: 100%">
            <el-option v-for="(v, k) in MEAL_TYPE" :key="k" :label="v.label" :value="k" :disabled="k === 'STOPPED'" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="过敏原">
          <el-select v-model="form.allergens" multiple filterable allow-create default-first-option style="width: 100%">
            <el-option v-for="o in ALLERGY_OPTIONS" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { dishesApi } from '../../api'
import { MEAL_TYPE, ALLERGY_OPTIONS } from '../../utils/dict'

const list = ref([])
const loading = ref(false)
const visible = ref(false)
const form = ref({})

async function load() {
  loading.value = true
  try {
    list.value = await dishesApi.list({ all: '1' })
  } finally {
    loading.value = false
  }
}

function openForm(row) {
  form.value = row ? { ...row } : { id: null, name: '', mealType: 'NORMAL', description: '', allergens: [] }
  visible.value = true
}

async function save() {
  if (!form.value.name) {
    ElMessage.warning('请填写菜品名称')
    return
  }
  const { id, ...data } = form.value
  if (id) await dishesApi.update(id, data)
  else await dishesApi.create(data)
  ElMessage.success('已保存')
  visible.value = false
  load()
}

async function toggle(row) {
  await dishesApi.update(row.id, { active: !row.active })
  load()
}

onMounted(load)
</script>
