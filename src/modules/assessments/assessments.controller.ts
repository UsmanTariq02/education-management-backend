import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentsService } from './assessments.service';

@ApiTags('Assessments')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'assessments', version: '1' })
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @Permissions('assessments.create')
  @ApiOperation({ summary: 'Create assessment' })
  async create(@Body() payload: CreateAssessmentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.create(payload, actor);
  }

  @Get()
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'List assessments' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'Get assessment details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('assessments.update')
  @ApiOperation({ summary: 'Update assessment' })
  async update(@Param('id') id: string, @Body() payload: UpdateAssessmentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('assessments.delete')
  @ApiOperation({ summary: 'Delete assessment' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.assessmentsService.delete(id, actor);
    return { deleted: true };
  }
}
