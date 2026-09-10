import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import { HospitalDisposal } from '../../entities/hospital-disposal.entity';
import { Elder } from '../../entities/elder.entity';
import {
  RouteStatus,
  TaskStatus,
  ElderCondition,
  ExceptionType,
  ExceptionStatus,
  SignMethod,
  UserRole,
  DisposalStatus,
} from '../../common/enums';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryRoute) private routeRepo: Repository<DeliveryRoute>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
    @InjectRepository(DeliveryException) private exceptionRepo: Repository<DeliveryException>,
    @InjectRepository(HospitalDisposal) private disposalRepo: Repository<HospitalDisposal>,
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
  ) {}

  /** 任务是否有待处置的住院处置单（有则禁止正常送达/异常操作） */
  private async pendingDisposalTaskIds(taskIds: number[]): Promise<Set<number>> {
    if (!taskIds.length) return new Set();
    const list = await this.disposalRepo.find({
      where: { taskId: In(taskIds), status: DisposalStatus.PENDING },
    });
    return new Set(list.map((d) => d.taskId));
  }

  /** 路线列表：志愿者看待接单+自己的；管理角色看全部 */
  async listRoutes(date: string, user: { id: number; role: UserRole }) {
    const routes = await this.routeRepo.find({
      where: { date },
      relations: ['volunteer'],
      order: { id: 'ASC' },
    });
    const withProgress = await Promise.all(
      routes.map(async (r) => {
        const tasks = await this.taskRepo.find({ where: { routeId: r.id } });
        const done = tasks.filter(
          (t) => t.status !== TaskStatus.PENDING,
        ).length;
        return { ...r, taskCount: tasks.length, doneCount: done };
      }),
    );
    if (user.role === UserRole.VOLUNTEER) {
      return withProgress.filter(
        (r) => r.status === RouteStatus.OPEN || r.volunteerId === user.id,
      );
    }
    return withProgress;
  }

  async routeDetail(id: number, user: { id: number; role: UserRole }) {
    const route = await this.routeRepo.findOne({
      where: { id },
      relations: ['volunteer'],
    });
    if (!route) throw new NotFoundException('路线不存在');
    if (
      user.role === UserRole.VOLUNTEER &&
      route.volunteerId &&
      route.volunteerId !== user.id
    ) {
      throw new ForbiddenException('无权查看他人路线');
    }
    const tasks = await this.taskRepo.find({
      where: { routeId: id },
      order: { sequence: 'ASC' },
    });
    const exceptions = await this.exceptionRepo.find({
      where: { taskId: In(tasks.map((t) => t.id).concat([0])) },
      order: { createdAt: 'DESC' },
    });
    const hospitalPending = await this.pendingDisposalTaskIds(tasks.map((t) => t.id));
    return {
      ...route,
      tasks,
      exceptions,
      hospitalPendingTaskIds: Array.from(hospitalPending),
    };
  }

  async acceptRoute(id: number, user: { id: number }) {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) throw new NotFoundException('路线不存在');
    if (route.status !== RouteStatus.OPEN) {
      throw new BadRequestException('该路线已被接单');
    }
    route.volunteerId = user.id;
    route.status = RouteStatus.ACCEPTED;
    return this.routeRepo.save(route);
  }

  async startRoute(id: number, user: { id: number }) {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) throw new NotFoundException('路线不存在');
    if (route.volunteerId !== user.id) throw new ForbiddenException('非本人路线');
    if (route.status !== RouteStatus.ACCEPTED) {
      throw new BadRequestException('路线状态不正确');
    }
    route.status = RouteStatus.IN_PROGRESS;
    return this.routeRepo.save(route);
  }

  private async checkRouteCompletion(routeId: number) {
    const tasks = await this.taskRepo.find({ where: { routeId } });
    if (
      tasks.length > 0 &&
      tasks.every((t) => t.status !== TaskStatus.PENDING)
    ) {
      await this.routeRepo.update(routeId, { status: RouteStatus.COMPLETED });
    }
  }

  /** 送达登记 */
  async deliver(
    taskId: number,
    user: { id: number },
    dto: {
      temperature: number;
      signMethod: SignMethod;
      signerName: string;
      signerRelation?: string;
      elderCondition: ElderCondition;
      hasLeftover?: boolean;
    },
  ) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['route'],
    });
    if (!task) throw new NotFoundException('配送任务不存在');
    if (task.route.volunteerId !== user.id) {
      throw new ForbiddenException('非本人配送任务');
    }
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('任务已处理，不能重复登记');
    }
    if ((await this.pendingDisposalTaskIds([task.id])).size > 0) {
      throw new BadRequestException(
        '该餐涉及老人住院，请先在「住院管理」完成餐盒处置（退回厨房/转交同楼栋老人/报损）',
      );
    }
    if (
      ![RouteStatus.ACCEPTED, RouteStatus.IN_PROGRESS].includes(
        task.route.status,
      )
    ) {
      throw new BadRequestException('路线未开始配送');
    }
    task.status = TaskStatus.DELIVERED;
    task.temperature = dto.temperature;
    task.signMethod = dto.signMethod;
    task.signerName = dto.signerName;
    task.signerRelation = dto.signerRelation || null;
    task.elderCondition = dto.elderCondition;
    task.hasLeftover = !!dto.hasLeftover;
    task.deliveredAt = new Date();
    await this.taskRepo.save(task);

    // 签收成功：清零连续未签收
    await this.elderRepo.update(task.elderId, { consecutiveMissed: 0 });

    // 老人状态较差 → 自动生成健康异常工单给社区工作人员
    if (dto.elderCondition === ElderCondition.POOR) {
      await this.exceptionRepo.save(
        this.exceptionRepo.create({
          taskId: task.id,
          type: ExceptionType.HEALTH_ABNORMAL,
          description: `送达时观察到老人状态较差，建议社区跟进（配送员登记）`,
          reportedById: user.id,
          status: ExceptionStatus.PENDING,
        }),
      );
    }
    // 首次送达自动把路线置为配送中
    if (task.route.status === RouteStatus.ACCEPTED) {
      await this.routeRepo.update(task.routeId, {
        status: RouteStatus.IN_PROGRESS,
      });
    }
    await this.checkRouteCompletion(task.routeId);
    return task;
  }

  /** 异常上报 */
  async reportException(
    taskId: number,
    user: { id: number },
    dto: { type: ExceptionType; description?: string },
  ) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['route'],
    });
    if (!task) throw new NotFoundException('配送任务不存在');
    if (task.route.volunteerId !== user.id) {
      throw new ForbiddenException('非本人配送任务');
    }
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('任务已处理');
    }
    if ((await this.pendingDisposalTaskIds([task.id])).size > 0) {
      throw new BadRequestException(
        '该餐涉及老人住院，请先在「住院管理」完成餐盒处置（退回厨房/转交同楼栋老人/报损）',
      );
    }
    task.status = TaskStatus.EXCEPTION;
    await this.taskRepo.save(task);
    const exception = await this.exceptionRepo.save(
      this.exceptionRepo.create({
        taskId: task.id,
        type: dto.type,
        description: dto.description,
        reportedById: user.id,
        status: ExceptionStatus.PENDING,
      }),
    );
    // 老人不在家 → 连续未签收 +1（用于路线调整）
    if (dto.type === ExceptionType.NOT_HOME) {
      await this.elderRepo.increment(
        { id: task.elderId },
        'consecutiveMissed',
        1,
      );
    }
    if (task.route.status === RouteStatus.ACCEPTED) {
      await this.routeRepo.update(task.routeId, {
        status: RouteStatus.IN_PROGRESS,
      });
    }
    await this.checkRouteCompletion(task.routeId);
    return exception;
  }
}
