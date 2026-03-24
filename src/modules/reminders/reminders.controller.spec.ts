import { Test } from '@nestjs/testing';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

describe('RemindersController', () => {
  let controller: RemindersController;
  let service: jest.Mocked<RemindersService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RemindersController],
      providers: [
        {
          provide: RemindersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(RemindersController);
    service = moduleRef.get(RemindersService);
  });

  it('create should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['reminders.create'],
    };
    const payload = { studentId: 'student-1', channel: 'EMAIL', message: 'Reminder', status: 'SENT' };
    const expected = { id: 'reminder-1', ...payload };
    service.create.mockResolvedValue(expected as never);

    await expect(controller.create(payload, actor)).resolves.toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(payload, actor);
  });

  it('findAll should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['reminders.read'],
    };
    const query = { page: 1, limit: 10, sortOrder: 'desc' as const };
    const expected = { items: [], total: 0, page: 1, limit: 10 };
    service.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(query, actor)).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledWith(query, actor);
  });

  it('update should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['reminders.update'],
    };
    const payload = { message: 'Updated Reminder' };
    const expected = { id: 'reminder-1', studentId: 'student-1', channel: 'EMAIL', message: 'Updated Reminder', status: 'SENT' };
    service.update.mockResolvedValue(expected as never);

    await expect(controller.update('reminder-1', payload, actor)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('reminder-1', payload, actor);
  });

  it('delete should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['ADMIN'],
      permissions: ['reminders.delete'],
    };
    service.delete.mockResolvedValue(undefined);

    await expect(controller.delete('reminder-1', actor)).resolves.toEqual({ deleted: true });
    expect(service.delete).toHaveBeenCalledWith('reminder-1', actor);
  });
});
