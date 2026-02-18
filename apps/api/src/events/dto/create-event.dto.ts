import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsIn(['WEDDING', 'EVENT', 'OTHER'])
  type!: 'WEDDING' | 'EVENT' | 'OTHER';

  @IsString()
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}
