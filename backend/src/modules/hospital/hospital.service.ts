import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HospitalRecord } from '../../entities/hospital-record.entity';
import { HospitalDisposal } from '../../entities/hospital-disposal.entity';
import { KitchenLoss } from '../../entities/kitchen-loss.entity';
import { Elder } from '../../entities/elder.entity';
import { ElderStatusLog } from '../../entities/elder-status-log.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { MealSchedule } from '../../entities/meal-schedule.entity';
import { NutritionAdvice } from '../../entities/nutrition-advice.entity';
import {
  ElderStatus,
  HospitalRecordStatus,
  MarkChannel,
  DisposalStage,
  DisposalAction,
  DisposalStatus,
  TaskStatus,
  RouteStatus,
  ScheduleStatus,
  SignMethod,
  UserRole,
  MEAL_ELIGIBLE_STATUSES,
} from '../../common/enums';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Actor {
  id: number;
  role: UserRole;
}

@Injectable()
export class HospitalService {
  constructor(
    @InjectRepository(HospitalRecord) private recordRepo: Repository<HospitalRecord>,
    @InjectRepository(HospitalDisposal) private disposalRepo: Repository<HospitalDisposal>,
    @InjectRepository(KitchenLoss) private lossRepo: Repository<KitchenLoss>,
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
    @InjectRepository(ElderStatusLog) private logRepo: Repository<ElderStatusLog>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
    @InjectRepository(DeliveryRoute) private routeRepo: Repository<DeliveryRoute>,
    @InjectRepository(MealSchedule) private scheduleRepo: Repository<MealSchedule>,
    @InjectRepository(NutritionAdvice) private adviceRepo: Repository<NutritionAdvice>,
  ) {}

  /** 家属可见的老人（关联到其账号） */
  async myElders(user: Actor) {
    const elders = await this.elderRepo.find({
      where: { familyUserId: user.id },
      order: { id: 'ASC' },
    });
    const result = [];
    for (const e of elders) {
      const activeRecord = await this.recordRepo.findOne({
        where: {
          elderId: e.id,
          status: In([HospitalRecordStatus.HOSPITALIZED, HospitalRecordStatus.DISCHARGE_PENDING]),
        },
        order: { id: 'DESC' },
      });
      result.push({ ...e, activeRecord: activeRecord || null });
    }
    return result;
  }

  /** 住院记录列表（管理角色看全部，家属只看自家老人） */
  async listRecords(status: HospitalRecordStatus | undefined, user: Actor) {
    const qb = this.recordRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.elder', 'elder')
      .leftJoinAndSelect('r.markedBy', 'markedBy')
      .leftJoinAndSelect('r.dischargeBy', 'dischargeBy')
      .leftJoinAndSelect('r.resumedBy', 'resumedBy')
      .orderBy('r.id', 'DESC');
    if (status) qb.andWhere('r.status = :status', { status });
    if (user.role === UserRole.FAMILY) {
      qb.andWhere('elder.familyUserId = :uid', { uid: user.id });
    }
    const records = await qb.getMany();
    // 附带处置单
    const ids = records.map((r) => r.id);
    const disposals = ids.length
      ? await this.disposalRepo.find({
          where: { hospitalRecordId: In(ids) },
          relations: ['handledBy'],
          order: { id: 'ASC' },
        })
      : [];
    return records.map((r) => ({
      ...r,
      disposals: disposals.filter((d) => d.hospitalRecordId === r.id),
    }));
  }

