import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAuditLogPayload } from '../../../common/services/audit-log.service';
import { AuditLogRepository } from '../interfaces/audit-log.repository.interface';

@Injectable()
export class AuditLogPrismaRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAuditLogPayload): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorUserId: payload.actorUserId,
      module: payload.module,
      action: payload.action,
      targetId: payload.targetId,
      metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonValue) : undefined,
    };

    await this.prisma.auditLog.create({
      data,
    });
  }
}
