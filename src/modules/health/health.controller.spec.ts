import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
    service = moduleRef.get(HealthService);
  });

  it('check should delegate to service', async () => {
    const expected = {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
    service.check.mockResolvedValue(expected);

    await expect(controller.check()).resolves.toEqual(expected);
    expect(service.check).toHaveBeenCalled();
  });
});
