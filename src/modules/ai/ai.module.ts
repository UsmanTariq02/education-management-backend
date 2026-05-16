import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { NoticeCampaignAutomationService } from './notice-campaign-automation.service';

@Module({
  controllers: [AiController],
  providers: [AiService, NoticeCampaignAutomationService],
})
export class AiModule {}
