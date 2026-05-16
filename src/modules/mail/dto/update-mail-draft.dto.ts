import { PartialType } from '@nestjs/swagger';
import { CreateMailMessageDto } from './create-mail-message.dto';

export class UpdateMailDraftDto extends PartialType(CreateMailMessageDto) {}
