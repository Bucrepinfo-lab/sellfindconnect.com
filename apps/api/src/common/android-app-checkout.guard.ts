import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import {
  CLIENT_CONTEXT_HEADER,
  isAndroidAppClientHeader,
  isPaymentMethodAllowedInAndroidApp,
} from '@telpen/domain';
import type { Request } from 'express';

export const ANDROID_APP_CHECKOUT_BLOCKED =
  'Subscriptions and checkout are not available in the Android app. Google Play policy requires Play Billing for digital goods.';

/**
 * Refuses non-Play checkout when the request identifies itself as coming from
 * the Android (TWA) app via the `x-sfc-client: android-twa` header that the web
 * app sends from inside the app. Play Billing (`method: WALLET`) is the only
 * method allowed there. Web requests are unaffected.
 */
@Injectable()
export class AndroidAppCheckoutGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!isAndroidAppClientHeader(request.headers[CLIENT_CONTEXT_HEADER])) {
      return true;
    }

    const body: unknown = request.body;
    const method =
      body && typeof body === 'object' && 'method' in body && typeof body.method === 'string'
        ? body.method
        : '';
    if (method && isPaymentMethodAllowedInAndroidApp(method)) {
      return true;
    }

    throw new ForbiddenException(ANDROID_APP_CHECKOUT_BLOCKED);
  }
}
