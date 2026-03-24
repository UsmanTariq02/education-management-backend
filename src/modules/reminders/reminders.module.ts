import { Module } from '@nestjs/common';
import {
  EMAIL_REMINDER_PROVIDER,
  REMINDER_REPOSITORY,
  WHATSAPP_REMINDER_PROVIDER,
} from '../../common/constants/injection-tokens';
import { ConfigModule } from '@nestjs/config';
import { ReminderPrismaRepository } from './repositories/reminder-prisma.repository';
import { RemindersController } from './reminders.controller';
import { ReminderAutomationService } from './reminder-automation.service';
import { ReminderDeliveryService } from './reminder-delivery.service';
import { RemindersService } from './reminders.service';
import { EmailReminderProvider } from './providers/email-reminder.provider';
import { WhatsAppReminderProvider } from './providers/whatsapp-reminder.provider';

@Module({
  imports: [ConfigModule],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    ReminderAutomationService,
    ReminderDeliveryService,
    {
      provide: EMAIL_REMINDER_PROVIDER,
      useClass: EmailReminderProvider,
    },
    {
      provide: WHATSAPP_REMINDER_PROVIDER,
      useClass: WhatsAppReminderProvider,
    },
    {
      provide: REMINDER_REPOSITORY,
      useClass: ReminderPrismaRepository,
    },
  ],
  exports: [REMINDER_REPOSITORY, ReminderAutomationService],
})
export class RemindersModule {}
