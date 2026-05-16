import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsUUID } from 'class-validator';

export class BulkPublishDto {
  @ApiProperty({ type: [String], description: 'Record IDs to update in bulk' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ description: 'Whether the selected records should be published' })
  @IsBoolean()
  isPublished!: boolean;
}
