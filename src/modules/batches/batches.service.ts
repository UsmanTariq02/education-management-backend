import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BATCH_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { BatchRepository } from './interfaces/batch.repository.interface';

@Injectable()
export class BatchesService {
  constructor(
    @Inject(BATCH_REPOSITORY)
    private readonly batchRepository: BatchRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateBatchDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    const batch = await this.batchRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'batches',
      action: 'create',
      targetId: batch.id,
      metadata: {
        name: batch.name,
        code: batch.code,
        isActive: batch.isActive,
      },
    });
    return batch;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.batchRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const batch = await this.batchRepository.findById(id);
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && batch.organizationId !== actor.organizationId) {
      throw new NotFoundException('Batch not found');
    }
    return batch;
  }

  async update(id: string, payload: UpdateBatchDto, actor: CurrentUserContext) {
    const batch = await this.batchRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'batches',
      action: 'update',
      targetId: id,
      metadata: {
        name: batch.name,
        code: batch.code,
        isActive: batch.isActive,
      },
    });
    return batch;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.batchRepository.delete(id);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'batches',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
