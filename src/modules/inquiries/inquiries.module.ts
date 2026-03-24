import { Module } from '@nestjs/common';
import { CONTACT_INQUIRY_REPOSITORY } from '../../common/constants/injection-tokens';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { ContactInquiryPrismaRepository } from './repositories/contact-inquiry-prisma.repository';

@Module({
  controllers: [InquiriesController],
  providers: [
    InquiriesService,
    {
      provide: CONTACT_INQUIRY_REPOSITORY,
      useClass: ContactInquiryPrismaRepository,
    },
  ],
})
export class InquiriesModule {}
