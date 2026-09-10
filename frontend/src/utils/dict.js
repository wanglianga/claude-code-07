// 枚举 → 中文标签 / 标签类型 映射
export const ROLE_NAMES = {
  ADMIN: '管理员',
  COMMUNITY_WORKER: '社区工作人员',
  NUTRITIONIST: '营养师',
  KITCHEN_STAFF: '厨房人员',
  VOLUNTEER: '志愿者',
  FAMILY: '家属',
}

export const ELDER_STATUS = {
  NORMAL: { label: '正常', type: 'success' },
  OBSERVING: { label: '观察', type: 'warning' },
  PAUSED: { label: '暂停', type: 'info' },
  HOSPITALIZED: { label: '住院', type: 'danger' },
  VISIT_NEEDED: { label: '需上门探访', type: 'warning' },
  DISCHARGE_PENDING: { label: '出院待确认', type: 'warning' },
}

// 住院联动
export const HOSPITAL_STATUS = {
  HOSPITALIZED: { label: '住院中', type: 'danger' },
  DISCHARGE_PENDING: { label: '出院待确认', type: 'warning' },
  RESUMED: { label: '已恢复送餐', type: 'success' },
}

export const MARK_CHANNEL = {
  FAMILY: '家属标记',
  WORKER: '社区标记',
}

export const DISPOSAL_STAGE = {
  NOT_PREPARED: { label: '未备餐', type: 'info' },
  PREPARED: { label: '已备餐未出库', type: 'warning' },
  DISPATCHED: { label: '已出库', type: 'danger' },
}

export const DISPOSAL_ACTION = {
  CANCELLED: { label: '直接取消', type: 'info' },
  TRANSFER_BACKUP: { label: '转备用名单', type: 'success' },
  RETURN_KITCHEN: { label: '退回厨房', type: 'warning' },
  TRANSFER_NEIGHBOR: { label: '转交同楼栋老人', type: 'success' },
  DISCARD: { label: '报损', type: 'danger' },
}

export const DISPOSAL_STATUS = {
  PENDING: { label: '待志愿者处置', type: 'danger' },
  DONE: { label: '已处置', type: 'success' },
}

export const CHEWING = {
  NORMAL: '正常咀嚼',
  SOFT: '需软烂',
  LIQUID: '流食',
}

export const SUBSIDY = {
  NONE: { label: '无补贴', type: 'info' },
  PARTIAL: { label: '部分补贴', type: 'warning' },
  FULL: { label: '全额补贴', type: 'success' },
}

export const MEAL_TYPE = {
  NORMAL: { label: '普通餐', type: 'primary' },
  SOFT: { label: '软烂餐', type: 'success' },
  LOW_SALT_SUGAR: { label: '低盐低糖餐', type: 'warning' },
  STOPPED: { label: '临时停餐', type: 'info' },
}

export const SCHEDULE_STATUS = {
  DRAFT: { label: '草稿', type: 'info' },
  CONFIRMED: { label: '已确认', type: 'primary' },
  DISPATCHED: { label: '已派单', type: 'warning' },
  COMPLETED: { label: '已完成', type: 'success' },
}

export const ROUTE_STATUS = {
  OPEN: { label: '待接单', type: 'info' },
  ACCEPTED: { label: '已接单', type: 'primary' },
  IN_PROGRESS: { label: '配送中', type: 'warning' },
  COMPLETED: { label: '已完成', type: 'success' },
}

export const ROUTE_TYPE = {
  NORMAL: '普通路线',
  PHONE_CONFIRM: '电话确认路线',
  EXPERIENCED: '需熟悉情况志愿者',
}

export const TASK_STATUS = {
  PENDING: { label: '待配送', type: 'info' },
  DELIVERED: { label: '已送达', type: 'success' },
  EXCEPTION: { label: '异常', type: 'danger' },
  CANCELLED: { label: '已取消', type: 'info' },
}

export const SIGN_METHOD = {
  SELF: '本人签收',
  FAMILY: '家属代收',
  NEIGHBOR: '邻居代收',
}

export const ELDER_CONDITION = {
  GOOD: '良好',
  FAIR: '一般',
  POOR: '较差',
}

export const EXCEPTION_TYPE = {
  NOT_HOME: '老人不在家',
  NEIGHBOR_RECEIVED: '邻居代收',
  SPILLED: '餐食洒漏',
  REFUSED: '老人拒收',
  FAMILY_CHANGE: '家属临时改餐',
  HEALTH_ABNORMAL: '老人身体异常',
}

export const EXCEPTION_STATUS = {
  PENDING: { label: '待处理', type: 'danger' },
  PROCESSING: { label: '处理中', type: 'warning' },
  RESOLVED: { label: '已办结', type: 'success' },
}

export const SETTLEMENT_STATUS = {
  PENDING: { label: '待结算', type: 'warning' },
  SETTLED: { label: '已结算', type: 'success' },
}

export const CHRONIC_OPTIONS = ['高血压', '糖尿病', '冠心病', '慢阻肺', '关节炎', '骨质疏松', '高血脂', '肾病']
export const RESTRICTION_OPTIONS = ['辛辣', '油腻', '甜食', '腌制食品', '生冷', '牛羊肉']
export const ALLERGY_OPTIONS = ['海鲜', '花生', '鸡蛋', '牛奶', '大豆', '鱼', '虾']

export function fmtDateTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
