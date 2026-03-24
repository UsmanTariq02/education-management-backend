import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
    service = moduleRef.get(UsersService);
  });

  it('create should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'superadmin@edu.local',
      organizationId: null,
      organizationName: null,
      roles: ['SUPER_ADMIN'],
      permissions: ['users.create'],
    };
    const payload = {
      firstName: 'A',
      lastName: 'B',
      email: 'a@edu.local',
      password: 'ChangeMe123!',
      isActive: true,
      roleIds: ['role-1'],
    };
    const expected = {
      id: 'user-1',
      firstName: 'A',
      lastName: 'B',
      email: 'a@edu.local',
      isActive: true,
      roles: ['ADMIN'],
      permissions: ['users.read'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    service.create.mockResolvedValue(expected);

    await expect(controller.create(payload, actor)).resolves.toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(payload, actor);
  });

  it('findAll should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'superadmin@edu.local',
      organizationId: null,
      organizationName: null,
      roles: ['SUPER_ADMIN'],
      permissions: ['users.read'],
    };
    const query = { page: 1, limit: 10, sortOrder: 'desc' as const };
    const expected = { items: [], total: 0, page: 1, limit: 10 };

    service.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(query, actor)).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledWith(query, actor);
  });

  it('findOne should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'superadmin@edu.local',
      organizationId: null,
      organizationName: null,
      roles: ['SUPER_ADMIN'],
      permissions: ['users.read'],
    };
    const expected = {
      id: 'user-1',
      firstName: 'A',
      lastName: 'B',
      email: 'a@edu.local',
      isActive: true,
      roles: ['ADMIN'],
      permissions: ['users.read'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    service.findOne.mockResolvedValue(expected);

    await expect(controller.findOne('user-1', actor)).resolves.toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('user-1', actor);
  });

  it('update should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'superadmin@edu.local',
      organizationId: null,
      organizationName: null,
      roles: ['SUPER_ADMIN'],
      permissions: ['users.update'],
    };
    const payload = { firstName: 'Updated' };
    const expected = {
      id: 'user-1',
      firstName: 'Updated',
      lastName: 'B',
      email: 'a@edu.local',
      isActive: true,
      roles: ['ADMIN'],
      permissions: ['users.read'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    service.update.mockResolvedValue(expected);

    await expect(controller.update('user-1', payload, actor)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('user-1', payload, actor);
  });

  it('delete should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'superadmin@edu.local',
      organizationId: null,
      organizationName: null,
      roles: ['SUPER_ADMIN'],
      permissions: ['users.delete'],
    };

    service.delete.mockResolvedValue(undefined);

    await expect(controller.delete('user-1', actor)).resolves.toEqual({ deleted: true });
    expect(service.delete).toHaveBeenCalledWith('user-1', actor);
  });
});
