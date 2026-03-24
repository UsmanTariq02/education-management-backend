import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens';
import { AuditLogService } from '../../common/services/audit-log.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('should be defined', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: USER_REPOSITORY,
          useValue: {
            findByEmailWithAuthorization: jest.fn(),
            findByIdWithAuthorization: jest.fn(),
            storeRefreshToken: jest.fn(),
            findActiveRefreshTokenByUserId: jest.fn(),
            revokeRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'auth.secret': 'secret',
                'auth.refreshSecret': 'refresh-secret',
                'auth.expiresIn': '15m',
                'auth.refreshExpiresIn': '7d',
              };
              return values[key];
            }),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    expect(moduleRef.get(AuthService)).toBeDefined();
  });
});
