import { Injectable } from '@nestjs/common';
import { ContactInquiry, ContactInquiryStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateContactInquiryDto } from '../dto/create-contact-inquiry.dto';
import { ContactInquiryRepository } from '../interfaces/contact-inquiry.repository.interface';

@Injectable()
export class ContactInquiryPrismaRepository implements ContactInquiryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateContactInquiryDto): Promise<ContactInquiry> {
    return this.prisma.contactInquiry.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        institutionName: payload.institutionName,
        phone: payload.phone,
        institutionType: payload.institutionType,
        expectedUserCount: payload.expectedUserCount,
        requestedModules: payload.requestedModules,
        inquiryType: payload.inquiryType,
        message: payload.message,
      },
    });
  }

  async findMany(query: PaginationQueryDto): Promise<PaginatedResult<ContactInquiry>> {
    const where: Prisma.ContactInquiryWhereInput = query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { institutionName: { contains: query.search, mode: 'insensitive' } },
            { message: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactInquiry.findMany({
        where,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.contactInquiry.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async updateStatus(id: string, status: ContactInquiryStatus): Promise<ContactInquiry> {
    return this.prisma.contactInquiry.update({
      where: { id },
      data: { status },
    });
  }
}
