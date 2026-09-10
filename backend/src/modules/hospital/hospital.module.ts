import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HospitalRecord } from '../../entities/hospital-record.entity';
import { HospitalDisposal } from '../../entities/hospital-disposal.entity';
import { KitchenLoss } from '../../entities/kitchen-loss.entity';
import { Elder } from '../../entities/elder.entity';
import { ElderStatusLog } from '../../entities/elder-status-log.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { MealSchedule } from '../../entities/meal-schedule.entity';
import { NutritionAdvice } from '../../entities/nutrition-advice.entity';
import { HospitalService } from './hospital.service';
import { HospitalController } from './hospital.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HospitalRecord,
      HospitalDisposal,
      KitchenLoss,
      Elder,
      ElderStatusLog,
      DeliveryTask,
      DeliveryRoute,
      MealSchedule,
      NutritionAdvice,
    ]),
  ],
  controllers: [HospitalController],
  providers: [HospitalService],
  exports: [HospitalService],
})
export class HospitalModule {}
