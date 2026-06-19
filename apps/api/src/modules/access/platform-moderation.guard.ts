import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import type { PlatformAccessRequest } from './platform-access.decorator';

type HeaderRequest = PlatformAccessRequest & {
  header(name: string): string | undefined;
};

@Injectable()
export class PlatformModerationGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HeaderRequest>();
    const sessionToken = request.header('x-session-token');

    if (!sessionToken) {
      throw new UnauthorizedException('A valid x-session-token header is required for moderation routes.');
    }

    request.platformAccess = await this.auth.checkPlatformSession({
      sessionToken,
      permission: 'MODERATE_CONTENT',
    });
    return true;
  }
}
