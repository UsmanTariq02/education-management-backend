import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { randomUUID } from 'crypto';
import { OrganizationAssetType, StudentDocumentType } from '@prisma/client';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationAssetDto } from './dto/create-organization-asset.dto';
import { CreateStudentDocumentDto } from './dto/create-student-document.dto';

@Injectable()
export class MediaService {
  private readonly uploadsRoot = join(process.cwd(), 'uploads', 'media');

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listStudentDocuments(studentId: string, actor: CurrentUserContext) {
    const organizationId = await this.resolveStudentOrganization(studentId, actor);
    return this.prisma.studentDocument.findMany({
      where: { studentId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadStudentDocument(
    studentId: string,
    payload: CreateStudentDocumentDto,
    file: Express.Multer.File,
    actor: CurrentUserContext,
  ) {
    const organizationId = await this.resolveStudentOrganization(studentId, actor);
    const storagePath = await this.storeFile(file, 'students', organizationId, studentId);
    const document = await this.prisma.studentDocument.create({
      data: {
        organizationId,
        studentId,
        uploadedByUserId: actor.userId,
        title: payload.title,
        type: payload.type,
        notes: payload.notes,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
      },
    });

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'student-documents',
      action: 'upload',
      targetId: document.id,
      metadata: { studentId, type: payload.type, title: payload.title },
    });

    return document;
  }

  async deleteStudentDocument(studentId: string, documentId: string, actor: CurrentUserContext) {
    const organizationId = await this.resolveStudentOrganization(studentId, actor);
    const document = await this.prisma.studentDocument.findFirst({
      where: { id: documentId, studentId, organizationId },
    });

    if (!document) {
      throw new NotFoundException('Student document not found');
    }

    await this.prisma.studentDocument.delete({ where: { id: documentId } });
    await this.deleteStoredFile(document.storagePath);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'student-documents',
      action: 'delete',
      targetId: documentId,
      metadata: { studentId, title: document.title },
    });
  }

  async getStudentDocumentDownload(studentId: string, documentId: string, actor: CurrentUserContext) {
    const organizationId = await this.resolveStudentOrganization(studentId, actor);
    const document = await this.prisma.studentDocument.findFirst({
      where: { id: documentId, studentId, organizationId },
    });

    if (!document) {
      throw new NotFoundException('Student document not found');
    }

    return {
      filename: document.originalName,
      mimeType: document.mimeType,
      stream: createReadStream(document.storagePath),
    };
  }

  async listOrganizationAssets(actor: CurrentUserContext) {
    const organizationId = this.requireTenantOrganization(actor);
    return this.prisma.organizationAsset.findMany({
      where: { organizationId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async uploadOrganizationAsset(payload: CreateOrganizationAssetDto, file: Express.Multer.File, actor: CurrentUserContext) {
    const organizationId = this.requireTenantOrganization(actor);
    const storagePath = await this.storeFile(file, 'organizations', organizationId);
    const asset = await this.prisma.organizationAsset.create({
      data: {
        organizationId,
        uploadedByUserId: actor.userId,
        title: payload.title,
        type: payload.type,
        notes: payload.notes,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
      },
    });

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'organization-assets',
      action: 'upload',
      targetId: asset.id,
      metadata: { type: payload.type, title: payload.title },
    });

    return asset;
  }

  async deleteOrganizationAsset(assetId: string, actor: CurrentUserContext) {
    const organizationId = this.requireTenantOrganization(actor);
    const asset = await this.prisma.organizationAsset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) {
      throw new NotFoundException('Organization asset not found');
    }

    await this.prisma.organizationAsset.delete({ where: { id: assetId } });
    await this.deleteStoredFile(asset.storagePath);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'organization-assets',
      action: 'delete',
      targetId: assetId,
      metadata: { title: asset.title, type: asset.type },
    });
  }

  async getOrganizationAssetDownload(assetId: string, actor: CurrentUserContext) {
    const organizationId = this.requireTenantOrganization(actor);
    const asset = await this.prisma.organizationAsset.findFirst({
      where: { id: assetId, organizationId },
    });

    if (!asset) {
      throw new NotFoundException('Organization asset not found');
    }

    return {
      filename: asset.originalName,
      mimeType: asset.mimeType,
      stream: createReadStream(asset.storagePath),
    };
  }

  private requireTenantOrganization(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    return actor.organizationId;
  }

  private async resolveStudentOrganization(studentId: string, actor: CurrentUserContext): Promise<string> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, organizationId: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && actor.organizationId !== student.organizationId) {
      throw new NotFoundException('Student not found');
    }
    return student.organizationId;
  }

  private async storeFile(file: Express.Multer.File, bucket: 'students' | 'organizations', organizationId: string, studentId?: string) {
    const extension = extname(file.originalname);
    const basePath = studentId
      ? join(this.uploadsRoot, bucket, organizationId, studentId)
      : join(this.uploadsRoot, bucket, organizationId);
    await mkdir(basePath, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    const storagePath = join(basePath, filename);
    await writeFile(storagePath, file.buffer);
    return storagePath;
  }

  private async deleteStoredFile(storagePath: string) {
    await rm(storagePath, { force: true });
    await mkdir(dirname(storagePath), { recursive: true });
  }
}
