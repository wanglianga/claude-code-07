import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('overview')
  @Roles(
    UserRole.ADMIN,
    UserRole.COMMUNITY_WORKER,
    UserRole.NUTRITIONIST,
    UserRole.KITCHEN_STAFF,
    UserRole.VOLUNTEER,
  )
  overview() {
    return this.statsService.overview();
  }

  @Get('delivery-trend')
  @Roles(
    UserRole.ADMIN,
    UserRole.COMMUNITY_WORKER,
    UserRole.NUTRITIONIST,
    UserRole.KITCHEN_STAFF,
  )
  trend(@Query('days') days?: string) {
    return this.statsService.deliveryTrend(days ? parseInt(days, 10) : 7);
  }
}
