import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsNotEmpty, Matches } from 'class-validator';
import { SettlementsService } from './settlements.service';
import { Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

class GenerateDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: '周期格式应为 YYYY-MM' })
  period: string;
}

@Controller('settlements')
@Roles(UserRole.ADMIN, UserRole.COMMUNITY_WORKER)
export class SettlementsController {
  constructor(private settlementsService: SettlementsService) {}

  @Get()
  list(@Query('period') period?: string) {
    return this.settlementsService.list(period);
  }

  @Post('generate')
  generate(@Body() dto: GenerateDto) {
    return this.settlementsService.generate(dto.period);
  }

  @Post(':id/settle')
  settle(@Param('id', ParseIntPipe) id: number) {
    return this.settlementsService.settle(id);
  }
}
