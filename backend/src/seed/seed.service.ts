import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Elder } from '../entities/elder.entity';
import { ElderStatusLog } from '../entities/elder-status-log.entity';
import { NutritionAdvice } from '../entities/nutrition-advice.entity';
import { Dish } from '../entities/dish.entity';
import { MealSchedule } from '../entities/meal-schedule.entity';
import { DeliveryRoute } from '../entities/delivery-route.entity';
import { DeliveryTask } from '../entities/delivery-task.entity';
import { DeliveryException } from '../entities/delivery-exception.entity';
import { HospitalRecord } from '../entities/hospital-record.entity';
import {
  UserRole,
  ElderStatus,
  ChewingAbility,
  SubsidyLevel,
  MealType,
  ScheduleStatus,
  RouteStatus,
  RouteType,
  TaskStatus,
  SignMethod,
  ElderCondition,
  ExceptionType,
  ExceptionStatus,
  HospitalRecordStatus,
  MarkChannel,
} from '../common/enums';

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
    @InjectRepository(ElderStatusLog) private logRepo: Repository<ElderStatusLog>,
    @InjectRepository(NutritionAdvice) private adviceRepo: Repository<NutritionAdvice>,
    @InjectRepository(Dish) private dishRepo: Repository<Dish>,
    @InjectRepository(MealSchedule) private scheduleRepo: Repository<MealSchedule>,
    @InjectRepository(DeliveryRoute) private routeRepo: Repository<DeliveryRoute>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
    @InjectRepository(DeliveryException) private exceptionRepo: Repository<DeliveryException>,
    @InjectRepository(HospitalRecord) private recordRepo: Repository<HospitalRecord>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.userRepo.count();
    if (count > 0) return;
    this.logger.log('数据库为空，开始初始化演示数据...');
    await this.seed();
    this.logger.log('演示数据初始化完成');
  }

  private async seed() {
    // ---------- 用户 ----------
    const hash = (p: string) => bcrypt.hashSync(p, 10);
    const [admin, worker, nutritionist, kitchen, vol1, vol2, family1, family2] =
      await this.userRepo.save([
        this.userRepo.create({ username: 'admin', passwordHash: hash('admin123'), name: '平台管理员', phone: '13800000001', role: UserRole.ADMIN }),
        this.userRepo.create({ username: 'worker01', passwordHash: hash('123456'), name: '王慧（社区）', phone: '13800000002', role: UserRole.COMMUNITY_WORKER }),
        this.userRepo.create({ username: 'nutrition01', passwordHash: hash('123456'), name: '李营养师', phone: '13800000003', role: UserRole.NUTRITIONIST }),
        this.userRepo.create({ username: 'kitchen01', passwordHash: hash('123456'), name: '张师傅（厨房）', phone: '13800000004', role: UserRole.KITCHEN_STAFF }),
        this.userRepo.create({ username: 'volunteer01', passwordHash: hash('123456'), name: '赵志愿', phone: '13800000005', role: UserRole.VOLUNTEER }),
        this.userRepo.create({ username: 'volunteer02', passwordHash: hash('123456'), name: '钱志愿', phone: '13800000006', role: UserRole.VOLUNTEER }),
        this.userRepo.create({ username: 'family01', passwordHash: hash('123456'), name: '张强（张桂兰之子）', phone: '13911111001', role: UserRole.FAMILY }),
        this.userRepo.create({ username: 'family02', passwordHash: hash('123456'), name: '李敏（李建国之女）', phone: '13911111002', role: UserRole.FAMILY }),
      ]);

    // ---------- 菜品 ----------
    const dishes = await this.dishRepo.save([
      this.dishRepo.create({ name: '红烧狮子头套餐', mealType: MealType.NORMAL, description: '狮子头+时蔬+米饭+例汤', allergens: ['鸡蛋'] }),
      this.dishRepo.create({ name: '香菇滑鸡套餐', mealType: MealType.NORMAL, description: '香菇滑鸡+青菜+米饭', allergens: [] }),
      this.dishRepo.create({ name: '清蒸鲈鱼套餐', mealType: MealType.NORMAL, description: '清蒸鲈鱼+时蔬+米饭', allergens: ['鱼'] }),
      this.dishRepo.create({ name: '南瓜小米粥+蒸蛋羹', mealType: MealType.SOFT, description: '软烂易消化，适合咀嚼困难老人', allergens: ['鸡蛋'] }),
      this.dishRepo.create({ name: '软烂红烧肉炖土豆', mealType: MealType.SOFT, description: '炖至软烂，少油', allergens: [] }),
      this.dishRepo.create({ name: '鱼肉豆腐羹套餐', mealType: MealType.SOFT, description: '无刺鱼肉+嫩豆腐', allergens: ['鱼', '大豆'] }),
      this.dishRepo.create({ name: '清蒸鸡胸肉时蔬套餐', mealType: MealType.LOW_SALT_SUGAR, description: '低盐低糖，控糖控压', allergens: [] }),
      this.dishRepo.create({ name: '冬瓜薏仁汤套餐', mealType: MealType.LOW_SALT_SUGAR, description: '清淡利水，低盐', allergens: [] }),
    ]);
    const dishOf = (t: MealType) => dishes.find((d) => d.mealType === t);

    // ---------- 长者档案 ----------
    const elderData: Partial<Elder>[] = [
      { name: '张桂兰', gender: 'FEMALE', birthDate: '1943-03-12', phone: '13911110001', address: '朝阳社区幸福里小区3栋2单元501', building: '3栋', chronicDiseases: ['高血压', '糖尿病'], chewingAbility: ChewingAbility.SOFT, dietaryRestrictions: ['辛辣'], allergies: ['海鲜'], emergencyContactName: '张强', emergencyContactPhone: '13911111001', emergencyContactRelation: '儿子', subsidyLevel: SubsidyLevel.FULL, status: ElderStatus.NORMAL, deliveryNote: '敲门请大声，老人耳背；放门口保温袋需电话告知' },
      { name: '李建国', gender: 'MALE', birthDate: '1947-07-08', phone: '13911110002', address: '朝阳社区幸福里小区5栋1单元302', building: '5栋', chronicDiseases: ['高血压'], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: ['油腻'], allergies: [], emergencyContactName: '李敏', emergencyContactPhone: '13911111002', emergencyContactRelation: '女儿', subsidyLevel: SubsidyLevel.PARTIAL, status: ElderStatus.NORMAL, deliveryNote: '中午12点前送达，老人要午休' },
      { name: '王秀珍', gender: 'FEMALE', birthDate: '1950-01-25', phone: '13911110003', address: '朝阳社区康宁巷12号院2门401', building: '12号院2门', chronicDiseases: ['糖尿病'], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: ['甜食'], allergies: ['花生'], emergencyContactName: '王军', emergencyContactPhone: '13911111003', emergencyContactRelation: '儿子', subsidyLevel: SubsidyLevel.PARTIAL, status: ElderStatus.NORMAL, deliveryNote: '' },
      { name: '刘德海', gender: 'MALE', birthDate: '1940-11-02', phone: '13911110004', address: '朝阳社区康宁巷8号院1门102', building: '8号院1门', chronicDiseases: ['冠心病', '关节炎'], chewingAbility: ChewingAbility.SOFT, dietaryRestrictions: [], allergies: [], emergencyContactName: '刘洋', emergencyContactPhone: '13911111004', emergencyContactRelation: '孙子', subsidyLevel: SubsidyLevel.FULL, status: ElderStatus.OBSERVING, statusNote: '上周送餐时发现行动迟缓，社区观察中', deliveryNote: '行动不便，请等待老人开门，勿放门口' },
      { name: '陈淑芬', gender: 'FEMALE', birthDate: '1945-05-19', phone: '13911110005', address: '朝阳社区幸福里小区1栋3单元201', building: '1栋', chronicDiseases: [], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: [], allergies: [], emergencyContactName: '陈丽', emergencyContactPhone: '13911111005', emergencyContactRelation: '女儿', subsidyLevel: SubsidyLevel.NONE, status: ElderStatus.NORMAL, deliveryNote: '' },
      { name: '周福生', gender: 'MALE', birthDate: '1942-09-30', phone: '13911110006', address: '朝阳社区康宁巷3号院4门502', building: '3号院4门', chronicDiseases: ['慢阻肺'], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: [], allergies: [], emergencyContactName: '周涛', emergencyContactPhone: '13911111006', emergencyContactRelation: '儿子', subsidyLevel: SubsidyLevel.FULL, status: ElderStatus.HOSPITALIZED, statusNote: '9月5日因慢阻肺急性加重住院，暂停送餐', deliveryNote: '' },
      { name: '吴玉梅', gender: 'FEMALE', birthDate: '1946-12-14', phone: '13911110007', address: '朝阳社区幸福里小区7栋2单元101', building: '7栋', chronicDiseases: ['骨质疏松'], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: [], allergies: [], emergencyContactName: '吴刚', emergencyContactPhone: '13911111007', emergencyContactRelation: '儿子', subsidyLevel: SubsidyLevel.PARTIAL, status: ElderStatus.PAUSED, statusNote: '家属申请9月起暂停一个月（去子女家暂住）', deliveryNote: '' },
      { name: '郑永昌', gender: 'MALE', birthDate: '1949-04-06', phone: '13911110008', address: '朝阳社区康宁巷15号院3门303', building: '15号院3门', chronicDiseases: ['糖尿病', '高血压'], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: ['甜食', '腌制食品'], allergies: [], emergencyContactName: '郑华', emergencyContactPhone: '13911111008', emergencyContactRelation: '女儿', subsidyLevel: SubsidyLevel.FULL, status: ElderStatus.NORMAL, deliveryNote: '需低盐低糖餐，家属要求拍照确认' },
      // 备用名单老人（不日常排餐，可接收住院转出的餐）；与张桂兰同楼栋
      { name: '孙桂英', gender: 'FEMALE', birthDate: '1948-08-20', phone: '13911110009', address: '朝阳社区幸福里小区3栋2单元502', building: '3栋', chronicDiseases: [], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: [], allergies: [], emergencyContactName: '孙立', emergencyContactPhone: '13911111009', emergencyContactRelation: '儿子', subsidyLevel: SubsidyLevel.PARTIAL, status: ElderStatus.NORMAL, backupEligible: true, deliveryNote: '备用接收人，同楼栋可临时接收' },
      // 普通餐老人（用于演示"未备餐直接取消"分支）
      { name: '吴建国', gender: 'MALE', birthDate: '1946-02-11', phone: '13911110010', address: '朝阳社区康宁巷8号院1门103', building: '8号院1门', chronicDiseases: ['关节炎'], chewingAbility: ChewingAbility.NORMAL, dietaryRestrictions: [], allergies: [], emergencyContactName: '吴斌', emergencyContactPhone: '13911111010', emergencyContactRelation: '儿子', subsidyLevel: SubsidyLevel.PARTIAL, status: ElderStatus.NORMAL, deliveryNote: '' },
    ];
    const elders = await this.elderRepo.save(
      elderData.map((e) => this.elderRepo.create({ ...e, communityWorkerId: worker.id })),
    );
    const [e1, e2, e3, e4, e5, e6, e7, e8, e9, e10] = elders;

    // 家属账号关联
    await this.elderRepo.update(e1.id, { familyUserId: family1.id });
    await this.elderRepo.update(e2.id, { familyUserId: family2.id });

    for (const e of elders) {
      await this.logRepo.save(
        this.logRepo.create({ elderId: e.id, fromStatus: null, toStatus: e.status, reason: '建立用餐档案', changedById: worker.id }),
      );
    }
    // 周福生：住院状态变更留痕 + 住院记录（演示"出院 → 恢复确认 → 恢复排餐"）
    await this.logRepo.save(
      this.logRepo.create({ elderId: e6.id, fromStatus: ElderStatus.NORMAL, toStatus: ElderStatus.HOSPITALIZED, reason: '住院登记（社区标记）：慢阻肺急性加重住院，暂停后续配餐', changedById: worker.id }),
    );
    await this.recordRepo.save(
      this.recordRepo.create({
        elderId: e6.id,
        markedById: worker.id,
        markChannel: MarkChannel.WORKER,
        reason: '慢阻肺急性加重，入住朝阳医院呼吸科',
        status: HospitalRecordStatus.HOSPITALIZED,
      }),
    );

    // ---------- 营养师建议 ----------
    const today = new Date();
    const start = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
    const adviceOf = (elder: Elder, mealType: MealType, note: string) =>
      this.adviceRepo.create({ elderId: elder.id, mealType, startDate: start, note, active: true, nutritionistId: nutritionist.id });
    await this.adviceRepo.save([
      adviceOf(e1, MealType.SOFT, '咀嚼能力下降且糖尿病，建议软烂餐，少糖少盐'),
      adviceOf(e2, MealType.LOW_SALT_SUGAR, '高血压，低盐低糖餐，控制每日钠摄入'),
      adviceOf(e3, MealType.LOW_SALT_SUGAR, '糖尿病，低盐低糖餐，注意花生过敏'),
      adviceOf(e4, MealType.SOFT, '高龄+关节炎，软烂餐；观察期每周复评'),
      adviceOf(e5, MealType.NORMAL, '身体状况良好，普通餐'),
      adviceOf(e6, MealType.NORMAL, '普通餐（住院期间暂停，出院恢复确认后自动恢复排餐）'),
      adviceOf(e8, MealType.LOW_SALT_SUGAR, '糖尿病+高血压，低盐低糖餐，忌甜食'),
      adviceOf(e10, MealType.NORMAL, '普通餐'),
    ]);

    // ---------- 昨日：已完成的配送（供统计/结算演示） ----------
    const yesterday = fmt(new Date(today.getTime() - 86400000));
    const ySchedules = await this.scheduleRepo.save([
      this.scheduleRepo.create({ date: yesterday, mealType: MealType.SOFT, dishId: dishOf(MealType.SOFT).id, plannedPortions: 2, packingTime: '10:20', insulationRequirement: '保温箱≥60℃', status: ScheduleStatus.DISPATCHED, createdById: kitchen.id }),
      this.scheduleRepo.create({ date: yesterday, mealType: MealType.LOW_SALT_SUGAR, dishId: dishOf(MealType.LOW_SALT_SUGAR).id, plannedPortions: 3, packingTime: '10:30', insulationRequirement: '保温箱≥60℃', status: ScheduleStatus.DISPATCHED, createdById: kitchen.id }),
      this.scheduleRepo.create({ date: yesterday, mealType: MealType.NORMAL, dishId: dishOf(MealType.NORMAL).id, plannedPortions: 1, packingTime: '10:40', insulationRequirement: '保温袋', status: ScheduleStatus.DISPATCHED, createdById: kitchen.id }),
    ]);
    const yRoute = await this.routeRepo.save(
      this.routeRepo.create({ date: yesterday, name: `${yesterday} 路线1（普通路线）`, routeType: RouteType.NORMAL, volunteerId: vol1.id, status: RouteStatus.COMPLETED }),
    );
    const mkTask = (routeId: number, elder: Elder, schedule: MealSchedule, seq: number, box: string) =>
      this.taskRepo.create({
        routeId, elderId: elder.id, elderName: elder.name, address: elder.address,
        mealType: schedule.mealType, dishName: dishOf(schedule.mealType).name, boxNumber: box,
        signMethod: SignMethod.SELF, notes: elder.deliveryNote || null, sequence: seq, status: TaskStatus.PENDING,
      });
    const yTasks = await this.taskRepo.save([
      mkTask(yRoute.id, e1, ySchedules[0], 1, 'RL-001'),
      mkTask(yRoute.id, e4, ySchedules[0], 2, 'RL-002'),
      mkTask(yRoute.id, e2, ySchedules[1], 3, 'DY-001'),
      mkTask(yRoute.id, e3, ySchedules[1], 4, 'DY-002'),
      mkTask(yRoute.id, e8, ySchedules[1], 5, 'DY-003'),
      mkTask(yRoute.id, e5, ySchedules[2], 6, 'PT-001'),
    ]);
    const yDeliveredAt = new Date(Date.now() - 86400000);
    // 4 单正常送达
    for (const t of [yTasks[0], yTasks[1], yTasks[3], yTasks[4]]) {
      t.status = TaskStatus.DELIVERED;
      t.temperature = 62.5;
      t.signerName = t.elderName;
      t.elderCondition = ElderCondition.GOOD;
      t.deliveredAt = yDeliveredAt;
      await this.taskRepo.save(t);
    }
    // 1 单邻居代收（异常→已办结，确认代收有效）
    yTasks[2].status = TaskStatus.DELIVERED;
    yTasks[2].temperature = 61.0;
    yTasks[2].signMethod = SignMethod.NEIGHBOR;
    yTasks[2].signerName = '孙阿姨（邻居）';
    yTasks[2].signerRelation = '邻居';
    yTasks[2].elderCondition = ElderCondition.FAIR;
    yTasks[2].deliveredAt = yDeliveredAt;
    await this.taskRepo.save(yTasks[2]);
    await this.exceptionRepo.save(
      this.exceptionRepo.create({
        taskId: yTasks[2].id, type: ExceptionType.NEIGHBOR_RECEIVED,
        description: '老人在楼下遛弯，邻居孙阿姨代收，已电话告知老人女儿',
        reportedById: vol1.id, status: ExceptionStatus.RESOLVED, handlerId: worker.id,
        resolution: '已与家属电话确认代收有效，计入送达', resolvedAt: yDeliveredAt,
      }),
    );
    // 1 单老人不在家（异常，待处理 → 供社区工作人员演示）
    yTasks[5].status = TaskStatus.EXCEPTION;
    await this.taskRepo.save(yTasks[5]);
    await this.exceptionRepo.save(
      this.exceptionRepo.create({
        taskId: yTasks[5].id, type: ExceptionType.NOT_HOME,
        description: '敲门无人应答，电话联系老人未接，餐品已带回厨房保温',
        reportedById: vol1.id, status: ExceptionStatus.PENDING,
      }),
    );
    await this.elderRepo.update(e5.id, { consecutiveMissed: 1 });

    // ---------- 今日 ----------
    const todayStr = fmt(today);
    // 软烂餐/低盐低糖餐：已确认并派单，志愿者01已接单（餐盒已出库在途）
    // → 演示住院联动"已出库"分支：家属/社区标记住院 → 志愿者处置（退回厨房/转交同楼栋/报损）
    await this.scheduleRepo.save([
      this.scheduleRepo.create({ date: todayStr, mealType: MealType.SOFT, dishId: dishOf(MealType.SOFT).id, plannedPortions: 2, packingTime: '10:20', insulationRequirement: '保温箱≥60℃', status: ScheduleStatus.DISPATCHED, createdById: kitchen.id }),
      this.scheduleRepo.create({ date: todayStr, mealType: MealType.LOW_SALT_SUGAR, dishId: dishOf(MealType.LOW_SALT_SUGAR).id, plannedPortions: 3, packingTime: '10:30', insulationRequirement: '保温箱≥60℃', status: ScheduleStatus.DISPATCHED, createdById: kitchen.id }),
    ]);
    const tRoute = await this.routeRepo.save(
      this.routeRepo.create({
        date: todayStr,
        name: `${todayStr} 路线1（普通路线）`,
        routeType: RouteType.NORMAL,
        volunteerId: vol1.id,
        status: RouteStatus.ACCEPTED,
        note: null,
      }),
    );
    const tSoft = await this.scheduleRepo.findOne({ where: { date: todayStr, mealType: MealType.SOFT } });
    const tDy = await this.scheduleRepo.findOne({ where: { date: todayStr, mealType: MealType.LOW_SALT_SUGAR } });
    await this.taskRepo.save([
      mkTask(tRoute.id, e1, tSoft, 1, 'RL-001'),
      mkTask(tRoute.id, e4, tSoft, 2, 'RL-002'),
      mkTask(tRoute.id, e2, tDy, 3, 'DY-001'),
      mkTask(tRoute.id, e3, tDy, 4, 'DY-002'),
      mkTask(tRoute.id, e8, tDy, 5, 'DY-003'),
    ]);

    // 普通餐：草稿排餐（陈淑芬、吴建国），未备餐
    // → 演示住院联动"未备餐直接取消"与"已备餐转备用名单"分支
    await this.scheduleRepo.save(
      this.scheduleRepo.create({ date: todayStr, mealType: MealType.NORMAL, dishId: dishOf(MealType.NORMAL).id, plannedPortions: 2, packingTime: '10:40', insulationRequirement: '保温袋', status: ScheduleStatus.DRAFT, createdById: kitchen.id }),
    );
  }
}
