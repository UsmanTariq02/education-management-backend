import { CreateAuditLogPayload } from '../../../common/services/audit-log.service';

export interface AuditLogRepository {
  create(payload: CreateAuditLogPayload): Promise<void>;
}
