import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import { BulkUpdateStatusDto } from '../../common/dto/bulk-update-status.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersService } from './teachers.service';

@ApiTags('Teachers')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'teachers', version: '1' })
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Permissions('teachers.create')
  @ApiOperation({ summary: 'Create teacher' })
  async create(@Body() payload: CreateTeacherDto, @CurrentUser() actor: CurrentUserContext) {
    return this.teachersService.create(payload, actor);
  }

  @Get()
  @Permissions('teachers.read')
  @ApiOperation({ summary: 'List teachers' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.teachersService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('teachers.read')
  @ApiOperation({ summary: 'Get teacher details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.teachersService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('teachers.update')
  @ApiOperation({ summary: 'Update teacher' })
  async update(@Param('id') id: string, @Body() payload: UpdateTeacherDto, @CurrentUser() actor: CurrentUserContext) {
    return this.teachersService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('teachers.delete')
  @ApiOperation({ summary: 'Delete teacher' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.teachersService.delete(id, actor);
    return { deleted: true };
  }

  @Post('bulk-delete')
  @Permissions('teachers.delete')
  @ApiOperation({ summary: 'Delete teachers in bulk' })
  async bulkDelete(@Body() payload: BulkDeleteDto, @CurrentUser() actor: CurrentUserContext): Promise<{ deletedCount: number }> {
    return this.teachersService.bulkDelete(payload.ids, actor);
  }

  @Post('bulk-status')
  @Permissions('teachers.update')
  @ApiOperation({ summary: 'Update teachers in bulk' })
  async bulkStatus(
    @Body() payload: BulkUpdateStatusDto,
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<{ updatedCount: number }> {
    return this.teachersService.bulkUpdateStatus(payload.ids, payload.isActive, actor);
  }
}
