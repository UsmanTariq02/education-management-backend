import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../constants/injection-tokens';
import { AuditLogRepository } from '../../modules/auth/interfaces/audit-log.repository.interface';

export interface CreateAuditLogPayload {
  actorUserId?: string;
  module: string;
  action: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async log(payload: CreateAuditLogPayload): Promise<void> {
    await this.auditLogRepository.create(payload);
  }
}
