import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEvent(user: CurrentUser, eventId: string) {
    const businessId = this.requiredBusinessId(user);
    await this.assertEventInBusiness(eventId, businessId);
    return this.prisma.document.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: { template: true },
    });
  }

  async createForEvent(user: CurrentUser, eventId: string, dto: CreateDocumentDto) {
    const businessId = this.requiredBusinessId(user);
    await this.assertEventInBusiness(eventId, businessId);

    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, businessId },
    });
    if (!template) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'Template not found in business scope',
      });
    }

    return this.prisma.document.create({
      data: {
        eventId,
        templateId: dto.templateId,
        name: dto.name,
        dataJson: template.schemaJson as Prisma.InputJsonValue,
        createdBy: user.sub,
      },
    });
  }

  async findOne(user: CurrentUser, id: string) {
    const businessId = this.requiredBusinessId(user);
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        event: { businessId },
      },
      include: { template: true, event: true },
    });

    if (!document) {
      throw new NotFoundException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found',
      });
    }

    return document;
  }

  async update(user: CurrentUser, id: string, dto: UpdateDocumentDto) {
    await this.findOne(user, id);
    return this.prisma.document.update({
      where: { id },
      data: { dataJson: dto.dataJson as Prisma.InputJsonValue },
    });
  }

  async remove(user: CurrentUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.document.delete({ where: { id } });
    return { ok: true };
  }

  private async assertEventInBusiness(eventId: string, businessId: string) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, businessId } });
    if (!event) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
      });
    }
  }

  private requiredBusinessId(user: CurrentUser) {
    if (!user.businessId) {
      throw new ForbiddenException({
        code: 'BUSINESS_REQUIRED',
        message: 'User must belong to a business to perform this action',
      });
    }
    return user.businessId;
  }
}

