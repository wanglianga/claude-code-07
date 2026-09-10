import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { SubsidySettlement } from '../../entities/subsidy-settlement.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { Elder } from '../../entities/elder.entity';
import {
  TaskStatus,
  SignMethod,
  SubsidyLevel,
  SettlementStatus,
  SUBSIDY_UNIT_PRICE,
} from '../../common/enums';

@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(SubsidySettlement) private settlementRepo: Repository<SubsidySettlement>,
    @InjectRepository(DeliveryTask) private taskRepo: Repository<DeliveryTask>,
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
  ) {}

  async list(period?: string) {
    const where: any = {};
    if (period) where.period = period;
    return this.settlementRepo.find({
      where,
      relations: ['elder'],
      order: { period: 'DESC', elderId: 'ASC' },
    });
  }

  /**
   * 生成某月补贴结算：
   * 实际送达（含代收确认）× 补贴单价；异常退餐不计入；
   * 补贴单价取结算时老人档案的补贴资格（档案变化自动生效）。
   */
  async generate(period: string) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('结算周期格式应为 YYYY-MM');
    }
    const [y, m] = period.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const elders = await this.elderRepo.find({
      where: { subsidyLevel: In([SubsidyLevel.PARTIAL, SubsidyLevel.FULL]) },
    });
    const results: SubsidySettlement[] = [];
    for (const elder of elders) {
      const existing = await this.settlementRepo.findOne({
        where: { elderId: elder.id, period },
      });
      if (existing && existing.status === SettlementStatus.SETTLED) continue;

      const tasks = await this.taskRepo.find({
        where: {
          elderId: elder.id,
          createdAt: Between(start, end),
        },
      });
      const delivered = tasks.filter((t) => t.status === TaskStatus.DELIVERED);
      const exceptions = tasks.filter((t) => t.status === TaskStatus.EXCEPTION);
      const proxy = delivered.filter((t) => t.signMethod !== SignMethod.SELF);
      const unit = SUBSIDY_UNIT_PRICE[elder.subsidyLevel] || 0;
      const total = delivered.length * unit;

      const entity = existing || this.settlementRepo.create({ elderId: elder.id, period });
      entity.deliveredCount = delivered.length;
      entity.exceptionCount = exceptions.length;
      entity.proxyCount = proxy.length;
      entity.unitSubsidy = unit;
      entity.totalAmount = total;
      entity.status = SettlementStatus.PENDING;
      results.push(await this.settlementRepo.save(entity));
    }
    return results;
  }

  async settle(id: number) {
    const s = await this.settlementRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('结算单不存在');
    if (s.status === SettlementStatus.SETTLED) {
      throw new BadRequestException('该结算单已结算');
    }
    s.status = SettlementStatus.SETTLED;
    return this.settlementRepo.save(s);
  }
}
