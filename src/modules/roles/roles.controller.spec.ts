import { Test } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;
  let service: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(RolesController);
    service = moduleRef.get(RolesService);
  });

  it('findAll should delegate to service', async () => {
    service.findAll.mockResolvedValue([]);

    await expect(controller.findAll()).resolves.toEqual([]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne should delegate to service', async () => {
    const expected = { id: 'role-1', name: 'ADMIN', description: 'Admin', rolePermissions: [] };
    service.findOne.mockResolvedValue(expected);

    await expect(controller.findOne('role-1')).resolves.toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('role-1');
  });

  it('create should delegate to service', async () => {
    const actor = { userId: '1', email: 'superadmin@edu.local', roles: ['SUPER_ADMIN'], permissions: ['users.update'] };
    const payload = { name: 'TEACHER', description: 'Teacher', permissionIds: ['perm-1'] };
    const expected = { id: 'role-1', ...payload, rolePermissions: [] };
    service.create.mockResolvedValue(expected);

    await expect(controller.create(payload, actor)).resolves.toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(payload, actor);
  });

  it('update should delegate to service', async () => {
    const actor = { userId: '1', email: 'superadmin@edu.local', roles: ['SUPER_ADMIN'], permissions: ['users.update'] };
    const payload = { description: 'Updated' };
    const expected = { id: 'role-1', name: 'ADMIN', description: 'Updated', rolePermissions: [] };
    service.update.mockResolvedValue(expected);

    await expect(controller.update('role-1', payload, actor)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('role-1', payload, actor);
  });
});
