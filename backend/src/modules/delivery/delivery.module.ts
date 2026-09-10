import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryRoute } from '../../entities/delivery-route.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { DeliveryException } from '../../entities/delivery-exception.entity';
import { HospitalDisposal } from '../../entities/hospital-disposal.entity';
import { Elder } from '../../entities/elder.entity';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryRoute,
      DeliveryTask,
      DeliveryException,
      HospitalDisposal,
      Elder,
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
