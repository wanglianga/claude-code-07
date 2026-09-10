import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Elder } from '../entities/elder.entity';
import { ElderStatusLog } from '../entities/elder-status-log.entity';
import { NutritionAdvice } from '../entities/nutrition-advice.entity';
import { Dish } from '../entities/dish.entity';
import { MealSchedule } from '../entities/meal-schedule.entity';
import { DeliveryRoute } from '../entities/delivery-route.entity';
import { DeliveryTask } from '../entities/delivery-task.entity';
import { DeliveryException } from '../entities/delivery-exception.entity';
import { HospitalRecord } from '../entities/hospital-record.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Elder,
      ElderStatusLog,
      NutritionAdvice,
      Dish,
      MealSchedule,
      DeliveryRoute,
      DeliveryTask,
      DeliveryException,
      HospitalRecord,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
