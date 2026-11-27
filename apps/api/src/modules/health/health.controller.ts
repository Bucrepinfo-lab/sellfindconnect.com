import { Controller, Get } from "@nestjs/common";

import { presentPersistenceHealth } from "../../persistence";
import { presentMediaStorageHealth } from "../media/media.adapters";

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
      // Owner 27/11/26: production ran without a picture store unnoticed.
      media: presentMediaStorageHealth({ get: (key) => process.env[key] }),
    };
  }
}
