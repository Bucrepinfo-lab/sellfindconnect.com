import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import {
  CheckTenantSessionDto,
  ConfirmEmailVerificationDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterTenantOwnerDto,
  RequestEmailVerificationDto,
  RequestPasswordResetDto,
  VerifyMfaDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register-owner')
  registerTenantOwner(@Body() body: RegisterTenantOwnerDto) {
    return this.auth.registerTenantOwner(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post('email-verification/request')
  requestEmailVerification(@Body() body: RequestEmailVerificationDto) {
    return this.auth.requestEmailVerification(body);
  }

  @Post('email-verification/confirm')
  confirmEmailVerification(@Body() body: ConfirmEmailVerificationDto) {
    return this.auth.confirmEmailVerification(body);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(body);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() body: ConfirmPasswordResetDto) {
    return this.auth.confirmPasswordReset(body);
  }

  @Post('mfa/verify')
  verifyMfa(@Body() body: VerifyMfaDto) {
    return this.auth.verifyMfa(body);
  }

  @Post('tenant-session/check')
  checkTenantSession(@Body() body: CheckTenantSessionDto) {
    return this.auth.checkTenantSession(body);
  }

  @Get('session')
  @ApiHeader({ name: 'x-session-token', required: true })
  getSession(@Headers('x-session-token') sessionToken: string) {
    return this.auth.getSession(sessionToken);
  }

  @Get('tenants')
  listTenants() {
    return this.auth.listTenants();
  }
}
