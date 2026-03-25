import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamsService } from './exams.service';

@ApiTags('Exams')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'exams', version: '1' })
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Permissions('exams.create')
  @ApiOperation({ summary: 'Create exam' })
  async create(@Body() payload: CreateExamDto, @CurrentUser() actor: CurrentUserContext) {
    return this.examsService.create(payload, actor);
  }

  @Get()
  @Permissions('exams.read')
  @ApiOperation({ summary: 'List exams' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.examsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('exams.read')
  @ApiOperation({ summary: 'Get exam details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.examsService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('exams.update')
  @ApiOperation({ summary: 'Update exam' })
  async update(@Param('id') id: string, @Body() payload: UpdateExamDto, @CurrentUser() actor: CurrentUserContext) {
    return this.examsService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('exams.delete')
  @ApiOperation({ summary: 'Delete exam' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.examsService.delete(id, actor);
    return { deleted: true };
  }
}
