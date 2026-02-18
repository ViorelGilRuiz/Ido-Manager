import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsIn(['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'])
  type!: 'CHECKLIST' | 'TIMELINE' | 'BUDGET' | 'GUEST_LIST' | 'VENDOR_LIST';

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  schemaJson!: Record<string, unknown>;
}
