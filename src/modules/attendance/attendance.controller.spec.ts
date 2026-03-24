import { Test } from '@nestjs/testing';
import { AttendanceStatus } from '@prisma/client';
import { SortDirection } from '../../common/enums/sort-direction.enum';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let service: jest.Mocked<AttendanceService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        {
          provide: AttendanceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(AttendanceController);
    service = moduleRef.get(AttendanceService);
  });

  it('create should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'staff@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['STAFF'],
      permissions: ['attendance.create'],
    };
    const payload = { studentId: 'student-1', batchId: 'batch-1', attendanceDate: new Date(), status: AttendanceStatus.PRESENT };
    const expected = { id: 'attendance-1', ...payload };
    service.create.mockResolvedValue(expected as never);

    await expect(controller.create(payload, actor)).resolves.toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(payload, actor);
  });

  it('findAll should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'staff@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['STAFF'],
      permissions: ['attendance.read'],
    };
    const query = { page: 1, limit: 10, sortOrder: SortDirection.DESC };
    const expected = { items: [], total: 0, page: 1, limit: 10 };
    service.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(query, actor)).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledWith(query, actor);
  });

  it('update should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'staff@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['STAFF'],
      permissions: ['attendance.update'],
    };
    const payload = { status: AttendanceStatus.LATE };
    const expected = { id: 'attendance-1', studentId: 'student-1', batchId: 'batch-1', attendanceDate: new Date(), ...payload };
    service.update.mockResolvedValue(expected as never);

    await expect(controller.update('attendance-1', payload, actor)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('attendance-1', payload, actor);
  });

  it('delete should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'staff@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      roles: ['STAFF'],
      permissions: ['attendance.delete'],
    };
    service.delete.mockResolvedValue(undefined);

    await expect(controller.delete('attendance-1', actor)).resolves.toEqual({ deleted: true });
    expect(service.delete).toHaveBeenCalledWith('attendance-1', actor);
  });
});
