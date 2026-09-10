import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Elder } from '../../entities/elder.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Elder, DeliveryTask, DeliveryRoute, DeliveryException]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