  async recordDetail(id: number, user: Actor) {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['elder', 'markedBy', 'dischargeBy', 'resumedBy'],
    });
    if (!record) throw new NotFoundException('住院记录不存在');
    if (user.role === UserRole.FAMILY) {
      const elder = await this.elderRepo.findOne({ where: { id: record.elderId } });
      if (!elder || elder.familyUserId !== user.id) {
        throw new ForbiddenException('只能查看自家老人的住院记录');
      }
    }
    const disposals = await this.disposalRepo.find({
      where: { hospitalRecordId: id },
      relations: ['handledBy', 'task'],
      order: { id: 'ASC' },
    });
    return { ...record, disposals };
  }

  /**
   * 标记住院（家属/社区工作人员）：
   * 1. 老人状态 → 住院，暂停后续配餐（取消未来待配送任务）
   * 2. 检查当天餐：未备餐 → 直接取消；已备餐未出库 → 转备用名单或损耗；已出库 → 生成志愿者处置单
   */
  async admit(elderId: number, user: Actor, reason?: string) {
    const elder = await this.elderRepo.findOne({ where: { id: elderId } });
    if (!elder) throw new NotFoundException('长者档案不存在');
    if (user.role === UserRole.FAMILY && elder.familyUserId !== user.id) {
      throw new ForbiddenException('只能为自家老人标记住院');
    }
    if (elder.status === ElderStatus.HOSPITALIZED) {
      throw new BadRequestException('该长者已处于住院状态');
    }
    if (elder.status === ElderStatus.DISCHARGE_PENDING) {
      throw new BadRequestException('该长者出院待确认，请先完成恢复确认');
    }

    const today = todayStr();
    const fromStatus = elder.status;

    // 1. 住院记录
    const record = await this.recordRepo.save(
      this.recordRepo.create({
        elderId: elder.id,
        markedById: user.id,
        markChannel: user.role === UserRole.FAMILY ? MarkChannel.FAMILY : MarkChannel.WORKER,
        reason: reason || null,
        status: HospitalRecordStatus.HOSPITALIZED,
      }),
    );

    // 2. 老人状态 → 住院（自动退出后续排餐）
    elder.status = ElderStatus.HOSPITALIZED;
    elder.statusNote = reason ? `住院：${reason}` : '住院，暂停送餐';
    await this.elderRepo.save(elder);
    await this.logRepo.save(
      this.logRepo.create({
        elderId: elder.id,
        fromStatus,
        toStatus: ElderStatus.HOSPITALIZED,
        reason: `住院登记（${user.role === UserRole.FAMILY ? '家属标记' : '社区标记'}）${reason ? '：' + reason : ''}，暂停后续配餐`,
        changedById: user.id,
      }),
    );

    // 3. 取消未来待配送任务（今天的走处置流程）
    const futureTasks = await this.taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.route', 'r')
      .where('t.elderId = :eid', { eid: elder.id })
      .andWhere('t.status = :st', { st: TaskStatus.PENDING })
      .andWhere('r.date > :today', { today })
      .getMany();
    for (const t of futureTasks) {
      t.status = TaskStatus.CANCELLED;
      await this.taskRepo.save(t);
    }

    // 4. 当天餐处置
    const { disposals, message } = await this.handleTodayMeal(elder, record, today);

    return {
      record,
      disposals,
      cancelledFutureTasks: futureTasks.length,
      message,
    };
  }

  /** 当天餐联动：返回处置单与提示信息 */
  private async handleTodayMeal(
    elder: Elder,
    record: HospitalRecord,
    today: string,
  ): Promise<{ disposals: HospitalDisposal[]; message: string }> {
    // 今天是否已有配送任务
    const todayTasks = await this.taskRepo
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.route', 'r')
      .where('t.elderId = :eid', { eid: elder.id })
      .andWhere('r.date = :today', { today })
      .getMany();
    const delivered = todayTasks.find((t) => t.status === TaskStatus.DELIVERED);
    const pendingTask = todayTasks.find((t) => t.status === TaskStatus.PENDING);

    if (delivered) {
      return { disposals: [], message: `今日餐（${delivered.boxNumber}）已送达，无需处置；明日起暂停配餐` };
    }

    if (pendingTask) {
      const route = pendingTask.route;
      if (route.status === RouteStatus.OPEN) {
        // 已派单但志愿者未接单 = 已备餐未出库
        pendingTask.status = TaskStatus.CANCELLED;
        await this.taskRepo.save(pendingTask);
        const disposal = await this.transferOrLoss(
          elder,
          record,
          today,
          pendingTask,
          route,
        );
        return { disposals: [disposal], message: this.disposalMessage(disposal) };
      }
      // 志愿者已接单/配送中 = 餐盒已出库 → 待志愿者处置
      const disposal = await this.disposalRepo.save(
        this.disposalRepo.create({
          hospitalRecordId: record.id,
          elderId: elder.id,
          elderName: elder.name,
          date: today,
          taskId: pendingTask.id,
          boxNumber: pendingTask.boxNumber,
          dishName: pendingTask.dishName,
          mealType: pendingTask.mealType,
          stage: DisposalStage.DISPATCHED,
          action: DisposalAction.RETURN_KITCHEN, // 占位，志愿者处置时确定
          status: DisposalStatus.PENDING,
          note: '餐盒已出库，等待志愿者选择：退回厨房 / 转交同楼栋老人 / 报损',
        }),
      );
      return {
        disposals: [disposal],
        message: `今日餐盒 ${pendingTask.boxNumber} 已出库（志愿者配送中），已生成处置任务，等待志愿者选择退回厨房 / 转交同楼栋老人 / 报损`,
      };
    }

    // 没有今日任务：看今日排餐计划
    const advice = await this.adviceRepo.findOne({
      where: { elderId: elder.id, active: true },
    });
    const schedule = advice
      ? await this.scheduleRepo.findOne({
          where: { date: today, mealType: advice.mealType },
          relations: ['dish'],
        })
      : null;

    if (!advice || !schedule) {
      return { disposals: [], message: '今日无该长者的排餐，无需处置；后续配餐已暂停' };
    }
    if (schedule.status === ScheduleStatus.DRAFT) {
      // 未备餐：直接取消（计划份数 -1）
      schedule.plannedPortions = Math.max(0, schedule.plannedPortions - 1);
      await this.scheduleRepo.save(schedule);
      const disposal = await this.disposalRepo.save(
        this.disposalRepo.create({
          hospitalRecordId: record.id,
          elderId: elder.id,
          elderName: elder.name,
          date: today,
          dishName: schedule.dish?.name || null,
          mealType: schedule.mealType,
          stage: DisposalStage.NOT_PREPARED,
          action: DisposalAction.CANCELLED,
          status: DisposalStatus.DONE,
          kitchenLoss: false,
          subsidyNote: '未备餐未送达，不产生补贴',
          note: '排餐未确认（未备餐），已直接取消，无厨房损耗',
        }),
      );
      return { disposals: [disposal], message: this.disposalMessage(disposal) };
    }
    // 已确认排餐（已备餐）但未派单 → 转备用名单或损耗
    const disposal = await this.transferOrLoss(elder, record, today, null, null, schedule);
    return { disposals: [disposal], message: this.disposalMessage(disposal) };
  }

  /**
   * 已备餐未出库：优先转备用名单老人，无可用备用则计厨房损耗
   * - 已有待配送任务（路线未接单）：取消原任务，把餐转给同路线上的备用老人
   * - 尚未派单（排餐已确认）：为备用老人生成当日一次性用餐建议，派单时自动带上
   */
  private async transferOrLoss(
    elder: Elder,
    record: HospitalRecord,
    today: string,
    task: DeliveryTask | null,
    route: DeliveryRoute | null,
    schedule?: MealSchedule,
  ): Promise<HospitalDisposal> {
    const backup = await this.findBackupElder(elder, today);
    const base = {
      hospitalRecordId: record.id,
      elderId: elder.id,
      elderName: elder.name,
      date: today,
      taskId: task?.id || null,
      boxNumber: task?.boxNumber || null,
      dishName: task?.dishName || schedule?.dish?.name || null,
      mealType: task?.mealType || schedule?.mealType || null,
      stage: DisposalStage.PREPARED,
      status: DisposalStatus.DONE,
    };

    if (backup) {
      if (task && route) {
        // 同一路线上为备用老人补一单（餐盒随原单转移）
        await this.taskRepo.save(
          this.taskRepo.create({
            routeId: route.id,
            elderId: backup.id,
            elderName: backup.name,
            address: backup.address,
            mealType: task.mealType,
            dishName: task.dishName,
            boxNumber: task.boxNumber,
            notes: `住院转备用名单（原：${elder.name}）`,
            sequence: task.sequence,
            status: TaskStatus.PENDING,
          }),
        );
      } else if (schedule) {
        // 未派单：为备用老人生成当日一次性建议，派单时自动纳入
        await this.adviceRepo.save(
          this.adviceRepo.create({
            elderId: backup.id,
            mealType: schedule.mealType,
            startDate: today,
            endDate: today,
            note: `住院转备用名单（原：${elder.name}），仅当日有效`,
            active: true,
            nutritionistId: record.markedById,
          }),
        );
      }
      return this.disposalRepo.save(
        this.disposalRepo.create({
          ...base,
          action: DisposalAction.TRANSFER_BACKUP,
          transferToElderId: backup.id,
          transferToElderName: backup.name,
          kitchenLoss: false,
          subsidyNote: `餐品转送备用名单「${backup.name}」，送达后计入其补贴结算，不计入原长者`,
          note: task
            ? '已备餐未交志愿者，原任务取消，餐品转备用名单'
            : '已备餐未派单，已为备用名单老人生成当日用餐安排',
        }),
      );
    }

    // 无可用备用名单 → 厨房损耗
    const disposal = await this.disposalRepo.save(
      this.disposalRepo.create({
        ...base,
        action: DisposalAction.DISCARD,
        kitchenLoss: true,
        subsidyNote: '未送达，不计入补贴核销',
        note: '已备餐但备用名单无可用接收人，餐品计入厨房损耗',
      }),
    );
    await this.lossRepo.save(
      this.lossRepo.create({
        date: today,
        disposalId: disposal.id,
        elderId: elder.id,
        elderName: elder.name,
        boxNumber: disposal.boxNumber,
        dishName: disposal.dishName,
        mealType: disposal.mealType,
        action: DisposalAction.DISCARD,
        quantity: 1,
        reason: '老人住院，餐品已备餐但备用名单无可用接收人',
      }),
    );
    return disposal;
  }

  /** 备用名单：可用（正常排餐状态、今日无任务）、同楼栋优先 */
  private async findBackupElder(elder: Elder, today: string): Promise<Elder | null> {
    const candidates = await this.elderRepo.find({ where: { backupEligible: true } });
    const usable = [];
    for (const c of candidates) {
      if (c.id === elder.id) continue;
      if (!MEAL_ELIGIBLE_STATUSES.includes(c.status)) continue;
      const todayTaskCount = await this.taskRepo
        .createQueryBuilder('t')
        .innerJoin('t.route', 'r')
        .where('t.elderId = :cid', { cid: c.id })
        .andWhere('r.date = :today', { today })
        .andWhere('t.status IN (:...sts)', { sts: [TaskStatus.PENDING, TaskStatus.DELIVERED] })
        .getCount();
      if (todayTaskCount > 0) continue;
      usable.push(c);
    }
    usable.sort((a, b) => {
      const aSame = a.building && a.building === elder.building ? 0 : 1;
      const bSame = b.building && b.building === elder.building ? 0 : 1;
      return aSame - bSame || a.id - b.id;
    });
    return usable[0] || null;
  }

  private disposalMessage(d: HospitalDisposal): string {
    switch (d.action) {
      case DisposalAction.CANCELLED:
        return '今日餐尚未备餐，已直接取消（无厨房损耗、不产生补贴）';
      case DisposalAction.TRANSFER_BACKUP:
        return `今日餐已备餐未出库，已转备用名单「${d.transferToElderName}」`;
      case DisposalAction.DISCARD:
        return '今日餐已备餐，但备用名单无可用接收人，已计入厨房损耗';
      default:
        return '已生成处置单';
    }
  }

  /** 处置单列表：志愿者看自己路线上的，其余角色看全部 */
  async listDisposals(status: DisposalStatus | undefined, user: Actor) {
    const all = await this.disposalRepo.find({
      relations: ['task', 'task.route', 'handledBy', 'hospitalRecord'],
      order: { id: 'DESC' },
    });
    let list = all;
    if (user.role === UserRole.VOLUNTEER) {
      list = all.filter((d) => d.task?.route?.volunteerId === user.id);
    }
    if (status) list = list.filter((d) => d.status === status);
    return list;
  }

  /** 同楼栋可转交老人（志愿者处置时选择） */
  async transferCandidates(disposalId: number, user: Actor) {
    const disposal = await this.disposalRepo.findOne({
      where: { id: disposalId },
      relations: ['task', 'task.route'],
    });
    if (!disposal) throw new NotFoundException('处置单不存在');
    const elder = await this.elderRepo.findOne({ where: { id: disposal.elderId } });
    if (!elder) throw new NotFoundException('长者档案不存在');
    const all = await this.elderRepo.find();
    return all
      .filter(
        (e) =>
          e.id !== elder.id &&
          e.building &&
          elder.building &&
          e.building === elder.building &&
          MEAL_ELIGIBLE_STATUSES.includes(e.status),
      )
      .map((e) => ({
        id: e.id,
        name: e.name,
        building: e.building,
        address: e.address,
        backupEligible: e.backupEligible,
      }));
  }

  /**
   * 志愿者处置已出库餐盒：退回厨房 / 转交同楼栋老人 / 报损
   * 结果联动：补贴核销（是否计入送达）+ 厨房损耗台账
   */
  async handleDisposal(
    disposalId: number,
    user: Actor,
    dto: { action: DisposalAction; transferToElderId?: number; note?: string },
  ) {
    const disposal = await this.disposalRepo.findOne({
      where: { id: disposalId },
      relations: ['task', 'task.route'],
    });
    if (!disposal) throw new NotFoundException('处置单不存在');
    if (disposal.status !== DisposalStatus.PENDING) {
      throw new BadRequestException('该处置单已处理');
    }
    if (!disposal.task) throw new BadRequestException('处置单缺少关联配送任务');
    if (disposal.task.route?.volunteerId !== user.id) {
      throw new ForbiddenException('只能处置本人配送路线上的餐盒');
    }
    if (
      ![DisposalAction.RETURN_KITCHEN, DisposalAction.TRANSFER_NEIGHBOR, DisposalAction.DISCARD].includes(
        dto.action,
      )
    ) {
      throw new BadRequestException('已出库餐盒仅支持：退回厨房 / 转交同楼栋老人 / 报损');
    }

    const task = disposal.task;
    const today = disposal.date;
    disposal.handledById = user.id;
    disposal.handledAt = new Date();
    disposal.status = DisposalStatus.DONE;
    disposal.action = dto.action;
    if (dto.note) disposal.note = dto.note;

    // 原配送任务终止（不再计入原长者送达）
    task.status = TaskStatus.CANCELLED;
    await this.taskRepo.save(task);

    if (dto.action === DisposalAction.TRANSFER_NEIGHBOR) {
      // 转交同楼栋老人：新任务直接记送达，补贴计入接收人
      if (!dto.transferToElderId) {
        throw new BadRequestException('请选择同楼栋接收老人');
      }
      const target = await this.elderRepo.findOne({ where: { id: dto.transferToElderId } });
      if (!target) throw new NotFoundException('接收老人不存在');
      const source = await this.elderRepo.findOne({ where: { id: disposal.elderId } });
      if (!target.building || !source?.building || target.building !== source.building) {
        throw new BadRequestException('接收老人必须与住院长者同楼栋');
      }
      if (!MEAL_ELIGIBLE_STATUSES.includes(target.status)) {
        throw new BadRequestException('接收老人当前状态不可接收送餐');
      }
      await this.taskRepo.save(
        this.taskRepo.create({
          routeId: task.routeId,
          elderId: target.id,
          elderName: target.name,
          address: target.address,
          mealType: task.mealType,
          dishName: task.dishName,
          boxNumber: task.boxNumber,
          notes: `住院转交（原：${disposal.elderName}）`,
          sequence: task.sequence,
          status: TaskStatus.DELIVERED,
          signMethod: SignMethod.SELF,
          signerName: target.name,
          deliveredAt: new Date(),
        }),
      );
      disposal.transferToElderId = target.id;
      disposal.transferToElderName = target.name;
      disposal.kitchenLoss = false;
      disposal.subsidyNote = `餐品已转交同楼栋「${target.name}」并送达，计入其送达餐数（参与其补贴结算），不计入原长者`;
    } else {
      // 退回厨房 / 报损 → 均计入厨房损耗，不核销补贴
      disposal.kitchenLoss = true;
      disposal.subsidyNote = '未送达，不计入补贴核销';
      await this.lossRepo.save(
        this.lossRepo.create({
          date: today,
          disposalId: disposal.id,
          elderId: disposal.elderId,
          elderName: disposal.elderName,
          boxNumber: disposal.boxNumber,
          dishName: disposal.dishName,
          mealType: disposal.mealType,
          action: dto.action,
          quantity: 1,
          reason:
            dto.action === DisposalAction.RETURN_KITCHEN
              ? '老人住院，餐盒已出库，志愿者退回厨房（不可再配送）'
              : `老人住院，餐盒已出库，志愿者报损${dto.note ? '：' + dto.note : ''}`,
        }),
      );
    }
    return this.disposalRepo.save(disposal);
  }

  /** 标记出院：进入"出院待确认"，需社区重新确认禁忌与地址后才恢复排餐 */
  async discharge(recordId: number, user: Actor, note?: string) {
    const record = await this.recordRepo.findOne({ where: { id: recordId } });
    if (!record) throw new NotFoundException('住院记录不存在');
    if (record.status !== HospitalRecordStatus.HOSPITALIZED) {
      throw new BadRequestException('该记录不处于住院中状态');
    }
    const elder = await this.elderRepo.findOne({ where: { id: record.elderId } });
    if (!elder) throw new NotFoundException('长者档案不存在');
    if (user.role === UserRole.FAMILY && elder.familyUserId !== user.id) {
      throw new ForbiddenException('只能为自家老人标记出院');
    }

    record.status = HospitalRecordStatus.DISCHARGE_PENDING;
    record.dischargedAt = new Date();
    record.dischargeById = user.id;
    record.dischargeNote = note || null;
    await this.recordRepo.save(record);

    const fromStatus = elder.status;
    elder.status = ElderStatus.DISCHARGE_PENDING;
    elder.statusNote = '已出院，待社区重新确认饮食禁忌与送餐地址后恢复送餐';
    await this.elderRepo.save(elder);
    await this.logRepo.save(
      this.logRepo.create({
        elderId: elder.id,
        fromStatus,
        toStatus: ElderStatus.DISCHARGE_PENDING,
        reason: `出院登记（${user.role === UserRole.FAMILY ? '家属标记' : '社区标记'}）${note ? '：' + note : ''}，待社区确认后恢复送餐`,
        changedById: user.id,
      }),
    );
    return record;
  }

  /** 社区恢复确认：重新核对饮食禁忌与送餐地址后恢复排餐 */
  async resume(
    recordId: number,
    user: Actor,
    dto: {
      dietConfirmed: boolean;
      addressConfirmed: boolean;
      dietaryRestrictions?: string[];
      address?: string;
      note?: string;
    },
  ) {
    const record = await this.recordRepo.findOne({ where: { id: recordId } });
    if (!record) throw new NotFoundException('住院记录不存在');
    if (record.status !== HospitalRecordStatus.DISCHARGE_PENDING) {
      throw new BadRequestException('该记录不处于出院待确认状态');
    }
    if (!dto.dietConfirmed || !dto.addressConfirmed) {
      throw new BadRequestException('恢复送餐前必须重新确认饮食禁忌和送餐地址');
    }
    const elder = await this.elderRepo.findOne({ where: { id: record.elderId } });
    if (!elder) throw new NotFoundException('长者档案不存在');

    // 同步更新档案（如社区核实后有变化）
    if (dto.dietaryRestrictions) elder.dietaryRestrictions = dto.dietaryRestrictions;
    if (dto.address) elder.address = dto.address;

    const fromStatus = elder.status;
    elder.status = ElderStatus.NORMAL;
    elder.consecutiveMissed = 0;
    elder.statusNote = '出院恢复确认完成，恢复送餐';
    await this.elderRepo.save(elder);

    record.status = HospitalRecordStatus.RESUMED;
    record.resumedAt = new Date();
    record.resumedById = user.id;
    record.dietConfirmed = true;
    record.addressConfirmed = true;
    record.resumeNote = dto.note || null;
    await this.recordRepo.save(record);

    await this.logRepo.save(
      this.logRepo.create({
        elderId: elder.id,
        fromStatus,
        toStatus: ElderStatus.NORMAL,
        reason: `出院恢复确认：饮食禁忌已重新核对、送餐地址已重新核对${dto.note ? '；' + dto.note : ''}，恢复排餐`,
        changedById: user.id,
      }),
    );
    return record;
  }

  /** 备用名单（纳入备用的长者） */
  async backupList() {
    const list = await this.elderRepo.find({
      where: { backupEligible: true },
      order: { id: 'ASC' },
    });
    return list.map((e) => ({
      id: e.id,
      name: e.name,
      building: e.building,
      address: e.address,
      status: e.status,
      phone: e.phone,
    }));
  }

  /** 厨房损耗台账 */
  async listLosses() {
    return this.lossRepo.find({ order: { id: 'DESC' } });
  }
}
