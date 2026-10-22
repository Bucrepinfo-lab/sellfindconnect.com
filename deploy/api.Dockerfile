FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/config/package.json packages/config/package.json

RUN npm ci

COPY . .

RUN npm run build:api

FROM node:24-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm ci --omit=dev --ignore-scripts --workspace @telpen/api --workspace @telpen/domain --workspace @telpen/database

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/domain/dist packages/domain/dist
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY packages/database/prisma packages/database/prisma
COPY packages/database/prisma.config.ts packages/database/prisma.config.ts
COPY deploy/api-release.sh deploy/api-release.sh

RUN chmod +x deploy/api-release.sh

CMD ["node", "apps/api/dist/main.js"]
