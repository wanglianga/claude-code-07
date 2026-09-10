<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="logo">🍱</div>
        <h1>共享厨房长者配餐平台</h1>
        <p>社区长者配餐 · 志愿者送餐 · 异常闭环 · 补贴结算</p>
      </div>
      <el-form :model="form" @keyup.enter="submit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
      <el-divider content-position="left">演示账号（密码均为 123456，管理员 admin123）</el-divider>
      <div class="accounts">
        <el-tag v-for="a in accounts" :key="a.u" class="acc" @click="fill(a.u, a.p)">{{ a.label }} {{ a.u }}</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ username: '', password: '' })
const loading = ref(false)

const accounts = [
  { label: '管理员', u: 'admin', p: 'admin123' },
  { label: '社区', u: 'worker01', p: '123456' },
  { label: '营养师', u: 'nutrition01', p: '123456' },
  { label: '厨房', u: 'kitchen01', p: '123456' },
  { label: '志愿者', u: 'volunteer01', p: '123456' },
]

function fill(u, p) {
  form.value = { username: u, password: p }
}

async function submit() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(form.value.username, form.value.password)
    ElMessage.success(`欢迎，${auth.user.name}`)
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%);
}
.login-card {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 36px 40px 28px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}
.brand { text-align: center; margin-bottom: 24px; }
.logo { font-size: 44px; }
.brand h1 { font-size: 20px; margin: 8px 0 4px; color: #303133; }
.brand p { font-size: 12px; color: #909399; margin: 0; }
.accounts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.acc { cursor: pointer; }
</style>
