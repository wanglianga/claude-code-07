import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { MealSchedule } from '../../entities/meal-schedule.entity';
import { NutritionAdvice } from '../../entities/nutrition-advice.entity';
import { Elder } from '../../entities/elder.entity';
import { Dish } from '../../entities/dish.entity';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import {
  MealType,
  ScheduleStatus,
  ElderStatus,
  RouteStatus,
  RouteType,
  TaskStatus,
  MEAL_ELIGIBLE_STATUSES,
  MEAL_TYPE_PREFIX,
} from '../../common/enums';

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(MealSchedule) private scheduleRepo: Repository<MealSchedule>,
    @InjectRepository(NutritionAdvice) private adviceRepo: Repository<NutritionAdvice>,
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
    @InjectRepository(Dish) private dishRepo: Repository<Dish>,
    @InjectRepository(DeliveryRoute) private routeRepo: Repository<DeliveryRoute>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
  ) {}

  /** 某日期应排餐的长者（按餐型分组） */
  async eligibleElders(date: string) {
    const advices = await this.adviceRepo.find({
      where: { active: true },
      relations: ['elder'],
    });
    const eligible = advices.filter(
      (a) =>
        a.mealType !== MealType.STOPPED &&
        a.startDate <= date &&
        (!a.endDate || a.endDate >= date) &&
        MEAL_ELIGIBLE_STATUSES.includes(a.elder.status),
    );
    const grouped: Record<string, Elder[]> = {};
    for (const a of eligible) {
      if (!grouped[a.mealType]) grouped[a.mealType] = [];
      grouped[a.mealType].push(a.elder);
    }
    return grouped;
  }

  async listSchedules(date: string) {
    return this.scheduleRepo.find({
      where: { date },
      relations: ['dish', 'createdBy'],
      order: { id: 'ASC' },
    });
  }

  /** 根据营养建议自动生成当日排餐草稿 */
  async generate(date: string, userId: number) {
    const existing = await this.scheduleRepo.find({ where: { date } });
    if (existing.length > 0) {
      throw new BadRequestException('该日期已存在排餐计划，请先删除或手动调整');
    }
    const grouped = await this.eligibleElders(date);
    const created: MealSchedule[] = [];
    for (const mealType of Object.keys(grouped)) {
      const dish = await this.dishRepo.findOne({
        where: { mealType: mealType as MealType, active: true },
        order: { id: 'ASC' },
      });
      if (!dish) continue;
      const schedule = this.scheduleRepo.create({
        date,
        mealType: mealType as MealType,
        dishId: dish.id,
        plannedPortions: grouped[mealType].length,
        packingTime: '10:30',
        insulationRequirement: '保温箱配送，送达时餐温不低于60℃',
        status: ScheduleStatus.DRAFT,
        createdById: userId,
      });
      created.push(await this.scheduleRepo.save(schedule));
    }
    return created;
  }

  async createSchedule(dto: Partial<MealSchedule>, userId: number) {
    const dish = await this.dishRepo.findOne({ where: { id: dto.dishId } });
    if (!dish) throw new NotFoundException('菜品不存在');
    const schedule = this.scheduleRepo.create({
      ...dto,
      status: ScheduleStatus.DRAFT,
      createdById: userId,
    });
    return this.scheduleRepo.save(schedule);
  }

  async updateSchedule(id: number, dto: Partial<MealSchedule>) {
    const schedule = await this.scheduleRepo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('排餐计划不存在');
    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new BadRequestException('仅草稿状态的排餐可修改');
    }
    Object.assign(schedule, dto);
    return this.scheduleRepo.save(schedule);
  }

  async confirmSchedule(id: number) {
    const schedule = await this.scheduleRepo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('排餐计划不存在');
    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new BadRequestException('仅草稿状态可确认');
    }
    schedule.status = ScheduleStatus.CONFIRMED;
    return this.scheduleRepo.save(schedule);
  }

  async removeSchedule(id: number) {
    const schedule = await this.scheduleRepo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('排餐计划不存在');
    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new BadRequestException('仅草稿状态可删除');
    }
    await this.scheduleRepo.remove(schedule);
    return { ok: true };
  }

  /**
   * 派单：根据已确认排餐生成配送路线与任务。
   * 仅处理仍处于"已确认"状态的排餐（已派单的不重复处理），
   * 因此住院转备用名单后补录的当日建议可再次派单。
   * 路线规则：
   *  - 连续2次及以上无人签收 → 电话确认路线
   *  - 观察/需上门探访 → 安排熟悉情况的志愿者（需经验路线）
   *  - 其余普通路线，每条最多5单
   */
  async dispatch(date: string) {
    const schedules = await this.scheduleRepo.find({
      where: { date, status: ScheduleStatus.CONFIRMED },
      relations: ['dish'],
    });
    if (schedules.length === 0) {
      throw new BadRequestException('该日期没有待派单的已确认排餐计划');
    }

    // 每个餐型取第一个已确认排餐作为出餐依据
    const byMealType = new Map<MealType, MealSchedule>();
    for (const s of schedules) {
      if (!byMealType.has(s.mealType)) byMealType.set(s.mealType, s);
    }

    const advices = await this.adviceRepo.find({
      where: { active: true },
      relations: ['elder'],
    });
    const items: { elder: Elder; schedule: MealSchedule }[] = [];
    for (const a of advices) {
      if (a.mealType === MealType.STOPPED) continue;
      if (a.startDate > date || (a.endDate && a.endDate < date)) continue;
      if (!MEAL_ELIGIBLE_STATUSES.includes(a.elder.status)) continue;
      const schedule = byMealType.get(a.mealType);
      if (!schedule) continue;
      items.push({ elder: a.elder, schedule });
    }
    if (items.length === 0) {
      throw new BadRequestException('当日没有需要配送的长者');
    }

    const phoneConfirm = items.filter((i) => i.elder.consecutiveMissed >= 2);
    const experienced = items.filter(
      (i) =>
        i.elder.consecutiveMissed < 2 &&
        [ElderStatus.OBSERVING, ElderStatus.VISIT_NEEDED].includes(i.elder.status),
    );
    const normal = items.filter(
      (i) => !phoneConfirm.includes(i) && !experienced.includes(i),
    );

    const CHUNK = 5;
    const groups: { items: typeof items; type: RouteType; label: string }[] = [];
    for (let i = 0; i < normal.length; i += CHUNK) {
      groups.push({ items: normal.slice(i, i + CHUNK), type: RouteType.NORMAL, label: '普通路线' });
    }
    for (let i = 0; i < phoneConfirm.length; i += CHUNK) {
      groups.push({ items: phoneConfirm.slice(i, i + CHUNK), type: RouteType.PHONE_CONFIRM, label: '电话确认路线' });
    }
    for (let i = 0; i < experienced.length; i += CHUNK) {
      groups.push({ items: experienced.slice(i, i + CHUNK), type: RouteType.EXPERIENCED, label: '需熟悉情况志愿者' });
    }

    const seqCounter: Record<string, number> = {};
    const result: DeliveryRoute[] = [];
    // 路线编号接续当日已有路线（支持补派）
    const existingRouteCount = await this.routeRepo.count({ where: { date } });
    let routeIndex = existingRouteCount + 1;
    for (const g of groups) {
      const route = await this.routeRepo.save(
        this.routeRepo.create({
          date,
          name: `${date} 路线${routeIndex}（${g.label}）`,
          routeType: g.type,
          status: RouteStatus.OPEN,
          note:
            g.type === RouteType.PHONE_CONFIRM
              ? '该路线长者近期连续无人签收，配送前请先电话联系老人或家属'
              : g.type === RouteType.EXPERIENCED
                ? '该路线长者处于观察/需探访状态，建议由熟悉情况的志愿者或助老员配送'
                : null,
        }),
      );
      let seq = 1;
      for (const item of g.items) {
        const prefix = MEAL_TYPE_PREFIX[item.schedule.mealType] || 'PT';
        seqCounter[prefix] = (seqCounter[prefix] || 0) + 1;
        const boxNumber = `${prefix}-${String(seqCounter[prefix]).padStart(3, '0')}`;
        const allergyNote = item.elder.allergies?.length
          ? `过敏：${item.elder.allergies.join('、')}。`
          : '';
        const restrictNote = item.elder.dietaryRestrictions?.length
          ? `忌口：${item.elder.dietaryRestrictions.join('、')}。`
          : '';
        await this.taskRepo.save(
          this.taskRepo.create({
            routeId: route.id,
            elderId: item.elder.id,
            elderName: item.elder.name,
            address: item.elder.address,
            mealType: item.schedule.mealType,
            dishName: item.schedule.dish.name,
            boxNumber,
            notes: `${allergyNote}${restrictNote}${item.elder.deliveryNote || ''}`.trim() || null,
            sequence: seq++,
            status: TaskStatus.PENDING,
          }),
        );
      }
      routeIndex++;
      result.push(route);
    }

    for (const s of schedules) {
      s.status = ScheduleStatus.DISPATCHED;
      await this.scheduleRepo.save(s);
    }
    return result;
  }

  /** 厨房反馈统计：按菜品统计送达/拒收/洒漏/剩餐 */
  async feedback(from: string, to: string) {
    const tasks = await this.taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.route', 'r')
      .where('r.date BETWEEN :from AND :to', { from, to })
      .getMany();
    const stats = new Map<string, any>();
    for (const t of tasks) {
      if (!stats.has(t.dishName)) {
        stats.set(t.dishName, {
          dishName: t.dishName,
          mealType: t.mealType,
          total: 0,
          delivered: 0,
          exception: 0,
          cancelled: 0,
          leftover: 0,
        });
      }
      const s = stats.get(t.dishName);
      s.total++;
      if (t.status === TaskStatus.DELIVERED) s.delivered++;
      if (t.status === TaskStatus.EXCEPTION) s.exception++;
      if (t.status === TaskStatus.CANCELLED) s.cancelled++;
      if (t.hasLeftover) s.leftover++;
    }
    return Array.from(stats.values());
  }
}
