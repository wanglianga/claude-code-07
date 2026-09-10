import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealSchedule } from '../../entities/meal-schedule.entity';
import { NutritionAdvice } from '../../entities/nutrition-advice.entity';
import { Elder } from '../../entities/elder.entity';
import { Dish } from '../../entities/dish.entity';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MealSchedule,
      NutritionAdvice,
      Elder,
      Dish,
      DeliveryRoute,
      DeliveryTask,
    ]),
  ],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}
