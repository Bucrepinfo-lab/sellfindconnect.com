import { Body, Controller, Post } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

class OnboardingIntentDto {
  @ApiProperty({ enum: ['SELL', 'FIND', 'BOTH'] })
  @IsIn(['SELL', 'FIND', 'BOTH'])
  declare intent: 'SELL' | 'FIND' | 'BOTH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare query?: string;
}

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  @Post('intent')
  recordIntent(@Body() body: OnboardingIntentDto) {
    const role = body.role ?? '';
    const industry = body.industry ?? '';
    const query = body.query ?? '';
    return {
      intent: body.intent,
      role: body.role ?? null,
      industry: body.industry ?? null,
      redirectTo:
        body.intent === 'SELL'
          ? `/dashboard/adverts/new?onboarding=1&role=${encodeURIComponent(role)}`
          : `/dashboard/discover?onboarding=1&industry=${encodeURIComponent(industry)}&q=${encodeURIComponent(query)}`,
    };
  }
}
