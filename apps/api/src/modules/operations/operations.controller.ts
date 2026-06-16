import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AdvertsService } from '../adverts/adverts.service';
import { RunAdvertLifecycleDto } from '../adverts/dto/create-advert.dto';
import { InternalJobGuard } from './internal-job.guard';

@ApiTags('operations')
@ApiHeader({
  name: 'x-internal-job-key',
  description: 'Shared secret for scheduled internal maintenance jobs.',
})
@UseGuards(InternalJobGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly adverts: AdvertsService) {}

  @Post('adverts/lifecycle/run')
  runAdvertLifecycle(@Body() body: RunAdvertLifecycleDto) {
    return this.adverts.runAllLifecycles(body);
  }
}
