import { Module } from '@nestjs/common';
import { ResearchAuthController } from './research-auth.controller';
import { ResearchAuthService } from './research-auth.service';

@Module({
  controllers: [ResearchAuthController],
  providers: [ResearchAuthService],
  exports: [ResearchAuthService],
})
export class ResearchAuthModule {}
