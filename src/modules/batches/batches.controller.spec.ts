import { Test } from '@nestjs/testing';
import { SortDirection } from '../../common/enums/sort-direction.enum';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

describe('BatchesController', () => {
  let controller: BatchesController;
  let service: jest.Mocked<BatchesService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BatchesController],
      providers: [
        {
          provide: BatchesService,
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

    controller = moduleRef.get(BatchesController);
    service = moduleRef.get(BatchesService);
  });

  it('create should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.BATCHES],
      roles: ['ADMIN'],
      permissions: ['batches.create'],
    };
    const payload = { name: 'Batch A', code: 'BA-1', startDate: new Date(), isActive: true };
    const expected = { id: 'batch-1', organizationId: 'org-1', organizationName: 'Default Academy', ...payload, description: null, endDate: null, scheduleInfo: null, createdAt: new Date(), updatedAt: new Date() };
    service.create.mockResolvedValue(expected);

    await expect(controller.create(payload, actor)).resolves.toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(payload, actor);
  });

  it('findAll should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.BATCHES],
      roles: ['ADMIN'],
      permissions: ['batches.read'],
    };
    const query = { page: 1, limit: 10, sortOrder: SortDirection.DESC };
    const expected = { items: [], total: 0, page: 1, limit: 10 };
    service.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(query, actor)).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledWith(query, actor);
  });

  it('findOne should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.BATCHES],
      roles: ['ADMIN'],
      permissions: ['batches.read'],
    };
    const expected = { id: 'batch-1', name: 'Batch A', code: 'BA-1' };
    service.findOne.mockResolvedValue(expected as never);

    await expect(controller.findOne('batch-1', actor)).resolves.toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('batch-1', actor);
  });

  it('update should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.BATCHES],
      roles: ['ADMIN'],
      permissions: ['batches.update'],
    };
    const payload = { name: 'Updated Batch' };
    const expected = { id: 'batch-1', name: 'Updated Batch', code: 'BA-1' };
    service.update.mockResolvedValue(expected as never);

    await expect(controller.update('batch-1', payload, actor)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('batch-1', payload, actor);
  });

  it('delete should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.BATCHES],
      roles: ['ADMIN'],
      permissions: ['batches.delete'],
    };
    service.delete.mockResolvedValue(undefined);

    await expect(controller.delete('batch-1', actor)).resolves.toEqual({ deleted: true });
    expect(service.delete).toHaveBeenCalledWith('batch-1', actor);
  });
});
