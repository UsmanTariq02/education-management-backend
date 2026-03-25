import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';
import { TimetablesService } from './timetables.service';

@ApiTags('Timetables')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'timetables', version: '1' })
export class TimetablesController {
  constructor(private readonly service: TimetablesService) {}

  @Post()
  @Permissions('timetables.create')
  @ApiOperation({ summary: 'Create timetable entry' })
  async create(@Body() payload: CreateTimetableEntryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.service.create(payload, actor);
  }

  @Get()
  @Permissions('timetables.read')
  @ApiOperation({ summary: 'List timetable entries' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.service.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('timetables.read')
  @ApiOperation({ summary: 'Get timetable entry details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.service.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('timetables.update')
  @ApiOperation({ summary: 'Update timetable entry' })
  async update(@Param('id') id: string, @Body() payload: UpdateTimetableEntryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.service.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('timetables.delete')
  @ApiOperation({ summary: 'Delete timetable entry' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.service.delete(id, actor);
    return { deleted: true };
  }
}
