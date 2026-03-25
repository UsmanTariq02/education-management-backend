import { Test } from '@nestjs/testing';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refreshTokens: jest.fn(),
            me: jest.fn(),
            logout: jest.fn(),
            getSecuritySummary: jest.fn(),
            revokeSession: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
    service = moduleRef.get(AuthService);
  });

  it('login should delegate to service', async () => {
    const payload = { email: 'admin@edu.local', password: 'ChangeMe123!' };
    const expected = {
      accessToken: 'access',
      refreshToken: 'refresh',
      user: {
        id: 'user-1',
        email: payload.email,
        organizationId: 'org-1',
        organizationName: 'Default Academy',
        userLimit: 25,
        studentLimit: 1000,
        enabledModules: [OrganizationModule.USERS],
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['users.read'],
      },
    };

    service.login.mockResolvedValue(expected);

    await expect(controller.login(payload, {} as never)).resolves.toEqual(expected);
    expect(service.login).toHaveBeenCalledWith(payload, {} as never);
  });

  it('refresh should delegate to service', async () => {
    const payload = { refreshToken: 'refresh' };
    const expected = {
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
      user: {
        id: 'user-1',
        email: 'admin@edu.local',
        organizationId: 'org-1',
        organizationName: 'Default Academy',
        userLimit: 25,
        studentLimit: 1000,
        enabledModules: [OrganizationModule.USERS],
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['users.read'],
      },
    };

    service.refreshTokens.mockResolvedValue(expected);

    await expect(controller.refresh(payload, {} as never)).resolves.toEqual(expected);
    expect(service.refreshTokens).toHaveBeenCalledWith(payload, {} as never);
  });

  it('me should delegate to service', async () => {
    const actor = {
      userId: 'user-1',
      email: 'admin@edu.local',
      organizationId: 'org-1',
      organizationName: 'Default Academy',
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: [OrganizationModule.USERS],
      roles: ['ADMIN'],
      permissions: ['users.read'],
    };
    const expected = {
      id: actor.userId,
      email: actor.email,
      organizationId: actor.organizationId,
      organizationName: actor.organizationName,
      userLimit: actor.userLimit,
      studentLimit: actor.studentLimit,
      enabledModules: actor.enabledModules,
      firstName: 'Admin',
      lastName: 'User',
      roles: actor.roles,
      permissions: actor.permissions,
    };

    service.me.mockResolvedValue({ ...expected, isActive: true });

    await expect(controller.me(actor)).resolves.toEqual({ ...expected, isActive: true });
    expect(service.me).toHaveBeenCalledWith(actor.userId);
  });
});
