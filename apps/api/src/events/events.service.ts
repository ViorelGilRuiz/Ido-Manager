import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUser) {
    const businessId = this.requiredBusinessId(user);
    return this.prisma.event.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } });
  }

  async create(user: CurrentUser, dto: CreateEventDto) {
    const businessId = this.requiredBusinessId(user);
    return this.prisma.event.create({
      data: {
        businessId,
        type: dto.type,
        title: dto.title,
        date: dto.date ? new Date(dto.date) : null,
        status: dto.status,
        createdBy: user.sub,
      },
    });
  }

  async findOne(user: CurrentUser, id: string) {
    const businessId = this.requiredBusinessId(user);
    const event = await this.prisma.event.findFirst({ where: { id, businessId } });
    if (!event) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found' });
    }
    return event;
  }

  async update(user: CurrentUser, id: string, dto: UpdateEventDto) {
    await this.findOne(user, id);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date !== undefined ? { date: dto.date ? new Date(dto.date) : null } : {}),
      },
    });
  }

  async remove(user: CurrentUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.event.delete({ where: { id } });
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
