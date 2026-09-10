import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';
import { Public, CurrentUser } from '../../common/decorators';

class LoginDto {
  @IsNotEmpty({ message: '请输入用户名' })
  username: string;

  @IsNotEmpty({ message: '请输入密码' })
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('profile')
  profile(@CurrentUser() user: any) {
    return this.authService.profile(user.id);
  }
}
