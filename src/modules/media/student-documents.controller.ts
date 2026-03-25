import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  Post,
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
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateStudentDocumentDto } from './dto/create-student-document.dto';
import { MediaService } from './media.service';

@ApiTags('Student Documents')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.MEDIA)
@Controller({ path: 'students/:studentId/documents', version: '1' })
export class StudentDocumentsController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @Permissions('student-documents.read')
  @ApiOperation({ summary: 'List documents for a student' })
  async list(@Param('studentId') studentId: string, @CurrentUser() actor: CurrentUserContext) {
    return this.mediaService.listStudentDocuments(studentId, actor);
  }

  @Post()
  @Permissions('student-documents.manage')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        type: { type: 'string' },
        notes: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['title', 'type', 'file'],
    },
  })
  @ApiOperation({ summary: 'Upload a document for a student' })
  async upload(
    @Param('studentId') studentId: string,
    @Body() payload: CreateStudentDocumentDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.mediaService.uploadStudentDocument(studentId, payload, file, actor);
  }

  @Get(':documentId/download')
  @Permissions('student-documents.read')
  @ApiOperation({ summary: 'Download a student document' })
  async download(
    @Param('studentId') studentId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() actor: CurrentUserContext,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.mediaService.getStudentDocumentDownload(studentId, documentId, actor);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    file.stream.pipe(response);
  }

  @Delete(':documentId')
  @Permissions('student-documents.manage')
  @ApiOperation({ summary: 'Delete a student document' })
  async delete(
    @Param('studentId') studentId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    await this.mediaService.deleteStudentDocument(studentId, documentId, actor);
    return { deleted: true };
  }
}
