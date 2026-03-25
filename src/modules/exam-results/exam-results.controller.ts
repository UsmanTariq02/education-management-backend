import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateExamResultDto } from './dto/create-exam-result.dto';
import { UpdateExamResultDto } from './dto/update-exam-result.dto';
import { ExamResultsService } from './exam-results.service';

@ApiTags('Exam Results')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'exam-results', version: '1' })
export class ExamResultsController {
  constructor(private readonly examResultsService: ExamResultsService) {}

  @Post()
  @Permissions('exam-results.create')
  @ApiOperation({ summary: 'Create exam result' })
  async create(@Body() payload: CreateExamResultDto, @CurrentUser() actor: CurrentUserContext) {
    return this.examResultsService.create(payload, actor);
  }

  @Get()
  @Permissions('exam-results.read')
  @ApiOperation({ summary: 'List exam results' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.examResultsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('exam-results.read')
  @ApiOperation({ summary: 'Get exam result details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.examResultsService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('exam-results.update')
  @ApiOperation({ summary: 'Update exam result' })
  async update(@Param('id') id: string, @Body() payload: UpdateExamResultDto, @CurrentUser() actor: CurrentUserContext) {
    return this.examResultsService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('exam-results.delete')
  @ApiOperation({ summary: 'Delete exam result' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.examResultsService.delete(id, actor);
    return { deleted: true };
  }
}
