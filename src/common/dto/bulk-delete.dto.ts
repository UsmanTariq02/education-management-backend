import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteDto {
  @ApiProperty({ type: [String], description: 'Record IDs to delete in bulk' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
}
