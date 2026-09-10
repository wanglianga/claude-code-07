import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dish } from '../../entities/dish.entity';
import { MealType } from '../../common/enums';

@Injectable()
export class DishesService {
  constructor(@InjectRepository(Dish) private dishRepo: Repository<Dish>) {}

  findAll(mealType?: MealType, includeInactive = false) {
    const where: any = {};
    if (mealType) where.mealType = mealType;
    if (!includeInactive) where.active = true;
    return this.dishRepo.find({ where, order: { id: 'ASC' } });
  }

  create(dto: Partial<Dish>) {
    return this.dishRepo.save(this.dishRepo.create(dto));
  }

  async update(id: number, dto: Partial<Dish>) {
    const dish = await this.dishRepo.findOne({ where: { id } });
    if (!dish) throw new NotFoundException('菜品不存在');
    Object.assign(dish, dto);
    return this.dishRepo.save(dish);
  }
}
