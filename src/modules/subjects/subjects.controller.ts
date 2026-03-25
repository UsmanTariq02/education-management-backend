import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectsService } from './subjects.service';

@ApiTags('Subjects')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'subjects', version: '1' })
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Permissions('subjects.create')
  @ApiOperation({ summary: 'Create subject' })
  async create(@Body() payload: CreateSubjectDto, @CurrentUser() actor: CurrentUserContext) {
    return this.subjectsService.create(payload, actor);
  }

  @Get()
  @Permissions('subjects.read')
  @ApiOperation({ summary: 'List subjects' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.subjectsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('subjects.read')
  @ApiOperation({ summary: 'Get subject details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.subjectsService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('subjects.update')
  @ApiOperation({ summary: 'Update subject' })
  async update(@Param('id') id: string, @Body() payload: UpdateSubjectDto, @CurrentUser() actor: CurrentUserContext) {
    return this.subjectsService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('subjects.delete')
  @ApiOperation({ summary: 'Delete subject' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.subjectsService.delete(id, actor);
    return { deleted: true };
  }
}
