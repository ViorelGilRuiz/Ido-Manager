import { IsObject } from 'class-validator';

export class UpdateDocumentDto {
  @IsObject()
  dataJson!: Record<string, unknown>;
}
