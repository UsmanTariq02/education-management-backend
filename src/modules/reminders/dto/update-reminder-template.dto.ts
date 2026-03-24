import { PartialType } from '@nestjs/swagger';
import { CreateReminderTemplateDto } from './create-reminder-template.dto';

export class UpdateReminderTemplateDto extends PartialType(CreateReminderTemplateDto) {}
