import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NutritionAdvice } from '../../entities/nutrition-advice.entity';
import { Elder } from '../../entities/elder.entity';
import { MealType } from '../../common/enums';

@Injectable()
export class NutritionService {
  constructor(
    @InjectRepository(NutritionAdvice) private adviceRepo: Repository<NutritionAdvice>,
    @InjectRepository(Elder) private elderRepo: Repository<Elder>,
  ) {}

  async list(elderId?: number) {
    const where: any = {};
    if (elderId) where.elderId = elderId;
    return this.adviceRepo.find({
      where,
      relations: ['elder', 'nutritionist'],
      order: { createdAt: 'DESC' },
    });
  }

  /** 当前生效建议（覆盖今日且 active） */
  async currentAdvices(date: string) {
    const advices = await this.adviceRepo.find({
      where: { active: true },
      relations: ['elder'],
    });
    return advices.filter(
      (a) => a.startDate <= date && (!a.endDate || a.endDate >= date),
    );
  }

  async create(
    dto: {
      elderId: number;
      mealType: MealType;
      startDate: string;
      endDate?: string;
      note?: string;
    },
    nutritionistId: number,
  ) {
    const elder = await this.elderRepo.findOne({ where: { id: dto.elderId } });
    if (!elder) throw new NotFoundException('长者不存在');
    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('结束日期不能早于开始日期');
    }
    // 新建议生效后，旧建议自动失效
    await this.adviceRepo.update({ elderId: dto.elderId, active: true }, { active: false });
    const advice = this.adviceRepo.create({
      ...dto,
      active: true,
      nutritionistId,
    });
    return this.adviceRepo.save(advice);
  }

  async update(
    id: number,
    dto: { mealType?: MealType; startDate?: string; endDate?: string; note?: string; active?: boolean },
  ) {
    const advice = await this.adviceRepo.findOne({ where: { id } });
    if (!advice) throw new NotFoundException('建议不存在');
    Object.assign(advice, dto);
    return this.adviceRepo.save(advice);
  }
}
