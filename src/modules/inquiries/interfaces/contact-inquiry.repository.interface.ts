import { ContactInquiry, ContactInquiryStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateContactInquiryDto } from '../dto/create-contact-inquiry.dto';

export interface ContactInquiryRepository {
  create(payload: CreateContactInquiryDto): Promise<ContactInquiry>;
  findMany(query: PaginationQueryDto): Promise<PaginatedResult<ContactInquiry>>;
  updateStatus(id: string, status: ContactInquiryStatus): Promise<ContactInquiry>;
}
