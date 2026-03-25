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
import { CreateOrganizationAssetDto } from './dto/create-organization-asset.dto';
import { MediaService } from './media.service';

@ApiTags('Organization Assets')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.MEDIA)
@Controller({ path: 'organization-assets/current', version: '1' })
export class OrganizationAssetsController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @Permissions('organization-assets.read')
  @ApiOperation({ summary: 'List current organization assets' })
  async list(@CurrentUser() actor: CurrentUserContext) {
    return this.mediaService.listOrganizationAssets(actor);
  }

  @Post()
  @Permissions('organization-assets.manage')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
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
  @ApiOperation({ summary: 'Upload an organization asset' })
  async upload(
    @Body() payload: CreateOrganizationAssetDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.mediaService.uploadOrganizationAsset(payload, file, actor);
  }

  @Get(':assetId/download')
  @Permissions('organization-assets.read')
  @ApiOperation({ summary: 'Download an organization asset' })
  async download(
    @Param('assetId') assetId: string,
    @CurrentUser() actor: CurrentUserContext,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.mediaService.getOrganizationAssetDownload(assetId, actor);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    file.stream.pipe(response);
  }

  @Delete(':assetId')
  @Permissions('organization-assets.manage')
  @ApiOperation({ summary: 'Delete an organization asset' })
  async delete(@Param('assetId') assetId: string, @CurrentUser() actor: CurrentUserContext) {
    await this.mediaService.deleteOrganizationAsset(assetId, actor);
    return { deleted: true };
  }
}
