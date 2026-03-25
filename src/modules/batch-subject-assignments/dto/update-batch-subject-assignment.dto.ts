import { PartialType } from '@nestjs/swagger';
import { CreateBatchSubjectAssignmentDto } from './create-batch-subject-assignment.dto';

export class UpdateBatchSubjectAssignmentDto extends PartialType(CreateBatchSubjectAssignmentDto) {}
