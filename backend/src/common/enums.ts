export enum UserRole {
  ADMIN = 'ADMIN',
  COMMUNITY_WORKER = 'COMMUNITY_WORKER',
  NUTRITIONIST = 'NUTRITIONIST',
  KITCHEN_STAFF = 'KITCHEN_STAFF',
  VOLUNTEER = 'VOLUNTEER',
  FAMILY = 'FAMILY', // 家属（可标记自家老人住院/出院）
}

export enum ElderStatus {
  NORMAL = 'NORMAL', // 正常
  OBSERVING = 'OBSERVING', // 观察
  PAUSED = 'PAUSED', // 暂停
  HOSPITALIZED = 'HOSPITALIZED', // 住院
  VISIT_NEEDED = 'VISIT_NEEDED', // 需上门探访
  DISCHARGE_PENDING = 'DISCHARGE_PENDING', // 出院待确认（需社区重新确认禁忌与地址后才恢复排餐）
}

/** 参与排餐的长者状态（暂停/住院/出院待确认不排餐） */
export const MEAL_ELIGIBLE_STATUSES: ElderStatus[] = [
  ElderStatus.NORMAL,
  ElderStatus.OBSERVING,
  ElderStatus.VISIT_NEEDED,
];

/** 住院记录状态 */
export enum HospitalRecordStatus {
  HOSPITALIZED = 'HOSPITALIZED', // 住院中（已停餐）
  DISCHARGE_PENDING = 'DISCHARGE_PENDING', // 已出院，待社区重新确认后恢复
  RESUMED = 'RESUMED', // 已恢复送餐
}

/** 标记渠道 */
export enum MarkChannel {
  FAMILY = 'FAMILY', // 家属标记
  WORKER = 'WORKER', // 社区工作人员/平台标记
}

/** 住院当日餐所处阶段（决定处置方式） */
export enum DisposalStage {
  NOT_PREPARED = 'NOT_PREPARED', // 未备餐（排餐未确认）→ 直接取消
  PREPARED = 'PREPARED', // 已备餐但未交给志愿者 → 转备用名单或损耗
  DISPATCHED = 'DISPATCHED', // 已出库交给志愿者 → 志愿者处置
}

/** 住院当日餐处置方式 */
export enum DisposalAction {
  CANCELLED = 'CANCELLED', // 未备餐，直接取消（无损耗）
  TRANSFER_BACKUP = 'TRANSFER_BACKUP', // 已备餐，转备用名单老人
  RETURN_KITCHEN = 'RETURN_KITCHEN', // 已出库，退回厨房（损耗）
  TRANSFER_NEIGHBOR = 'TRANSFER_NEIGHBOR', // 已出库，转交同楼栋老人（计入其送达）
  DISCARD = 'DISCARD', // 已出库，报损（损耗）
}

/** 处置单状态 */
export enum DisposalStatus {
  PENDING = 'PENDING', // 待志愿者处置
  DONE = 'DONE', // 已处置
}

export enum ChewingAbility {
  NORMAL = 'NORMAL', // 正常咀嚼
  SOFT = 'SOFT', // 需软烂
  LIQUID = 'LIQUID', // 流食
}

export enum SubsidyLevel {
  NONE = 'NONE', // 无补贴
  PARTIAL = 'PARTIAL', // 部分补贴
  FULL = 'FULL', // 全额补贴
}

export enum MealType {
  NORMAL = 'NORMAL', // 普通餐
  SOFT = 'SOFT', // 软烂餐
  LOW_SALT_SUGAR = 'LOW_SALT_SUGAR', // 低盐低糖餐
  STOPPED = 'STOPPED', // 临时停餐
}

export enum ScheduleStatus {
  DRAFT = 'DRAFT', // 草稿
  CONFIRMED = 'CONFIRMED', // 已确认
  DISPATCHED = 'DISPATCHED', // 已派单
  COMPLETED = 'COMPLETED', // 已完成
}

export enum RouteStatus {
  OPEN = 'OPEN', // 待接单
  ACCEPTED = 'ACCEPTED', // 已接单
  IN_PROGRESS = 'IN_PROGRESS', // 配送中
  COMPLETED = 'COMPLETED', // 已完成
}

export enum RouteType {
  NORMAL = 'NORMAL', // 普通路线
  PHONE_CONFIRM = 'PHONE_CONFIRM', // 电话确认路线（连续无人签收）
  EXPERIENCED = 'EXPERIENCED', // 需熟悉情况的志愿者/助老员
}

export enum TaskStatus {
  PENDING = 'PENDING', // 待配送
  DELIVERED = 'DELIVERED', // 已送达
  EXCEPTION = 'EXCEPTION', // 异常
  CANCELLED = 'CANCELLED', // 已取消
}

export enum SignMethod {
  SELF = 'SELF', // 本人签收
  FAMILY = 'FAMILY', // 家属代收
  NEIGHBOR = 'NEIGHBOR', // 邻居代收
}

export enum ElderCondition {
  GOOD = 'GOOD', // 良好
  FAIR = 'FAIR', // 一般
  POOR = 'POOR', // 较差（自动触发健康异常）
}

export enum ExceptionType {
  NOT_HOME = 'NOT_HOME', // 老人不在家
  NEIGHBOR_RECEIVED = 'NEIGHBOR_RECEIVED', // 邻居代收
  SPILLED = 'SPILLED', // 餐食洒漏
  REFUSED = 'REFUSED', // 老人拒收
  FAMILY_CHANGE = 'FAMILY_CHANGE', // 家属临时要求改餐
  HEALTH_ABNORMAL = 'HEALTH_ABNORMAL', // 老人身体异常
}

export enum ExceptionStatus {
  PENDING = 'PENDING', // 待处理
  PROCESSING = 'PROCESSING', // 处理中
  RESOLVED = 'RESOLVED', // 已办结
}

export enum SettlementStatus {
  PENDING = 'PENDING', // 待结算
  SETTLED = 'SETTLED', // 已结算
}

/** 补贴单价（元/餐） */
export const SUBSIDY_UNIT_PRICE: Record<SubsidyLevel, number> = {
  [SubsidyLevel.NONE]: 0,
  [SubsidyLevel.PARTIAL]: 6,
  [SubsidyLevel.FULL]: 12,
};

/** 餐型编号前缀（餐盒编号用） */
export const MEAL_TYPE_PREFIX: Record<MealType, string> = {
  [MealType.NORMAL]: 'PT',
  [MealType.SOFT]: 'RL',
  [MealType.LOW_SALT_SUGAR]: 'DY',
  [MealType.STOPPED]: 'TZ',
};
