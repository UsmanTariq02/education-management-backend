import { Test } from '@nestjs/testing';
import { PortalAccountType } from '@prisma/client';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

describe('PortalController', () => {
  let controller: PortalController;
  let service: jest.Mocked<PortalService>;

  const parentActor: CurrentPortalUserContext = {
    accountId: 'portal-account-1',
    studentId: 'student-1',
    organizationId: 'org-1',
    organizationName: 'North Star Academy',
    email: 'parent@edu.local',
    accountType: PortalAccountType.PARENT,
  };

  const studentActor: CurrentPortalUserContext = {
    accountId: 'portal-account-2',
    studentId: 'student-2',
    organizationId: 'org-1',
    organizationName: 'North Star Academy',
    email: 'student@edu.local',
    accountType: PortalAccountType.STUDENT,
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PortalController],
      providers: [
        {
          provide: PortalService,
          useValue: {
            getDashboard: jest.fn(),
            getReportCard: jest.fn(),
            getActivityFeed: jest.fn(),
            getAcknowledgements: jest.fn(),
            acknowledgeItem: jest.fn(),
            getDocuments: jest.fn(),
            getAnnouncements: jest.fn(),
            getFees: jest.fn(),
            uploadPaymentProof: jest.fn(),
            getPaymentProofDownload: jest.fn(),
            getDocumentDownload: jest.fn(),
            getAssessments: jest.fn(),
            getAssignments: jest.fn(),
            getAssignmentDetail: jest.fn(),
            saveAssignmentSubmission: jest.fn(),
            submitAssignment: jest.fn(),
            getAssessmentDetail: jest.fn(),
            startAssessment: jest.fn(),
            saveAssessmentAnswers: jest.fn(),
            submitAssessment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(PortalController);
    service = moduleRef.get(PortalService);
  });

  it('getDashboard should delegate to the portal service', async () => {
    const expected = {
      accountType: PortalAccountType.PARENT,
      studentName: 'Amina',
      attendanceRate: 94,
      feeBalance: 2500,
    };

    service.getDashboard.mockResolvedValue(expected as never);

    await expect(controller.getDashboard(parentActor)).resolves.toEqual(expected);
    expect(service.getDashboard).toHaveBeenCalledWith(parentActor);
  });

  it('getAnnouncements should delegate to the portal service for parents', async () => {
    const expected = [
      { id: 'announcement-1', title: 'Parent meeting', body: 'Quarterly meeting', publishedAt: new Date().toISOString() },
    ];

    service.getAnnouncements.mockResolvedValue(expected as never);

    await expect(controller.getAnnouncements(parentActor)).resolves.toEqual(expected);
    expect(service.getAnnouncements).toHaveBeenCalledWith(parentActor);
  });

  it('acknowledgeItem should delegate to the portal service', async () => {
    const payload = { kind: 'ANNOUNCEMENT', itemId: 'announcement-1' };
    const expected = {
      id: 'ack-1',
      kind: payload.kind,
      itemId: payload.itemId,
      acknowledgedAt: new Date().toISOString(),
    };

    service.acknowledgeItem.mockResolvedValue(expected as never);

    await expect(controller.acknowledgeItem(payload as never, parentActor)).resolves.toEqual(expected);
    expect(service.acknowledgeItem).toHaveBeenCalledWith(payload, parentActor);
  });

  it('getAssessments should delegate to the portal service for students', async () => {
    const expected = [{ id: 'assessment-1', title: 'Midterm Quiz', status: 'PUBLISHED' }];

    service.getAssessments.mockResolvedValue(expected as never);

    await expect(controller.getAssessments(studentActor)).resolves.toEqual(expected);
    expect(service.getAssessments).toHaveBeenCalledWith(studentActor);
  });
});
