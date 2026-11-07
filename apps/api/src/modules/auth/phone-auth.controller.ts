import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import {
  PinSignInDto,
  RegisterPhoneOwnerDto,
  RequestPhoneCodeDto,
  RevokeDevicesDto,
  SetPinDto,
  VerifyPhoneCodeDto,
} from './dto/phone-auth.dto';
import { PhoneAuthService, TRUSTED_DEVICE_TTL_MS } from './phone-auth.service';

export const DEVICE_COOKIE = 'sfc_device';
const COOKIE_PATH = '/v1/auth/phone';

function clientIp(request: Request): string {
  const fly = request.header('fly-client-ip');
  const forwarded = request.header('x-forwarded-for')?.split(',')[0];
  return (fly || forwarded || request.ip || 'unknown').trim();
}

export function readDeviceCookie(request: Pick<Request, 'headers'>): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === DEVICE_COOKIE) {
      const value = rest.join('=');
      return /^[A-Za-z0-9_-]{20,200}$/.test(value) ? value : undefined;
    }
  }
  return undefined;
}

function setDeviceCookie(response: Response, token: string) {
  response.cookie(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: TRUSTED_DEVICE_TTL_MS,
  });
}

function clearDeviceCookie(response: Response) {
  response.clearCookie(DEVICE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
  });
}

/**
 * Phone-first sign-in. The trusted-device token only ever travels in an
 * httpOnly cookie scoped to /v1/auth/phone; it is never in a response body.
 */
@ApiTags('auth-phone')
@Controller('auth/phone')
export class PhoneAuthController {
  constructor(private readonly phoneAuth: PhoneAuthService) {}

  @Post('code/request')
  requestCode(@Req() request: Request, @Body() body: RequestPhoneCodeDto) {
    return this.phoneAuth.requestCode(body.phone, clientIp(request));
  }

  @Post('code/verify')
  async verifyCode(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: VerifyPhoneCodeDto,
  ) {
    const verified = await this.phoneAuth.verifyCode(body.phone, body.code, clientIp(request), body.deviceLabel);
    if ('deviceToken' in verified) {
      setDeviceCookie(response, verified.deviceToken);
    }
    return verified.result;
  }

  @Post('register')
  async register(@Res({ passthrough: true }) response: Response, @Body() body: RegisterPhoneOwnerDto) {
    const registered = await this.phoneAuth.register(body);
    setDeviceCookie(response, registered.deviceToken);
    return registered.result;
  }

  @Post('pin')
  async setPin(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: SetPinDto,
  ) {
    const saved = await this.phoneAuth.setPin(body.sessionToken, body.pin, readDeviceCookie(request));
    if (saved.deviceToken) {
      setDeviceCookie(response, saved.deviceToken);
    }
    return saved.result;
  }

  @Post('pin/sign-in')
  async signInWithPin(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: PinSignInDto,
  ) {
    try {
      return await this.phoneAuth.signInWithPin(body.pin, readDeviceCookie(request), clientIp(request));
    } catch (error) {
      const code = (error as { response?: { code?: string } })?.response?.code;
      if (code === 'SMS_REQUIRED') {
        clearDeviceCookie(response);
      }
      throw error;
    }
  }

  @Get('device')
  deviceStatus(@Req() request: Request) {
    return this.phoneAuth.deviceStatus(readDeviceCookie(request));
  }

  @Post('device/forget')
  async forgetDevice(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.phoneAuth.forgetDevice(readDeviceCookie(request));
    clearDeviceCookie(response);
    return result;
  }

  @Post('devices/revoke')
  async revokeAll(@Res({ passthrough: true }) response: Response, @Body() body: RevokeDevicesDto) {
    const result = await this.phoneAuth.revokeAllDevices(body.sessionToken);
    clearDeviceCookie(response);
    return result;
  }
}
