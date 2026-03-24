import { SetMetadata } from '@nestjs/common';
import { OrganizationModule } from '../enums/organization-module.enum';

export const MODULE_ACCESS_KEY = 'module_access';

export const ModuleAccess = (module: OrganizationModule) => SetMetadata(MODULE_ACCESS_KEY, module);
