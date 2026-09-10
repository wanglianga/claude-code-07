<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="logo" @click="$router.push('/dashboard')">
        <span class="emoji">🍱</span>
        <span v-if="!collapsed" class="title">长者配餐平台</span>
      </div>
      <el-menu :default-active="$route.path" :collapse="collapsed" router class="menu">
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="left">
          <el-icon class="fold" @click="collapsed = !collapsed"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          <span class="page-title">{{ $route.meta.title || '工作台' }}</span>
        </div>
        <div class="right">
          <el-tag size="small" effect="plain">{{ roleName }}</el-tag>
          <el-dropdown @command="onCommand">
            <span class="user">
              <el-icon><Avatar /></el-icon>{{ auth.user?.name }}
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ROLE_NAMES } from '../utils/dict'

const router = useRouter()
const auth = useAuthStore()
const collapsed = ref(false)
const roleName = computed(() => ROLE_NAMES[auth.user?.role] || '')

const ALL_MENUS = [
  { path: '/dashboard', title: '工作台', icon: 'Odometer', roles: ['ADMIN', 'COMMUNITY_WORKER', 'NUTRITIONIST', 'KITCHEN_STAFF', 'VOLUNTEER'] },
  { path: '/elders', title: '长者档案', icon: 'UserFilled', roles: ['ADMIN', 'COMMUNITY_WORKER', 'NUTRITIONIST', 'KITCHEN_STAFF'] },
  { path: '/hospital', title: '住院管理', icon: 'FirstAidKit', roles: ['ADMIN', 'COMMUNITY_WORKER', 'KITCHEN_STAFF', 'VOLUNTEER', 'FAMILY'] },
  { path: '/nutrition', title: '营养建议', icon: 'Apple', roles: ['ADMIN', 'NUTRITIONIST'] },
  { path: '/kitchen', title: '厨房排餐', icon: 'Food', roles: ['ADMIN', 'KITCHEN_STAFF'] },
  { path: '/dishes', title: '菜品管理', icon: 'Dish', roles: ['ADMIN', 'KITCHEN_STAFF'] },
  { path: '/delivery', title: '配送路线', icon: 'Van', roles: ['ADMIN', 'COMMUNITY_WORKER', 'KITCHEN_STAFF', 'VOLUNTEER'] },
  { path: '/exceptions', title: '异常工单', icon: 'Warning', roles: ['ADMIN', 'COMMUNITY_WORKER', 'VOLUNTEER'] },
  { path: '/settlements', title: '补贴结算', icon: 'Money', roles: ['ADMIN', 'COMMUNITY_WORKER'] },
  { path: '/users', title: '用户管理', icon: 'Setting', roles: ['ADMIN'] },
]

const menus = computed(() =>
  ALL_MENUS.filter((m) => !m.roles || m.roles.includes(auth.user?.role)),
)

function onCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout { height: 100vh; }
.aside {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.2s;
  overflow: hidden;
}
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.logo .emoji { font-size: 24px; }
.logo .title { font-weight: 600; color: #303133; }
.menu { border-right: none; }
.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}
.left { display: flex; align-items: center; gap: 12px; }
.fold { cursor: pointer; font-size: 18px; color: #606266; }
.page-title { font-weight: 600; color: #303133; }
.right { display: flex; align-items: center; gap: 12px; }
.user { display: flex; align-items: center; gap: 6px; cursor: pointer; color: #303133; }
.main { background: #f5f7fa; padding: 0; overflow-y: auto; }
</style>
