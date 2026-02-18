import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { CurrentUser } from '../common/types/current-user.type';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@Controller({ path: '', version: '1' })
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('events/:eventId/documents')
  findByEvent(@CurrentUserDecorator() user: CurrentUser, @Param('eventId') eventId: string) {
    return this.documentsService.findByEvent(user, eventId);
  }

  @Post('events/:eventId/documents')
  create(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('eventId') eventId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.createForEvent(user, eventId, dto);
  }

  @Get('documents/:id')
  findOne(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.documentsService.findOne(user, id);
  }

  @Patch('documents/:id')
  update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(user, id, dto);
  }

  @Delete('documents/:id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.documentsService.remove(user, id);
  }
}
