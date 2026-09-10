import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { Elder } from '../../entities/elder.entity';
import { ElderStatusLog } from '../../entities/elder-status-log.entity';
import { ExceptionsService } from './exceptions.service';
import { ExceptionsController } from './exceptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryException,
      DeliveryTask,
      Elder,
      ElderStatusLog,
    ]),
  ],
  controllers: [ExceptionsController],
  providers: [ExceptionsService],
})
export class ExceptionsModule {}
