import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { CheckTenantSessionDto, LoginDto, RegisterTenantOwnerDto, VerifyMfaDto } from './dto/auth.dto';

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
