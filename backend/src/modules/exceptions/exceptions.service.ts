import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { Elder } from '../../entities/elder.entity';
import { ElderStatusLog } from '../../entities/elder-status-log.entity';
import {
  ExceptionStatus,
  TaskStatus,
  ElderStatus,
  SignMethod,
  UserRole,
} from '../../common/enums';

@Injectable()
export class ExceptionsService {
  constructor(
    @InjectRepository(DeliveryException) private exceptionRepo: Repository<DeliveryException>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
    @InjectRepository(ElderStatusLog) private logRepo: Repository<ElderStatusLog>,
  ) {}

  async list(status?: ExceptionStatus, user?: { id: number; role: UserRole }) {
    const where: any = {};
    if (status) where.status = status;
    if (user && user.role === UserRole.VOLUNTEER) where.reportedById = user.id;
    const list = await this.exceptionRepo.find({
      where,
      relations: ['task', 'reportedBy', 'handler'],
      order: { createdAt: 'DESC' },
    });
    // 补充老人当前状态，便于处理人决策
    const elderIds = [...new Set(list.map((e) => e.task?.elderId).filter(Boolean))];
    const elders = elderIds.length
      ? await this.elderRepo.find({ where: { id: In(elderIds) } })
      : [];
    const elderMap = new Map(elders.map((e) => [e.id, e]));
    return list.map((e) => ({
      ...e,
      elder: e.task?.elderId ? elderMap.get(e.task.elderId) : null,
    }));
  }

  async claim(id: number, user: { id: number }) {
    const ex = await this.exceptionRepo.findOne({ where: { id } });
    if (!ex) throw new NotFoundException('异常工单不存在');
    if (ex.status !== ExceptionStatus.PENDING) {
      throw new BadRequestException('工单已被认领或已办结');
    }
    ex.status = ExceptionStatus.PROCESSING;
    ex.handlerId = user.id;
    return this.exceptionRepo.save(ex);
  }

  /**
   * 办结异常工单：
   * - resolution 处理说明（必填）
   * - taskOutcome: DELIVERED（代收确认/补送成功）| RETURNED（确认退餐）
   * - newElderStatus: 可选，同步调整老人档案状态并留痕
   */
  async resolve(
    id: number,
    user: { id: number },
    dto: {
      resolution: string;
      taskOutcome?: 'DELIVERED' | 'RETURNED';
      newElderStatus?: ElderStatus;
    },
  ) {
    const ex = await this.exceptionRepo.findOne({
      where: { id },
      relations: ['task'],
    });
    if (!ex) throw new NotFoundException('异常工单不存在');
    if (ex.status === ExceptionStatus.RESOLVED) {
      throw new BadRequestException('工单已办结');
    }
    ex.status = ExceptionStatus.RESOLVED;
    ex.handlerId = user.id;
    ex.resolution = dto.resolution;
    ex.resolvedAt = new Date();
    await this.exceptionRepo.save(ex);

    const task = ex.task;
    if (task && task.status === TaskStatus.EXCEPTION) {
      if (dto.taskOutcome === 'DELIVERED') {
        // 代收确认 / 补送成功：计入实际送达
        task.status = TaskStatus.DELIVERED;
        task.deliveredAt = new Date();
        if (!task.signerName) {
          task.signMethod = SignMethod.NEIGHBOR;
          task.signerName = '代收确认';
        }
        await this.taskRepo.save(task);
        await this.elderRepo.update(task.elderId, { consecutiveMissed: 0 });
      }
      // RETURNED：保持 EXCEPTION 状态，视为异常退餐，不计入送达
    }

    if (dto.newElderStatus && task) {
      // 住院/出院必须走「住院管理」流程（停餐联动、当日餐处置、恢复确认）
      if (
        [ElderStatus.HOSPITALIZED, ElderStatus.DISCHARGE_PENDING].includes(
          dto.newElderStatus,
        )
      ) {
        throw new BadRequestException(
          '住院相关状态请通过「住院管理」登记，以联动停餐与当日餐处置',
        );
      }
      const elder = await this.elderRepo.findOne({
        where: { id: task.elderId },
      });
      if (elder && elder.status !== dto.newElderStatus) {
        if (
          [ElderStatus.HOSPITALIZED, ElderStatus.DISCHARGE_PENDING].includes(
            elder.status,
          )
        ) {
          throw new BadRequestException(
            '该长者处于住院/出院待确认状态，请在「住院管理」中处理',
          );
        }
        const from = elder.status;
        elder.status = dto.newElderStatus;
        elder.statusNote = `异常工单#${ex.id}处理：${dto.resolution}`;
        if (dto.newElderStatus === ElderStatus.NORMAL) {
          elder.consecutiveMissed = 0;
        }
        await this.elderRepo.save(elder);
        await this.logRepo.save(
          this.logRepo.create({
            elderId: elder.id,
            fromStatus: from,
            toStatus: dto.newElderStatus,
            reason: `异常工单#${ex.id}：${dto.resolution}`,
            changedById: user.id,
          }),
        );
        // 暂停/住院 → 取消未来待配送任务
        if (
          [ElderStatus.PAUSED, ElderStatus.HOSPITALIZED].includes(
            dto.newElderStatus,
          )
        ) {
          const today = new Date().toISOString().slice(0, 10);
          const pendings = await this.taskRepo.find({
            where: { elderId: elder.id, status: TaskStatus.PENDING },
            relations: ['route'],
          });
          for (const t of pendings) {
            if (t.route && t.route.date >= today) {
              t.status = TaskStatus.CANCELLED;
              await this.taskRepo.save(t);
            }
          }
        }
      }
    }
    return ex;
  }
}
