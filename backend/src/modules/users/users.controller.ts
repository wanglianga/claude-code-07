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
import { IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

class CreateUserDto {
  @IsNotEmpty() username: string;
  @MinLength(6) password: string;
  @IsNotEmpty() name: string;
  @IsOptional() phone?: string;
  @IsEnum(UserRole) role: UserRole;
}

class UpdateUserDto {
  @IsOptional() name?: string;
  @IsOptional() phone?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() active?: boolean;
  @IsOptional() @MinLength(6) password?: string;
}

@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
