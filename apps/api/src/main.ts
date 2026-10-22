import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { resolveCorsOrigins } from "./cors-origins";
import { SanitizeInputPipe } from "./common/sanitize-input.pipe";
import { ConversationsIoAdapter } from "./modules/conversations/conversations-io.adapter";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const webOrigins = resolveCorsOrigins(
    config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000",
    config.get<string>("WEB_ORIGINS"),
  );

  app.setGlobalPrefix("v1");
  app.use(helmet());
  app.enableCors({ origin: webOrigins, credentials: true });
  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    }),
  );

  const documentConfig = new DocumentBuilder()
    .setTitle("Telpen Adverts API")
    .setDescription("Multi-tenant advertising, Source Finder, safety, finance and analytics API")
    .setVersion("0.1.0")
    .addApiKey({ type: "apiKey", name: "x-tenant-id", in: "header" }, "tenant-id")
    .addApiKey({ type: "apiKey", name: "x-session-token", in: "header" }, "session-token")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, documentConfig));

  const port = Number(config.get<string>("PORT") ?? config.get<string>("API_PORT") ?? 4000);
  app.useWebSocketAdapter(new ConversationsIoAdapter(app, webOrigins));
  // Bind all interfaces so Fly.io, DigitalOcean, and local Docker health checks work.
  await app.listen(port, "0.0.0.0");
  console.log(`API listening on 0.0.0.0:${port} [${process.env.NODE_ENV ?? "development"}]`);
}

void bootstrap();
