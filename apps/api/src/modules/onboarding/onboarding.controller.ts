import { Body, Controller, Post, Req } from "@nestjs/common";

interface IntentDto { intent: "SELL"|"FIND"|"BOTH"; role?: string; industry?: string; query?: string; }

@Controller("v1/onboarding")
export class OnboardingController {
  @Post("intent")
  async recordIntent(@Req() req: any, @Body() body: IntentDto) {
    return {
      tenantId: req.tenantId,
      intent: body.intent,
      role: body.role ?? null,
      industry: body.industry ?? null,
      redirectTo: body.intent === "SELL"
        ? "/dashboard/adverts/new?onboarding=1&role=" + (body.role ?? "")
        : "/dashboard/discover?onboarding=1&industry=" + (body.industry ?? "") + "&q=" + encodeURIComponent(body.query ?? ""),
    };
  }
}
