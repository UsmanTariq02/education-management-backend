import { PartialType } from '@nestjs/swagger';
import { CreateFeeRecordDto } from './create-fee-record.dto';

export class UpdateFeeRecordDto extends PartialType(CreateFeeRecordDto) {}
