import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE_NAME,
  setAuthCookies,
  ACCESS_TOKEN_MAX_AGE_MS,
} from './utils/auth-cookies';
import type { AuthRequest, GoogleAuthRequest } from './auth.types';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(@Body() body: SignUpDto) {
    await this.authService.signup(body);

    return {
      message:
        'Account created successfully. Please verify your email before logging in.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(body);

    setAuthCookies(res, this.configService, accessToken, refreshToken);

    return {
      message: 'Login successful',
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    await this.authService.logout(refreshToken);
    clearAuthCookies(res);

    return {
      message: 'Logout successful',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    const { accessToken } = await this.authService.refresh(refreshToken);

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
      path: '/',
    });

    return {
      message: 'Access token refreshed successfully',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthRequest) {
    return { user: req.user };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    await this.authService.verifyEmail(body.token);

    return {
      message: 'Email verified successfully. Please log in.',
    };
  }

  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  async resendVerificationEmail(@Body() body: ResendVerificationEmailDto) {
    await this.authService.resendVerificationEmail(body.email);

    return {
      message:
        'If an unverified account exists with this email, a new verification link has been sent.',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body);

    return {
      message:
        'If an account exists with this email, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body);

    return {
      message: 'Password reset successful',
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // GoogleAuthGuard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: GoogleAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {

    const { accessToken, refreshToken } = await this.authService.googleLogin(
      req.user,
    );

    setAuthCookies(res, this.configService, accessToken, refreshToken);

    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    return res.redirect(clientUrl);
    // return {
    //   message: 'Google login successful',
    // };
  }
}
