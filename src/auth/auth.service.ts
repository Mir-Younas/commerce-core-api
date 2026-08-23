import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { createAccessToken } from './utils/create-access-token';
import { createSecureToken, hashToken } from './utils/secure-token.util';
import { REFRESH_TOKEN_MAX_AGE_MS } from './utils/auth-cookies';
import type { GoogleUser } from './auth.types';

// const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_EXPIRES_IN_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRES_IN_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private async createAndSendVerificationEmail(
    userId: string,
    email: string,
  ): Promise<void> {
    // Ensure only the latest verification link remains valid
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });

    const verificationTokenSecret = this.configService.getOrThrow<string>(
      'EMAIL_VERIFICATION_TOKEN_HASH_SECRET',
    );

    const { rawToken, tokenHash, expiresAt } = createSecureToken({
      secret: verificationTokenSecret,
      expiresInMs: EMAIL_VERIFICATION_EXPIRES_IN_MS,
    });

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    const verificationUrl = new URL('/email-verification', clientUrl);

    verificationUrl.searchParams.set('token', rawToken);

    await this.emailService.sendVerificationEmail(
      email,
      verificationUrl.toString(),
    );
  }

  private async createAuthSession(userId: string) {
    const accessToken = await createAccessToken(
      this.jwtService,
      this.configService,
      userId,
    );

    const refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_HASH_SECRET',
    );

    const { rawToken, tokenHash, expiresAt } = createSecureToken({
      secret: refreshTokenSecret,
      expiresInMs: REFRESH_TOKEN_MAX_AGE_MS,
    });

    await this.prisma.session.deleteMany({
      where: {
        userId,
      },
    });

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawToken,
    };
  }

  async signup(body: SignUpDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
      },
    });

    await this.createAndSendVerificationEmail(user.id, user.email);
  }

  async login(body: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordCorrect = await bcrypt.compare(
      body.password,
      user.password,
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Your account has been blocked');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    const { accessToken, refreshToken } = await this.createAuthSession(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
    };

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_HASH_SECRET',
    );

    const refreshTokenHash = hashToken(refreshToken, refreshTokenSecret);

    await this.prisma.session.deleteMany({
      where: {
        refreshTokenHash,
      },
    });
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_HASH_SECRET',
    );

    const refreshTokenHash = hashToken(refreshToken, refreshTokenSecret);

    const session = await this.prisma.session.findUnique({
      where: {
        refreshTokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            isEmailVerified: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.session.deleteMany({
        where: {
          refreshTokenHash,
        },
      });

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Your account has been blocked');
    }

    if (!session.user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before continuing',
      );
    }

    const accessToken = await createAccessToken(
      this.jwtService,
      this.configService,
      session.user.id,
    );

    return {
      accessToken,
    };
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const verificationTokenSecret = this.configService.getOrThrow<string>(
      'EMAIL_VERIFICATION_TOKEN_HASH_SECRET',
    );

    const tokenHash = hashToken(rawToken, verificationTokenSecret);

    const verificationToken =
      await this.prisma.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },
        select: {
          userId: true,
          expiresAt: true,
        },
      });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    if (verificationToken.expiresAt <= new Date()) {
      throw new BadRequestException('Verification link has expired');
    }

    await this.prisma.user.update({
      where: {
        id: verificationToken.userId,
      },
      data: {
        isEmailVerified: true,
      },
    });

    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        userId: verificationToken.userId,
      },
    });
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });

    if (!user || user.isEmailVerified) {
      return;
    }

    await this.createAndSendVerificationEmail(user.id, user.email);
  }

  async forgotPassword(body: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return;
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    const passwordResetTokenSecret = this.configService.getOrThrow<string>(
      'PASSWORD_RESET_TOKEN_HASH_SECRET',
    );

    const { rawToken, tokenHash, expiresAt } = createSecureToken({
      secret: passwordResetTokenSecret,
      expiresInMs: PASSWORD_RESET_EXPIRES_IN_MS,
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    const resetUrl = new URL('/password-reset', clientUrl);

    resetUrl.searchParams.set('token', rawToken);

    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetUrl.toString(),
    );
  }

  async resetPassword(body: ResetPasswordDto): Promise<void> {
    const passwordResetTokenSecret = this.configService.getOrThrow<string>(
      'PASSWORD_RESET_TOKEN_HASH_SECRET',
    );

    const tokenHash = hashToken(body.token, passwordResetTokenSecret);

    const passwordResetToken = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        userId: true,
        expiresAt: true,
      },
    });

    if (!passwordResetToken) {
      throw new BadRequestException('Invalid or expired password reset link');
    }

    if (passwordResetToken.expiresAt <= new Date()) {
      throw new BadRequestException('Password reset link has expired');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    await this.prisma.user.update({
      where: {
        id: passwordResetToken.userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    await this.prisma.session.deleteMany({
      where: {
        userId: passwordResetToken.userId,
      },
    });

    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: passwordResetToken.userId,
      },
    });
  }

  async googleLogin(googleUser: GoogleUser) {
    let user = await this.prisma.user.findUnique({
      where: {
        email: googleUser.email,
      },
      select: {
        id: true,
        googleId: true,
        status: true,
      },
    });

    if (user && user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Your account has been blocked');
    }

    if (user?.googleId && user.googleId !== googleUser.googleId) {
      throw new ConflictException(
        'This email is already linked with another Google account',
      );
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: googleUser.name || googleUser.email.split('@')[0],
          email: googleUser.email,
          googleId: googleUser.googleId,
          isEmailVerified: true,
          role: Role.USER,
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          googleId: true,
          status: true,
        },
      });
    }

    if (!user.googleId) {
      user = await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          googleId: googleUser.googleId,
          isEmailVerified: true,
        },
        select: {
          id: true,
          googleId: true,
          status: true,
        },
      });
    }

    const { accessToken, refreshToken } = await this.createAuthSession(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }
}
