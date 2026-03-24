import { Test } from '@nestjs/testing';
import { ReminderChannel, ReminderStatus } from '@prisma/client';
import {
  EMAIL_REMINDER_PROVIDER,
  WHATSAPP_REMINDER_PROVIDER,
} from '../../common/constants/injection-tokens';
import { ReminderDeliveryService } from './reminder-delivery.service';
import { ReminderDeliveryProvider } from './interfaces/reminder-delivery-provider.interface';

describe('ReminderDeliveryService', () => {
  let service: ReminderDeliveryService;
  let emailProvider: jest.Mocked<ReminderDeliveryProvider>;
  let whatsappProvider: jest.Mocked<ReminderDeliveryProvider>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReminderDeliveryService,
        {
          provide: EMAIL_REMINDER_PROVIDER,
          useValue: { send: jest.fn() },
        },
        {
          provide: WHATSAPP_REMINDER_PROVIDER,
          useValue: { send: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(ReminderDeliveryService);
    emailProvider = moduleRef.get(EMAIL_REMINDER_PROVIDER);
    whatsappProvider = moduleRef.get(WHATSAPP_REMINDER_PROVIDER);
  });

  it('should delegate email reminders to the email provider', async () => {
    emailProvider.send.mockResolvedValue({
      delivered: true,
      sentAt: new Date('2026-03-18T00:00:00.000Z'),
      externalReference: 'message-id',
    });

    const result = await service.deliver({
      channel: ReminderChannel.EMAIL,
      message: 'Fee reminder',
      recipient: {
        studentId: 'student-1',
        studentName: 'Ali Khan',
        studentEmail: 'ali@example.com',
        studentPhone: '03001234567',
        guardianName: 'Parent',
        guardianEmail: null,
        guardianPhone: '03007654321',
      },
    });

    expect(emailProvider.send).toHaveBeenCalled();
    expect(result.delivered).toBe(true);
    expect(service.resolveStatus(result)).toBe(ReminderStatus.SENT);
  });

  it('should delegate WhatsApp reminders to the WhatsApp provider', async () => {
    whatsappProvider.send.mockResolvedValue({
      delivered: false,
      failureReason: 'Provider not configured',
    });

    const result = await service.deliver({
      channel: ReminderChannel.WHATSAPP,
      message: 'Fee reminder',
      recipient: {
        studentId: 'student-1',
        studentName: 'Ali Khan',
        studentEmail: 'ali@example.com',
        studentPhone: '03001234567',
        guardianName: 'Parent',
        guardianEmail: null,
        guardianPhone: '03007654321',
      },
    });

    expect(whatsappProvider.send).toHaveBeenCalled();
    expect(result.delivered).toBe(false);
    expect(service.resolveStatus(result)).toBe(ReminderStatus.FAILED);
  });
});
