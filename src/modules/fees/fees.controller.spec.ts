import { Test } from '@nestjs/testing';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';

describe('FeesController', () => {
  let controller: FeesController;
  let service: jest.Mocked<FeesService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FeesController],
      providers: [
        {
          provide: FeesService,
          useValue: {
            createPlan: jest.fn(),
            listPlans: jest.fn(),
            createRecord: jest.fn(),
            listRecords: jest.fn(),
            updateRecord: jest.fn(),
            deleteRecord: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(FeesController);
    service = moduleRef.get(FeesService);
  });

  it('createPlan should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['fees.create'],
    };
    const payload = { studentId: 'student-1', monthlyFee: 1000, dueDay: 5, isActive: true };
    const expected = { id: 'plan-1', ...payload };
    service.createPlan.mockResolvedValue(expected as never);

    await expect(controller.createPlan(payload, actor)).resolves.toEqual(expected);
    expect(service.createPlan).toHaveBeenCalledWith(payload, actor);
  });

  it('listPlans should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['fees.read'],
    };
    const query = { page: 1, limit: 10, sortOrder: 'desc' as const };
    const expected = { items: [], total: 0, page: 1, limit: 10 };
    service.listPlans.mockResolvedValue(expected);

    await expect(controller.listPlans(query, actor)).resolves.toEqual(expected);
    expect(service.listPlans).toHaveBeenCalledWith(query, actor);
  });

  it('createRecord should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['fees.create'],
    };
    const payload = { studentId: 'student-1', feePlanId: 'plan-1', month: 3, year: 2026, amountDue: 1000, amountPaid: 0, status: 'PENDING' };
    const expected = { id: 'record-1', ...payload };
    service.createRecord.mockResolvedValue(expected as never);

    await expect(controller.createRecord(payload, actor)).resolves.toEqual(expected);
    expect(service.createRecord).toHaveBeenCalledWith(payload, actor);
  });

  it('listRecords should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['fees.read'],
    };
    const query = { page: 1, limit: 10, sortOrder: 'desc' as const };
    const expected = { items: [], total: 0, page: 1, limit: 10 };
    service.listRecords.mockResolvedValue(expected);

    await expect(controller.listRecords(query, actor)).resolves.toEqual(expected);
    expect(service.listRecords).toHaveBeenCalledWith(query, actor);
  });

  it('updateRecord should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['fees.update'],
    };
    const payload = { amountPaid: 1000, status: 'PAID' };
    const expected = { id: 'record-1', studentId: 'student-1', feePlanId: 'plan-1', ...payload };
    service.updateRecord.mockResolvedValue(expected as never);

    await expect(controller.updateRecord('record-1', payload, actor)).resolves.toEqual(expected);
    expect(service.updateRecord).toHaveBeenCalledWith('record-1', payload, actor);
  });

  it('deleteRecord should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['fees.delete'],
    };
    service.deleteRecord.mockResolvedValue(undefined);

    await expect(controller.deleteRecord('record-1', actor)).resolves.toEqual({ deleted: true });
    expect(service.deleteRecord).toHaveBeenCalledWith('record-1', actor);
  });
});
