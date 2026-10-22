import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AccessService } from './access.service';
import { EvaluateAccessDto } from './dto/access.dto';

@ApiTags('access')
@Controller('access')
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('roles')
  getRoleMatrix() {
    return this.access.getRoleMatrix();
  }

  @Post('evaluate')
  evaluateAccess(@Body() body: EvaluateAccessDto) {
    return this.access.evaluate(body);
  }

  @Get('audit')
  listAudit() {
    return this.access.listAudit();
  }
}
