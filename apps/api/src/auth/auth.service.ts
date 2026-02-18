import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';
import { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existingUser) {
      throw new BadRequestException({ code: 'EMAIL_IN_USE', message: 'Email is already in use' });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const created = await this.prisma.$transaction(async (tx: any) => {
      let businessId: string | null = null;

      if (input.role === 'ADMIN') {
        const businessName = input.businessName?.trim();
        if (!businessName) {
          throw new BadRequestException({
            code: 'BUSINESS_REQUIRED',
            message: 'businessName is required for ADMIN role',
          });
        }
        const slug = slugify(businessName, { lower: true, strict: true });
        const business = await tx.business.create({
          data: { name: businessName, slug: `${slug}-${Date.now()}` },
        });
        businessId = business.id;
      }

      return tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: input.role,
          businessId,
        },
      });
    });

    return this.issueAuthSession(created.id);
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    return this.issueAuthSession(user.id);
  }

  async me(user: CurrentUser) {
    return this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true, role: true, businessId: true, createdAt: true, updatedAt: true },
    });
  }

  async refresh(payload: { sub: string; tokenId: string; refreshToken: string }) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });

    if (!tokenRecord || tokenRecord.userId !== payload.sub || tokenRecord.revokedAt) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid',
      });
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token expired' });
    }

    const valid = await bcrypt.compare(payload.refreshToken, tokenRecord.hash);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid',
      });
    }

    await this.prisma.refreshToken.update({ where: { id: tokenRecord.id }, data: { revokedAt: new Date() } });

    return this.issueAuthSession(payload.sub);
  }

  async logout(payload: { sub: string; tokenId: string }) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });

    if (!tokenRecord || tokenRecord.userId !== payload.sub) {
      throw new ForbiddenException({ code: 'TOKEN_NOT_FOUND', message: 'Refresh token not found' });
    }

    await this.prisma.refreshToken.update({ where: { id: tokenRecord.id }, data: { revokedAt: new Date() } });

    return { ok: true };
  }

  private async issueAuthSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const accessPayload: CurrentUser = {
      sub: user.id,
      email: user.email,
      role: user.role as CurrentUser['role'],
      businessId: user.businessId,
    };

    const refreshTokenId = randomUUID();
    const refreshPayload = { sub: user.id, tokenId: refreshTokenId };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d') as any,
    });

    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        hash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    };
  }
}

