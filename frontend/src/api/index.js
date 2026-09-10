import http from './http'

export const authApi = {
  login: (data) => http.post('/auth/login', data),
  profile: () => http.get('/auth/profile'),
}

export const statsApi = {
  overview: () => http.get('/stats/overview'),
  trend: (days = 7) => http.get('/stats/delivery-trend', { params: { days } }),
}

export const eldersApi = {
  list: (params) => http.get('/elders', { params }),
  detail: (id) => http.get(`/elders/${id}`),
  create: (data) => http.post('/elders', data),
  update: (id, data) => http.patch(`/elders/${id}`, data),
  changeStatus: (id, data) => http.patch(`/elders/${id}/status`, data),
}

export const nutritionApi = {
  list: (params) => http.get('/nutrition/advices', { params }),
  create: (data) => http.post('/nutrition/advices', data),
  update: (id, data) => http.patch(`/nutrition/advices/${id}`, data),
}

export const dishesApi = {
  list: (params) => http.get('/dishes', { params }),
  create: (data) => http.post('/dishes', data),
  update: (id, data) => http.patch(`/dishes/${id}`, data),
}

export const kitchenApi = {
  eligible: (date) => http.get('/kitchen/eligible', { params: { date } }),
  schedules: (date) => http.get('/kitchen/schedules', { params: { date } }),
  generate: (date) => http.post('/kitchen/schedules/generate', { date }),
  createSchedule: (data) => http.post('/kitchen/schedules', data),
  updateSchedule: (id, data) => http.patch(`/kitchen/schedules/${id}`, data),
  confirm: (id) => http.post(`/kitchen/schedules/${id}/confirm`),
  remove: (id) => http.delete(`/kitchen/schedules/${id}`),
  dispatch: (date) => http.post('/kitchen/dispatch', { date }),
  feedback: (from, to) => http.get('/kitchen/feedback', { params: { from, to } }),
}

export const deliveryApi = {
  routes: (date) => http.get('/delivery/routes', { params: { date } }),
  routeDetail: (id) => http.get(`/delivery/routes/${id}`),
  accept: (id) => http.post(`/delivery/routes/${id}/accept`),
  start: (id) => http.post(`/delivery/routes/${id}/start`),
  deliver: (id, data) => http.post(`/delivery/tasks/${id}/deliver`, data),
  reportException: (id, data) => http.post(`/delivery/tasks/${id}/exception`, data),
}

export const exceptionsApi = {
  list: (params) => http.get('/exceptions', { params }),
  claim: (id) => http.post(`/exceptions/${id}/claim`),
  resolve: (id, data) => http.post(`/exceptions/${id}/resolve`, data),
}

export const settlementsApi = {
  list: (params) => http.get('/settlements', { params }),
  generate: (period) => http.post('/settlements/generate', { period }),
  settle: (id) => http.post(`/settlements/${id}/settle`),
}

export const hospitalApi = {
  myElders: () => http.get('/hospital/my-elders'),
  records: (params) => http.get('/hospital/records', { params }),
  recordDetail: (id) => http.get(`/hospital/records/${id}`),
  admit: (data) => http.post('/hospital/admit', data),
  discharge: (id, data) => http.post(`/hospital/records/${id}/discharge`, data),
  resume: (id, data) => http.post(`/hospital/records/${id}/resume`, data),
  disposals: (params) => http.get('/hospital/disposals', { params }),
  candidates: (id) => http.get(`/hospital/disposals/${id}/candidates`),
  handle: (id, data) => http.post(`/hospital/disposals/${id}/handle`, data),
  backupList: () => http.get('/hospital/backup-list'),
  losses: () => http.get('/hospital/losses'),
}

export const usersApi = {
  list: (params) => http.get('/users', { params }),
  create: (data) => http.post('/users', data),
  update: (id, data) => http.patch(`/users/${id}`, data),
}
