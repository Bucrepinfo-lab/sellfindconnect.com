# Telpen Adverts Development Environment

Status: Recommended Windows development setup
Date: 2026-06-15

## Required Installations

### 1. Docker Desktop with WSL 2

Purpose:

- PostgreSQL database
- Redis cache and job queue
- Meilisearch development search engine
- Mailpit local email capture

Docker Desktop is the highest-priority missing tool. It keeps service versions
consistent and avoids separate Windows installations.

Official guide:
https://docs.docker.com/desktop/setup/install/windows-install/

### 2. Volta

Purpose:

- Pin one Node.js and npm version for every terminal and developer.
- Avoid the current machine inconsistency where different execution contexts
  expose different Node versions.

Target runtime:

- Node.js 24 LTS
- npm version bundled with the pinned Node release

Production applications should use an Active LTS or Maintenance LTS Node release.

Official guides:

- https://nodejs.org/en/about/previous-releases
- https://docs.volta.sh/guide/getting-started

## Recommended Installations

### DBeaver Community

Purpose:

- Inspect PostgreSQL schemas and records.
- Run read-only development queries.
- Review migrations and tax/finance data during implementation.

### Android Studio

Install when the React Native Android application begins. It provides the Android
SDK, emulator, build tools, device logs, and app bundle tooling.

### iOS Build Environment

Final iOS builds require macOS and Xcode. The team will need either:

- A Mac with Xcode, or
- A hosted macOS build service such as Expo EAS Build or another CI provider.

## Optional Tools

- Postman, Bruno, or Insomnia for manual API testing.
- pgAdmin if DBeaver is not preferred.
- GitHub CLI for pull requests and workflow inspection.

## Local Service Ports

| Service | Port |
| --- | --- |
| Web | 3000 |
| API | 4000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Meilisearch | 7700 |
| Mailpit web UI | 8025 |
| Mailpit SMTP | 1025 |

