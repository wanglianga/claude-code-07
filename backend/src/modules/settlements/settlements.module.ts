import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubsidySettlement } from '../../entities/subsidy-settlement.entity';
import { DeliveryTask } from '../../entities/delivery-task.entity';
import { Elder } from '../../entities/elder.entity';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubsidySettlement, DeliveryTask, Elder]),
  ],
  controllers: [SettlementsController],
  providers: [SettlementsService],
})
export class SettlementsModule {}
