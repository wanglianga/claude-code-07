import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Elder } from '../../entities/elder.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import {
  ElderStatus,
  TaskStatus,
  RouteStatus,
  ExceptionStatus,
} from '../../common/enums';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
    @InjectRepository(DeliveryRoute) private routeRepo: Repository<DeliveryRoute>,
    @InjectRepository(DeliveryException) private exceptionRepo: Repository<DeliveryException>,
  ) {}

  async overview() {
    const today = new Date().toISOString().slice(0, 10);
    const elders = await this.elderRepo.find();
    const eldersByStatus: Record<string, number> = {};
    for (const s of Object.values(ElderStatus)) eldersByStatus[s] = 0;
    for (const e of elders) eldersByStatus[e.status] = (eldersByStatus[e.status] || 0) + 1;

    const todayRoutes = await this.routeRepo.find({ where: { date: today } });
    const routeIds = todayRoutes.map((r) => r.id);
    let todayTasks: DeliveryTask[] = [];
    if (routeIds.length) {
      todayTasks = await this.taskRepo
        .createQueryBuilder('t')
        .where('t.routeId IN (:...ids)', { ids: routeIds })
        .getMany();
    }
    const pendingExceptions = await this.exceptionRepo.count({
      where: { status: ExceptionStatus.PENDING },
    });
    const processingExceptions = await this.exceptionRepo.count({
      where: { status: ExceptionStatus.PROCESSING },
    });

    const monthStart = today.slice(0, 7) + '-01';
    const monthDelivered = await this.taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.route', 'r')
      .where('r.date >= :monthStart', { monthStart })
      .andWhere('t.status = :st', { st: TaskStatus.DELIVERED })
      .getCount();

    return {
      elderTotal: elders.length,
      eldersByStatus,
      today: {
        date: today,
        routeCount: todayRoutes.length,
        routeCompleted: todayRoutes.filter((r) => r.status === RouteStatus.COMPLETED).length,
        taskTotal: todayTasks.length,
        delivered: todayTasks.filter((t) => t.status === TaskStatus.DELIVERED).length,
        exception: todayTasks.filter((t) => t.status === TaskStatus.EXCEPTION).length,
        pending: todayTasks.filter((t) => t.status === TaskStatus.PENDING).length,
      },
      pendingExceptions,
      processingExceptions,
      monthDelivered,
    };
  }

  /** 近 N 天送达趋势 */
  async deliveryTrend(days = 7) {
    const result: { date: string; delivered: number; exception: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const routes = await this.routeRepo.find({ where: { date } });
      const ids = routes.map((r) => r.id);
      let delivered = 0;
      let exception = 0;
      if (ids.length) {
        const tasks = await this.taskRepo
          .createQueryBuilder('t')
          .where('t.routeId IN (:...ids)', { ids })
          .getMany();
        delivered = tasks.filter((t) => t.status === TaskStatus.DELIVERED).length;
        exception = tasks.filter((t) => t.status === TaskStatus.EXCEPTION).length;
      }
      result.push({ date, delivered, exception });
    }
    return result;
  }
}
