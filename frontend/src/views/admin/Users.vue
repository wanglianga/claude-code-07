<template>
  <div class="page">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" icon="Plus" @click="openForm()">新增用户</el-button>
    </div>
    <div class="card">
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="name" label="姓名" width="140" />
        <el-table-column label="角色" width="130">
          <template #default="{ row }">
            <el-tag size="small">{{ ROLE_NAMES[row.role] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.active ? 'success' : 'info'">{{ row.active ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ fmtDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link :type="row.active ? 'danger' : 'success'" @click="toggle(row)">{{ row.active ? '停用' : '启用' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑用户' : '新增用户'" width="440px">
      <el-form label-width="90px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option v-for="(v, k) in ROLE_NAMES" :key="k" :label="v" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item :label="form.id ? '重置密码' : '密码'" required>
          <el-input v-model="form.password" type="password" show-password :placeholder="form.id ? '留空则不修改' : '至少6位'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usersApi } from '../../api'
import { ROLE_NAMES, fmtDateTime } from '../../utils/dict'

const list = ref([])
const loading = ref(false)
const visible = ref(false)
const saving = ref(false)
const form = ref({})

async function load() {
  loading.value = true
  try {
    list.value = await usersApi.list()
  } finally {
    loading.value = false
  }
}

function openForm(row) {
  form.value = row
    ? { ...row, password: '' }
    : { id: null, username: '', name: '', role: 'VOLUNTEER', phone: '', password: '' }
  visible.value = true
}

async function save() {
  if (!form.value.username || !form.value.name) {
    ElMessage.warning('请填写用户名和姓名')
    return
  }
  if (!form.value.id && (!form.value.password || form.value.password.length < 6)) {
    ElMessage.warning('密码至少6位')
    return
  }
  saving.value = true
  try {
    const { id, ...data } = form.value
    if (!data.password) delete data.password
    if (id) await usersApi.update(id, data)
    else await usersApi.create(data)
    ElMessage.success('已保存')
    visible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function toggle(row) {
  await usersApi.update(row.id, { active: !row.active })
  load()
}

onMounted(load)
</script>
