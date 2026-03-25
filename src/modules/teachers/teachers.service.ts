import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TEACHER_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { OrganizationAccessService } from '../../common/services/organization-access.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeacherRepository, TeacherView } from './interfaces/teacher.repository.interface';

const teacherWithOrganization = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TeacherInclude;

@Injectable()
export class TeachersService {
  constructor(
    @Inject(TEACHER_REPOSITORY)
    private readonly teacherRepository: TeacherRepository,
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly auditLogService: AuditLogService,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async create(payload: CreateTeacherDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    let teacher: TeacherView;

    if (payload.createLoginAccess) {
      if (!payload.email) {
        throw new ForbiddenException('Teacher email is required to create login access');
      }
      if (!payload.accessPassword) {
        throw new ForbiddenException('Access password is required to create login access');
      }
      const teacherEmail = payload.email.trim().toLowerCase();

      await this.organizationAccessService.assertModuleEnabled(actor.organizationId, OrganizationModule.USERS);
      await this.organizationAccessService.assertUserLimitNotReached(actor.organizationId);

      const teacherRole = (await this.rolesService.findAll()).find((role) => role.name === 'TEACHER');
      if (!teacherRole) {
        throw new NotFoundException('Teacher role is not configured');
      }

      const passwordHash = await PasswordUtil.hash(payload.accessPassword);
      const created = await this.prisma.$transaction(async (tx) => {
        const createdTeacher = await tx.teacher.create({
          data: {
            employeeId: payload.employeeId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            phone: payload.phone,
            qualification: payload.qualification,
            specialization: payload.specialization,
            joinedAt: payload.joinedAt,
            isActive: payload.isActive,
            organizationId: actor.organizationId!,
            fullName: `${payload.firstName} ${payload.lastName}`.trim(),
          },
          include: teacherWithOrganization,
        });

        const createdUser = await tx.user.create({
          data: {
            organizationId: actor.organizationId!,
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: teacherEmail,
            passwordHash,
            isActive: payload.accessIsActive ?? payload.isActive,
          },
        });

        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: teacherRole.id,
          },
        });

        return createdTeacher;
      });

      teacher = this.toView(created);
    } else {
      teacher = await this.teacherRepository.create(payload, actor.organizationId);
    }

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'teachers',
      action: 'create',
      targetId: teacher.id,
      metadata: {
        employeeId: teacher.employeeId,
        fullName: teacher.fullName,
        isActive: teacher.isActive,
        loginProvisioned: Boolean(payload.createLoginAccess),
      },
    });
    return teacher;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.teacherRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const teacher = await this.teacherRepository.findById(id);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && teacher.organizationId !== actor.organizationId) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  async update(id: string, payload: UpdateTeacherDto, actor: CurrentUserContext) {
    const teacher = await this.teacherRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'teachers',
      action: 'update',
      targetId: id,
      metadata: {
        employeeId: teacher.employeeId,
        fullName: teacher.fullName,
        isActive: teacher.isActive,
      },
    });
    return teacher;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.teacherRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'teachers',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }

  private toView(teacher: Prisma.TeacherGetPayload<{ include: typeof teacherWithOrganization }>): TeacherView {
    return {
      id: teacher.id,
      organizationId: teacher.organization.id,
      organizationName: teacher.organization.name,
      employeeId: teacher.employeeId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      joinedAt: teacher.joinedAt,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };
  }
}
