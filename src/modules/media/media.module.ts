import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { StudentDocumentsController } from './student-documents.controller';
import { OrganizationAssetsController } from './organization-assets.controller';

@Module({
  controllers: [StudentDocumentsController, OrganizationAssetsController],
  providers: [MediaService],
})
export class MediaModule {}
