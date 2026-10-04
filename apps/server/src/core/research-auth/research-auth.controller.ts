import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
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
  private readonly logger = new Logger(ResearchAuthController.name);

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
  async register(
    @Body() dto: RegisterResearchUserDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.researchAuthService.register(dto);
    try {
      const session = await this.researchAuthService.syncSession(
        {
          studentId: result.user.studentId,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        res,
      );
      return {
        ...result,
        sessionToken: session?.token,
        workspaceId: session?.workspaceId,
        spaceId: session?.spaceId,
        spaceSlug: session?.spaceSlug,
      };
    } catch (sessionErr: any) {
      this.logger.warn(`syncSession failed gracefully during register: ${sessionErr?.message}`);
      return result;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginResearchUserDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.researchAuthService.login(dto);
    try {
      const session = await this.researchAuthService.syncSession(
        {
          studentId: result.user.studentId,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        res,
      );
      return {
        ...result,
        sessionToken: session?.token,
        workspaceId: session?.workspaceId,
        spaceId: session?.spaceId,
        spaceSlug: session?.spaceSlug,
      };
    } catch (sessionErr: any) {
      this.logger.warn(`syncSession failed gracefully during login: ${sessionErr?.message}`);
      return result;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('sync-session')
  async syncSession(
    @Body() dto: { studentId?: string; email?: string; name?: string; role?: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.researchAuthService.syncSession(dto, res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create-note')
  async createNote(
    @Body() dto: {
      title: string;
      content?: string;
      projectId?: string;
      isPublished?: boolean;
      authorName?: string;
      authorStudentId?: string;
      authorId?: string;
      spaceId?: string;
    },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.researchAuthService.syncSession(
      { studentId: dto.authorStudentId, name: dto.authorName },
      res,
    );
    return this.researchAuthService.createResearchNote(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('notes')
  async getNotes(@Query('projectId') projectId?: string) {
    return this.researchAuthService.getResearchNotes(projectId);
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

