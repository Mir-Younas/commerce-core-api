import { Role, UserStatus } from '@prisma/client';
// import { Request } from '@nestjs/common';
import { Request } from 'express';

export type JwtPayload = {
  sub: string;
};

export interface AuthRequest extends Request {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

export type GoogleUser = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

export interface GoogleAuthRequest extends Request {
  user: GoogleUser
  
}
