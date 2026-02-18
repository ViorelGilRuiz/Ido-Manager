import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsIn(['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'])
  type?: 'CHECKLIST' | 'TIMELINE' | 'BUDGET' | 'GUEST_LIST' | 'VENDOR_LIST';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  schemaJson?: Record<string, unknown>;
}
