import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AdvertsService } from '../adverts/adverts.service';
import { RunAdvertLifecycleDto } from '../adverts/dto/create-advert.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { RunConversationSlaDto } from '../conversations/dto/conversations.dto';
import { InternalJobGuard } from './internal-job.guard';

@ApiTags('operations')
@ApiHeader({
  name: 'x-internal-job-key',
  description: 'Shared secret for scheduled internal maintenance jobs.',
})
@UseGuards(InternalJobGuard)
@Controller('operations')
export class OperationsController {
  constructor(
    private readonly adverts: AdvertsService,
    private readonly conversations: ConversationsService,
  ) {}

  @Post('adverts/lifecycle/run')
  runAdvertLifecycle(@Body() body: RunAdvertLifecycleDto) {
    return this.adverts.runAllLifecycles(body);
  }

  @Post('conversations/sla/run')
  runConversationSlaChecks(@Body() body: RunConversationSlaDto) {
    return this.conversations.runAllSlaChecks(body);
  }
}
