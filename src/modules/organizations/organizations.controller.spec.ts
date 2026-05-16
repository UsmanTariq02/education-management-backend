import { Test } from '@nestjs/testing';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: jest.Mocked<OrganizationsService>;

  const actor: CurrentUserContext = {
    userId: 'user-1',
    email: 'superadmin@edu.local',
    organizationId: null,
    organizationName: null,
    roles: ['SUPER_ADMIN'],
    permissions: ['users.read'],
    enabledModules: [],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            listBillingEntries: jest.fn(),
            createBillingEntry: jest.fn(),
            updateBillingEntry: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(OrganizationsController);
    service = moduleRef.get(OrganizationsService);
  });

  it('findAll should delegate to the service', async () => {
    const query = { page: 1, limit: 10, search: 'academy' };
    const expected = { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };

    service.findAll.mockResolvedValue(expected as never);

    await expect(controller.findAll(query as never)).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('create should onboard a new organization through the service', async () => {
    const payload = {
      name: 'North Star Academy',
      slug: 'north-star',
      email: 'hello@northstar.edu',
      phone: '+92-300-0000000',
      address: 'Main Campus',
    };
    const expected = {
      id: 'org-1',
      name: payload.name,
      slug: payload.slug,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
    };

    service.create.mockResolvedValue(expected as never);

    await expect(controller.create(payload as never, actor)).resolves.toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(payload, actor);
  });

  it('update should delegate tenant changes to the service', async () => {
    const payload = { name: 'North Star Academy Updated' };
    const expected = { id: 'org-1', name: payload.name };

    service.update.mockResolvedValue(expected as never);

    await expect(controller.update('org-1', payload as never, actor)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('org-1', payload, actor);
  });

  it('billingEntries should delegate to the service', async () => {
    const expected = [{ id: 'entry-1', title: 'Seed capital', amount: 5000 }];

    service.listBillingEntries.mockResolvedValue(expected as never);

    await expect(controller.billingEntries('org-1')).resolves.toEqual(expected);
    expect(service.listBillingEntries).toHaveBeenCalledWith('org-1');
  });
});
