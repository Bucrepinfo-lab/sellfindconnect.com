import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { evaluateSafetyText } from '@telpen/domain';

import { CheckSafetyDto } from './dto/check-safety.dto';

@ApiTags('safety')
@Controller('safety')
export class SafetyController {
  @Post('check')
  check(@Body() body: CheckSafetyDto) {
    return evaluateSafetyText(body.text);
  }
}
