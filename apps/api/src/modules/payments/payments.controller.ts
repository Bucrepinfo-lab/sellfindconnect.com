import { Body, Controller, Headers, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { CheckoutDto, PayoutDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  @ApiHeader({ name: 'x-session-token', required: true })
  checkout(@Headers('x-session-token') sessionToken: string, @Body() body: CheckoutDto) {
    return this.payments.requestCheckout(sessionToken, body);
  }

  @Post('payout')
  @ApiHeader({ name: 'x-session-token', required: true })
  payout(@Headers('x-session-token') sessionToken: string, @Body() body: PayoutDto) {
    return this.payments.requestPayout(sessionToken, body);
  }

  @Post('at/callback')
  atCallback(
    @Query('token') token: string,
    @Body() body: { transactionId?: string; status?: string },
  ) {
    return this.payments.reconcileCallback(token, body);
  }
}
