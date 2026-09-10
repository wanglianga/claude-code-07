import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '工作台' } },
      { path: 'elders', name: 'elders', component: () => import('../views/elders/ElderList.vue'), meta: { title: '长者档案', roles: ['ADMIN', 'COMMUNITY_WORKER', 'NUTRITIONIST', 'KITCHEN_STAFF'] } },
      { path: 'elders/:id', name: 'elder-detail', component: () => import('../views/elders/ElderDetail.vue'), meta: { title: '档案详情', roles: ['ADMIN', 'COMMUNITY_WORKER', 'NUTRITIONIST', 'KITCHEN_STAFF'] } },
      { path: 'hospital', name: 'hospital', component: () => import('../views/hospital/HospitalList.vue'), meta: { title: '住院管理', roles: ['ADMIN', 'COMMUNITY_WORKER', 'KITCHEN_STAFF', 'VOLUNTEER', 'FAMILY'] } },
      { path: 'nutrition', name: 'nutrition', component: () => import('../views/nutrition/AdviceList.vue'), meta: { title: '营养建议', roles: ['ADMIN', 'NUTRITIONIST'] } },
      { path: 'kitchen', name: 'kitchen', component: () => import('../views/kitchen/Schedules.vue'), meta: { title: '厨房排餐', roles: ['ADMIN', 'KITCHEN_STAFF'] } },
      { path: 'dishes', name: 'dishes', component: () => import('../views/kitchen/Dishes.vue'), meta: { title: '菜品管理', roles: ['ADMIN', 'KITCHEN_STAFF'] } },
      { path: 'delivery', name: 'delivery', component: () => import('../views/delivery/Routes.vue'), meta: { title: '配送路线', roles: ['ADMIN', 'COMMUNITY_WORKER', 'KITCHEN_STAFF', 'VOLUNTEER'] } },
      { path: 'delivery/routes/:id', name: 'route-detail', component: () => import('../views/delivery/RouteDetail.vue'), meta: { title: '路线详情', roles: ['ADMIN', 'COMMUNITY_WORKER', 'KITCHEN_STAFF', 'VOLUNTEER'] } },
      { path: 'exceptions', name: 'exceptions', component: () => import('../views/exceptions/ExceptionList.vue'), meta: { title: '异常工单', roles: ['ADMIN', 'COMMUNITY_WORKER', 'VOLUNTEER'] } },
      { path: 'settlements', name: 'settlements', component: () => import('../views/settlements/SettlementList.vue'), meta: { title: '补贴结算', roles: ['ADMIN', 'COMMUNITY_WORKER'] } },
      { path: 'users', name: 'users', component: () => import('../views/admin/Users.vue'), meta: { title: '用户管理', roles: ['ADMIN'] } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) return '/login'
  if (to.path === '/login' && token) return '/'
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  // 家属只有住院管理一个入口
  if (user?.role === 'FAMILY' && to.path !== '/hospital') return '/hospital'
  if (to.meta?.roles) {
    if (!user || !to.meta.roles.includes(user.role)) return '/dashboard'
  }
  document.title = `${to.meta?.title ? to.meta.title + ' - ' : ''}共享厨房长者配餐平台`
})

export default router
