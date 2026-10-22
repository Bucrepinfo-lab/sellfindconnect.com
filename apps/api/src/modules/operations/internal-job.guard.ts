import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalJobGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedKey = this.config.get<string>('INTERNAL_JOB_KEY');
    if (!expectedKey) {
      throw new ServiceUnavailableException('Internal job key is not configured.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.header('x-internal-job-key');
    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('A valid x-internal-job-key header is required.');
    }

    return true;
  }
}
