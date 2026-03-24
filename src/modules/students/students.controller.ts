import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.STUDENTS)
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Permissions('students.create')
  @ApiOperation({ summary: 'Create student' })
  async create(@Body() payload: CreateStudentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.studentsService.create(payload, actor);
  }

  @Get('import/sample')
  @Permissions('students.read')
  @ApiOperation({ summary: 'Download sample student import CSV' })
  async downloadSample(@Res() response: Response): Promise<void> {
    const sample = await this.studentsService.downloadImportSample();
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Disposition', 'attachment; filename="students-import-sample.csv"');
    response.send(sample);
  }

  @Post('import')
  @Permissions('students.create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Import students from CSV file' })
  async importCsv(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are supported for student import');
    }

    return this.studentsService.importCsv(file.buffer, actor);
  }

  @Get()
  @Permissions('students.read')
  @ApiOperation({ summary: 'List students' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.studentsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('students.read')
  @ApiOperation({ summary: 'Get student details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.studentsService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('students.update')
  @ApiOperation({ summary: 'Update student' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.studentsService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('students.delete')
  @ApiOperation({ summary: 'Delete student' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.studentsService.delete(id, actor);
    return { deleted: true };
  }
}
