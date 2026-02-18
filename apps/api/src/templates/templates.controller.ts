import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { CurrentUser } from '../common/types/current-user.type';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplatesService } from './templates.service';

@Controller({ path: 'templates', version: '1' })
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('type') type?: 'CHECKLIST' | 'TIMELINE' | 'BUDGET' | 'GUEST_LIST' | 'VENDOR_LIST',
    @Query('q') q?: string,
  ) {
    return this.templatesService.findAll(user, type, q);
  }

  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.templatesService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.templatesService.remove(user, id);
  }
}
