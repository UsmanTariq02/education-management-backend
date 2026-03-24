import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleRepository, RoleWithPermissions } from '../interfaces/role.repository.interface';

const roleInclude = {
  rolePermissions: {
    include: {
      permission: true,
    },
  },
} satisfies Prisma.RoleInclude;

@Injectable()
export class RolePrismaRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({
      include: roleInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: roleInclude,
    });
  }

  async create(payload: CreateRoleDto): Promise<RoleWithPermissions> {
    return this.prisma.role.create({
      data: {
        name: payload.name,
        description: payload.description,
        rolePermissions: {
          createMany: {
            data: payload.permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
      },
      include: roleInclude,
    });
  }

  async update(id: string, payload: UpdateRoleDto): Promise<RoleWithPermissions> {
    return this.prisma.$transaction(async (prisma) => {
      if (payload.permissionIds) {
        await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      }

      return prisma.role.update({
        where: { id },
        data: {
          name: payload.name,
          description: payload.description,
          rolePermissions: payload.permissionIds
            ? {
                createMany: {
                  data: payload.permissionIds.map((permissionId) => ({ permissionId })),
                },
              }
            : undefined,
        },
        include: roleInclude,
      });
    });
  }
}
