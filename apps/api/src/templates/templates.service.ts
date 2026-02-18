import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    user: CurrentUser,
    type?: 'CHECKLIST' | 'TIMELINE' | 'BUDGET' | 'GUEST_LIST' | 'VENDOR_LIST',
    q?: string,
  ) {
    const businessId = this.requiredBusinessId(user);

    return this.prisma.template.findMany({
      where: {
        businessId,
        ...(type ? { type } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: CurrentUser, dto: CreateTemplateDto) {
    const businessId = this.requiredBusinessId(user);

    return this.prisma.template.create({
      data: {
        businessId,
        createdBy: user.sub,
        type: dto.type as any,
        name: dto.name,
        description: dto.description,
        schemaJson: dto.schemaJson as Prisma.InputJsonValue,
      },
    });
  }

  async findOne(user: CurrentUser, id: string) {
    const businessId = this.requiredBusinessId(user);
    const template = await this.prisma.template.findFirst({ where: { id, businessId } });
    if (!template) {
      throw new NotFoundException({ code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' });
    }
    return template;
  }

  async update(user: CurrentUser, id: string, dto: UpdateTemplateDto) {
    await this.findOne(user, id);
    return this.prisma.template.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type as any } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.schemaJson !== undefined
          ? { schemaJson: dto.schemaJson as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async remove(user: CurrentUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.template.delete({ where: { id } });
    return { ok: true };
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
