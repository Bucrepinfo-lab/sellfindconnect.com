import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Post,
  Query,
  Req,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AndroidAppCheckoutGuard } from '../../common/android-app-checkout.guard';
import { CheckoutDto, PayoutDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('subscription-options')
  @UseGuards(AndroidAppCheckoutGuard)
  @ApiHeader({ name: 'x-session-token', required: true })
  subscriptionOptions(@Headers('x-session-token') sessionToken: string) {
    return this.payments.getSubscriptionOptions(sessionToken);
  }

  @Post('checkout')
  @UseGuards(AndroidAppCheckoutGuard)
  @ApiHeader({ name: 'x-session-token', required: true })
  checkout(@Headers('x-session-token') sessionToken: string, @Body() body: CheckoutDto) {
    return this.payments.requestCheckout(sessionToken, body);
  }

  @Post('payout')
  @ApiHeader({ name: 'x-session-token', required: true })
  payout(@Headers('x-session-token') sessionToken: string, @Body() body: PayoutDto) {
    return this.payments.requestPayout(sessionToken, body);
  }

  /** Paddle notifications (card sales). Signature-checked on the raw body. */
  @Post('paddle/webhook')
  async paddleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('paddle-signature') signature: string | undefined,
  ) {
    const result = await this.payments.handlePaddleWebhook(request.rawBody?.toString('utf8') ?? '', signature);
    if (!result.ok) throw new HttpException({ error: result.error }, result.status);
    return result;
  }

  @Post('at/callback')
  atCallback(
    @Query('token') token: string,
    @Body() body: { transactionId?: string; status?: string },
  ) {
    return this.payments.reconcileCallback(token, body);
  }
}
