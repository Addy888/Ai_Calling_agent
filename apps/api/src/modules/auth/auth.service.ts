import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with company and roles
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    if (!user.company.isActive) {
      throw new UnauthorizedException('Company is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Format user response
    const userResponse = this.formatUserResponse(user);

    // Log activity
    await this.logActivity(user.companyId, user.id, 'USER_LOGIN', {
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: {
        user: userResponse,
        tokens,
      },
      message: 'Login successful',
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, phone, companyId } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    if (!company.isActive) {
      throw new BadRequestException('Company is inactive');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '10')
    );

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        companyId,
        status: 'ACTIVE',
        isActive: true,
        emailVerified: false,
        createdBy: 'SELF_REGISTER',
      },
      include: {
        company: true,
      },
    });

    // Assign default viewer role
    const viewerRole = await this.prisma.role.findUnique({
      where: { slug: 'viewer' },
    });

    if (viewerRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: viewerRole.id,
        },
      });
    }

    // Format user response
    const userResponse = this.formatUserResponse(user);

    // Log activity
    await this.logActivity(company.id, user.id, 'USER_REGISTER', {
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: userResponse,
      message: 'User registered successfully',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-super-secret-refresh-token-key-change-this-in-production-use-64-chars',
      });

      // Check if refresh token exists in database
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            include: {
              company: true,
              roles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        await this.prisma.refreshToken.delete({
          where: { id: tokenRecord.id },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Check if user is active
      if (!tokenRecord.user.isActive || !tokenRecord.user.company.isActive) {
        throw new UnauthorizedException('User or company is inactive');
      }

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(tokenRecord.user);

      return {
        success: true,
        data: tokens,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    // Delete the specific refresh token if provided
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all refresh tokens for the user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    // Log activity
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (user) {
      await this.logActivity(user.companyId, userId, 'USER_LOGOUT', {
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles?.map((ur: any) => ur.role.slug) || [],
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key-change-this-in-production-use-at-least-32-characters',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '8h',
    });

    // Generate refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-super-secret-refresh-token-key-change-this-in-production-use-64-chars',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Calculate expiration date
    const expiresAt = new Date();
    const expiresInDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')?.replace('d', '') || '7');
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Save refresh token to database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '8h',
    };
  }

  private formatUserResponse(user: any) {
    const roles = user.roles?.map((ur: any) => ({
      id: ur.role.id,
      name: ur.role.name,
      slug: ur.role.slug,
    })) || [];

    const permissions = user.roles?.flatMap((ur: any) =>
      ur.role.permissions?.map((rp: any) => rp.permission.slug) || []
    ) || [];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      company: {
        id: user.company.id,
        name: user.company.name,
        email: user.company.email,
      },
      roles,
      permissions: Array.from(new Set(permissions)),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async logActivity(companyId: string, userId: string, action: string, details: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          companyId,
          userId,
          action,
          module: 'auth',
          details,
        },
      });
    } catch (error) {
      // Don't fail the request if activity logging fails
      console.error('Failed to log activity:', error);
    }
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.formatUserResponse(user);
  }
}

