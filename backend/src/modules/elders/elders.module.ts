import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Elder } from '../../entities/elder.entity';
import { ElderStatusLog } from '../../entities/elder-status-log.entity';
import { NutritionAdvice } from '../../entities/nutrition-advice.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import { EldersService } from './elders.service';
import { EldersController } from './elders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Elder,
      ElderStatusLog,
      NutritionAdvice,
      DeliveryTask,
      DeliveryException,
    ]),
  ],
  controllers: [EldersController],
  providers: [EldersService],
  exports: [EldersService],
})
export class EldersModule {}
