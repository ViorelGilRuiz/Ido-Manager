import { IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  templateId!: string;

  @IsString()
  @MaxLength(140)
  name!: string;
}

