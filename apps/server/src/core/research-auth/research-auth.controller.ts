import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  LoginResearchUserDto,
  RegisterResearchUserDto,
  SendOtpDto,
  VerifyOtpDto,
  VerifyStudentDto,
} from './dto/research-auth.dto';
import { ResearchAuthService } from './research-auth.service';

@Controller('research')
export class ResearchAuthController {
  constructor(private readonly researchAuthService: ResearchAuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('verify-student')
  async verifyStudent(@Body() dto: VerifyStudentDto) {
    return this.researchAuthService.verifyStudent(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('send-otp')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.researchAuthService.sendOtp(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.researchAuthService.verifyOtp(dto);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: RegisterResearchUserDto) {
    return this.researchAuthService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginResearchUserDto) {
    return this.researchAuthService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('clean-all-accounts')
  async cleanAllAccountsGet() {
    return this.researchAuthService.cleanAllAccounts();
  }

  @HttpCode(HttpStatus.OK)
  @Post('clean-all-accounts')
  async cleanAllAccounts() {
    return this.researchAuthService.cleanAllAccounts();
  }
}
