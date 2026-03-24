import { Inject, Injectable } from '@nestjs/common';
import { ContactInquiryStatus } from '@prisma/client';
import { CONTACT_INQUIRY_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { ContactInquiryRepository } from './interfaces/contact-inquiry.repository.interface';

@Injectable()
export class InquiriesService {
  constructor(
    @Inject(CONTACT_INQUIRY_REPOSITORY)
    private readonly contactInquiryRepository: ContactInquiryRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createContactInquiry(payload: CreateContactInquiryDto) {
    const inquiry = await this.contactInquiryRepository.create(payload);

    await this.auditLogService.log({
      module: 'contact-inquiries',
      action: 'create',
      targetId: inquiry.id,
      metadata: {
        email: inquiry.email,
        institutionName: inquiry.institutionName,
        institutionType: inquiry.institutionType,
        expectedUserCount: inquiry.expectedUserCount,
        requestedModules: inquiry.requestedModules,
      },
    });

    return inquiry;
  }

  async findAll(query: PaginationQueryDto) {
    return this.contactInquiryRepository.findMany(query);
  }

  async updateStatus(id: string, status: ContactInquiryStatus, actorUserId: string) {
    const inquiry = await this.contactInquiryRepository.updateStatus(id, status);

    await this.auditLogService.log({
      actorUserId,
      module: 'contact-inquiries',
      action: 'status-update',
      targetId: inquiry.id,
      metadata: {
        status: inquiry.status,
        email: inquiry.email,
        institutionName: inquiry.institutionName,
      },
    });

    return inquiry;
  }
}
