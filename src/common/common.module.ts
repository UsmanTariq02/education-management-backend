import { Global, Module } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from './constants/injection-tokens';
import { AuditLogService } from './services/audit-log.service';
import { FileLogService } from './services/file-log.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { AuditLogPrismaRepository } from '../modules/auth/repositories/audit-log-prisma.repository';
import { OrganizationAccessService } from './services/organization-access.service';

@Global()
@Module({
  providers: [
    AuditLogService,
    FileLogService,
    OrganizationAccessService,
    GlobalExceptionFilter,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogPrismaRepository,
    },
  ],
  exports: [AuditLogService, FileLogService, GlobalExceptionFilter, OrganizationAccessService],
})
export class CommonModule {}
