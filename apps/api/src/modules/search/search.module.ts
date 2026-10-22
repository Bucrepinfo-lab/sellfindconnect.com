/**
 * Not mounted in AppModule. Live discovery uses Source Finder
 * (`/v1/source-finder/*`). Keep this module unmounted until a dedicated
 * advert-index adapter is wired with a real Prisma token.
 */
import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { PostgresSearchAdapter } from "./adapters/postgres-search.adapter";
import { EmbeddingService } from "./adapters/embedding.service";

@Module({
  providers: [
    EmbeddingService,
    {
      provide: "SEARCH_ADAPTER",
      useFactory: (prisma: any) => new PostgresSearchAdapter(prisma),
      inject: ["PrismaService"],
    },
    {
      provide: SearchService,
      useFactory: (adapter: any, embedder: EmbeddingService) => new SearchService(adapter, embedder),
      inject: ["SEARCH_ADAPTER", EmbeddingService],
    },
  ],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
