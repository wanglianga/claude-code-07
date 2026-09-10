import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, MoreThan } from 'typeorm';
import { Elder } from '../../entities/elder.entity';
import { ElderStatusLog } from '../../entities/elder-status-log.entity';
import { NutritionAdvice } from '../../entities/nutrition-advice.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import {
  ElderStatus,
  TaskStatus,
  ExceptionStatus,
  UserRole,
} from '../../common/enums';

@Injectable()
export class EldersService {
  constructor(
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
    @InjectRepository(ElderStatusLog) private logRepo: Repository<ElderStatusLog>,
    @InjectRepository(NutritionAdvice) private adviceRepo: Repository<NutritionAdvice>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
    @InjectRepository(DeliveryException) private exceptionRepo: Repository<DeliveryException>,
  ) {}

  async findAll(query: { status?: ElderStatus; keyword?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.keyword) where.name = Like(`%${query.keyword}%`);
    return this.elderRepo.find({
      where,
      relations: ['communityWorker'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const elder = await this.elderRepo.findOne({
      where: { id },
      relations: ['communityWorker'],
    });
    if (!elder) throw new NotFoundException('长者档案不存在');
    const [advices, statusLogs, recentTasks, exceptions] = await Promise.all([
      this.adviceRepo.find({
        where: { elderId: id },
        relations: ['nutritionist'],
        order: { createdAt: 'DESC' },
      }),
      this.logRepo.find({
        where: { elderId: id },
        relations: ['changedBy'],
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.taskRepo.find({
        where: { elderId: id },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.exceptionRepo.find({
        where: { task: { elderId: id } },
        relations: ['task', 'reportedBy'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);
    return { ...elder, advices, statusLogs, recentTasks, exceptions };
  }

  async create(dto: Partial<Elder>, workerId: number) {
    const elder = this.elderRepo.create({ ...dto, communityWorkerId: workerId });
    const saved = await this.elderRepo.save(elder);
    await this.logRepo.save(
      this.logRepo.create({
        elderId: saved.id,
        fromStatus: null,
        toStatus: saved.status,
        reason: '建立用餐档案',
        changedById: workerId,
      }),
    );
    return saved;
  }

  async update(id: number, dto: Partial<Elder>) {
    const elder = await this.elderRepo.findOne({ where: { id } });
    if (!elder) throw new NotFoundException('长者档案不存在');
    // 状态不允许通过普通编辑修改，必须走状态变更接口留痕
    delete (dto as any).status;
    delete (dto as any).consecutiveMissed;
    Object.assign(elder, dto);
    return this.elderRepo.save(elder);
  }

  async changeStatus(
    id: number,
    toStatus: ElderStatus,
    reason: string,
    operator: { id: number; role: UserRole },
  ) {
    const elder = await this.elderRepo.findOne({ where: { id } });
    if (!elder) throw new NotFoundException('长者档案不存在');
    if (elder.status === toStatus) {
      throw new BadRequestException('状态未发生变化');
    }
    const fromStatus = elder.status;
    elder.status = toStatus;
    elder.statusNote = reason || elder.statusNote;
    // 恢复正常时清零连续未签收计数
    if (toStatus === ElderStatus.NORMAL) elder.consecutiveMissed = 0;
    await this.elderRepo.save(elder);
    await this.logRepo.save(
      this.logRepo.create({
        elderId: id,
        fromStatus,
        toStatus,
        reason,
        changedById: operator.id,
      }),
    );
    // 暂停/住院：取消未来待配送任务
    if ([ElderStatus.PAUSED, ElderStatus.HOSPITALIZED].includes(toStatus)) {
      const today = new Date().toISOString().slice(0, 10);
      const pendingTasks = await this.taskRepo.find({
        where: { elderId: id, status: TaskStatus.PENDING },
        relations: ['route'],
      });
      for (const t of pendingTasks) {
        if (t.route && t.route.date >= today) {
          t.status = TaskStatus.CANCELLED;
          await this.taskRepo.save(t);
        }
      }
    }
    return elder;
  }
}
