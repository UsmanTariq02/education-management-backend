import { PartialType } from '@nestjs/swagger';
import { CreateReminderRuleDto } from './create-reminder-rule.dto';

export class UpdateReminderRuleDto extends PartialType(CreateReminderRuleDto) {}
