import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AdvertsService } from '../adverts/adverts.service';
import { RunAdvertLifecycleDto } from '../adverts/dto/create-advert.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  RunAnalyticsPrivacyRequestDto,
  RunAnalyticsRetentionDto,
  RunAnalyticsRollupDto,
} from '../analytics/dto/create-analytics-event.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { RunConversationSlaDto } from '../conversations/dto/conversations.dto';
import { RunMediaProcessingJobsDto } from '../media/dto/media-worker.dto';
import { MediaWorkerService } from '../media/media-worker.service';
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
    private readonly analytics: AnalyticsService,
    private readonly conversations: ConversationsService,
    private readonly mediaWorker: MediaWorkerService,
  ) {}

  @Post('adverts/lifecycle/run')
  runAdvertLifecycle(@Body() body: RunAdvertLifecycleDto) {
    return this.adverts.runAllLifecycles(body);
  }

  @Post('conversations/sla/run')
  runConversationSlaChecks(@Body() body: RunConversationSlaDto) {
    return this.conversations.runAllSlaChecks(body);
  }

  @Post('analytics/retention/run')
  runAnalyticsRetention(@Body() body: RunAnalyticsRetentionDto) {
    return this.analytics.runRetention(body);
  }

  @Post('analytics/rollups/run')
  runAnalyticsRollups(@Body() body: RunAnalyticsRollupDto) {
    return this.analytics.runRollupRefresh(body);
  }

  @Post('analytics/privacy-requests/run')
  runAnalyticsPrivacyRequests(@Body() body: RunAnalyticsPrivacyRequestDto) {
    return this.analytics.runPrivacyRequest(body);
  }

  @Post('media/processing/run')
  runMediaProcessingJobs(@Body() body: RunMediaProcessingJobsDto) {
    return this.mediaWorker.runOnce(body);
  }
}
