import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsArray, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { DishesService } from './dishes.service';
import { Roles } from '../../common/decorators';
import { UserRole, MealType } from '../../common/enums';

class DishDto {
  @IsNotEmpty() name: string;
  @IsEnum(MealType) mealType: MealType;
  @IsOptional() description?: string;
  @IsOptional() @IsArray() allergens?: string[];
  @IsOptional() active?: boolean;
}

@Controller('dishes')
export class DishesController {
  constructor(private dishesService: DishesService) {}

  @Get()
  findAll(@Query('mealType') mealType?: MealType, @Query('all') all?: string) {
    return this.dishesService.findAll(mealType, all === '1');
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.KITCHEN_STAFF)
  create(@Body() dto: DishDto) {
    return this.dishesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.KITCHEN_STAFF)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: DishDto) {
    return this.dishesService.update(id, dto);
  }
}
