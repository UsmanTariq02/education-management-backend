import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AcademicSessionsService } from './academic-sessions.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';

@ApiTags('Academic Sessions')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'academic-sessions', version: '1' })
export class AcademicSessionsController {
  constructor(private readonly academicSessionsService: AcademicSessionsService) {}

  @Post()
  @Permissions('academic-sessions.create')
  @ApiOperation({ summary: 'Create academic session' })
  async create(@Body() payload: CreateAcademicSessionDto, @CurrentUser() actor: CurrentUserContext) {
    return this.academicSessionsService.create(payload, actor);
  }

  @Get()
  @Permissions('academic-sessions.read')
  @ApiOperation({ summary: 'List academic sessions' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.academicSessionsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('academic-sessions.read')
  @ApiOperation({ summary: 'Get academic session details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.academicSessionsService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('academic-sessions.update')
  @ApiOperation({ summary: 'Update academic session' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateAcademicSessionDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.academicSessionsService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('academic-sessions.delete')
  @ApiOperation({ summary: 'Delete academic session' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.academicSessionsService.delete(id, actor);
    return { deleted: true };
  }
}
