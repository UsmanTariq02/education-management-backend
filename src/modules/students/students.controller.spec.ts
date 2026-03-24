import { Test } from '@nestjs/testing';
import { Response } from 'express';
import { StudentStatus } from '@prisma/client';
import { SortDirection } from '../../common/enums/sort-direction.enum';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

describe('StudentsController', () => {
  let controller: StudentsController;
  let service: jest.Mocked<StudentsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: {
            create: jest.fn(),
            downloadImportSample: jest.fn(),
            importCsv: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(StudentsController);
    service = moduleRef.get(StudentsService);
  });

  it('create should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.STUDENTS],
      roles: ['ADMIN'],
      permissions: ['students.create'],
    };
    const payload = {
      firstName: 'Ali',
      lastName: 'Khan',
      phone: '123',
      guardianName: 'Parent',
      guardianPhone: '321',
      admissionDate: new Date(),
      status: StudentStatus.ACTIVE,
    };
    const expected = {
      id: 'student-1',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      ...payload,
      fullName: 'Ali Khan',
      email: null,
      guardianEmail: null,
      address: null,
      dateOfBirth: null,
      batches: [],
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
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.STUDENTS],
      roles: ['ADMIN'],
      permissions: ['students.read'],
    };
    const query = { page: 1, limit: 10, sortOrder: SortDirection.DESC };
    const expected = { items: [], total: 0, page: 1, limit: 10 };
    service.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(query, actor)).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledWith(query, actor);
  });

  it('downloadSample should stream the sample csv', async () => {
    const response = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    service.downloadImportSample.mockResolvedValue("firstName,lastName\nAli,Khan\n");

    await controller.downloadSample(response);

    expect(service.downloadImportSample).toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
    expect(response.send).toHaveBeenCalled();
  });

  it('importCsv should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.STUDENTS],
      roles: ['ADMIN'],
      permissions: ['students.create'],
    };
    const file = {
      buffer: Buffer.from("firstName,lastName,phone,guardianName,guardianPhone,admissionDate\nAli,Khan,03001234567,Ahmed,03007654321,2026-03-01"),
    } as Express.Multer.File;
    const expected = {
      totalRows: 1,
      importedCount: 1,
      skippedCount: 0,
      errors: [],
    };

    service.importCsv.mockResolvedValue(expected);

    await expect(controller.importCsv(file, actor)).resolves.toEqual(expected);
    expect(service.importCsv).toHaveBeenCalledWith(file.buffer, actor);
  });

  it('findOne should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.STUDENTS],
      roles: ['ADMIN'],
      permissions: ['students.read'],
    };
    const expected = {
      id: 'student-1',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      firstName: 'Ali',
      lastName: 'Khan',
      fullName: 'Ali Khan',
      email: null,
      guardianEmail: null,
      phone: '123',
      guardianName: 'Parent',
      guardianPhone: '321',
      address: null,
      dateOfBirth: null,
      admissionDate: new Date(),
      status: StudentStatus.ACTIVE,
      batches: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    service.findOne.mockResolvedValue(expected);

    await expect(controller.findOne('student-1', actor)).resolves.toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('student-1', actor);
  });

  it('update should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.STUDENTS],
      roles: ['ADMIN'],
      permissions: ['students.update'],
    };
    const payload = { firstName: 'Updated' };
    const expected = {
      id: 'student-1',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      firstName: 'Updated',
      lastName: 'Khan',
      fullName: 'Updated Khan',
      email: null,
      guardianEmail: null,
      phone: '123',
      guardianName: 'Parent',
      guardianPhone: '321',
      address: null,
      dateOfBirth: null,
      admissionDate: new Date(),
      status: StudentStatus.ACTIVE,
      batches: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    service.update.mockResolvedValue(expected);

    await expect(controller.update('student-1', payload, actor)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('student-1', payload, actor);
  });

  it('delete should delegate to service', async () => {
    const actor = {
      userId: '1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.STUDENTS],
      roles: ['ADMIN'],
      permissions: ['students.delete'],
    };
    service.delete.mockResolvedValue(undefined);

    await expect(controller.delete('student-1', actor)).resolves.toEqual({ deleted: true });
    expect(service.delete).toHaveBeenCalledWith('student-1', actor);
  });
});
