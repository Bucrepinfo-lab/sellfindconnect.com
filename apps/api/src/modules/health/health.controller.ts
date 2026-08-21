import { Controller, Get } from "@nestjs/common";

import { presentPersistenceHealth } from "../../persistence";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "sellfindconnect-api",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      env: process.env.NODE_ENV ?? "development",
      persistence: presentPersistenceHealth({
        get: (key) => process.env[key],
      }),
    };
  }
}
