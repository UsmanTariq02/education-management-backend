import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnlineClassesService } from './online-classes.service';

@Injectable()
export class OnlineClassesAutomationService {
  constructor(private readonly onlineClassesService: OnlineClassesService) {}

  @Cron('0 */15 * * * *')
  async handleAutomationCycle(): Promise<void> {
    await this.onlineClassesService.runAutomationCycle();
  }
}
