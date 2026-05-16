import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { PortalMailController } from './portal-mail.controller';

@Module({
  controllers: [MailController, PortalMailController],
  providers: [MailService],
})
export class MailModule {}
