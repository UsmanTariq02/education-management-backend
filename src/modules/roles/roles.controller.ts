import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'List roles with permissions' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get role details' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Create role' })
  async create(@Body() payload: CreateRoleDto, @CurrentUser() actor: CurrentUserContext) {
    return this.rolesService.create(payload, actor);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update role' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateRoleDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.rolesService.update(id, payload, actor);
  }
}
