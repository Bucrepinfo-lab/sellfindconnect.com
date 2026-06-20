# Media Pipeline

Status: provider-ready foundation
Last updated: 2026-06-20

## Current Capability

- Profile and advert media share one API media adapter foundation.
- Development mode returns deterministic local-style upload URLs without
  external credentials.
- S3-compatible mode creates presigned PUT URLs with AWS Signature Version 4
  using Node.js crypto, without adding an SDK dependency.
- Media attach flows queue processing jobs through a worker-facing interface for
  malware scan, content moderation, image transform, and video transcode work.
- Processing jobs use an in-memory development queue by default and can switch
  to a durable Prisma/PostgreSQL outbox so scan/transform jobs survive API
  restarts and can be claimed by background workers.
- An internal worker runner can claim and process a bounded batch through
  `POST /v1/operations/media/processing/run`, protected by `x-internal-job-key`.
- Generic HTTP processor adapters can call provider-backed malware scanning,
  content moderation, image transform, and video transcode services.
- Completed worker jobs can publish result metadata back into Prisma
  `MediaAsset` records, including moderation decisions, transform status,
  CDN URLs, thumbnails, variants, and fail-closed blocked/failed states.
- Production still needs live provider credentials, vendor-specific endpoint
  mapping, unsafe-media escalation workflow, and CDN publication verification.

## Storage Modes

Development fallback:

```text
MEDIA_STORAGE_DRIVER=development
MEDIA_DEVELOPMENT_BASE_URL=https://media.local.sellfindconnect.test
```

S3-compatible mode:

```text
MEDIA_STORAGE_DRIVER=s3
MEDIA_S3_ENDPOINT=https://sfo3.digitaloceanspaces.com
MEDIA_S3_REGION=sfo3
MEDIA_S3_BUCKET=sellfindconnect-media
MEDIA_S3_ACCESS_KEY_ID=...
MEDIA_S3_SECRET_ACCESS_KEY=...
MEDIA_S3_PUBLIC_BASE_URL=https://cdn.sellfindconnect.com
MEDIA_S3_PROVIDER_NAME=digitalocean-spaces
MEDIA_S3_FORCE_PATH_STYLE=false
MEDIA_UPLOAD_URL_TTL_SECONDS=900
```

`MEDIA_S3_FORCE_PATH_STYLE=true` is useful for MinIO and some private
S3-compatible services. Access keys and secrets must be stored only in platform
secret management, never in source control.

## Processing Queue Modes

Development fallback:

```text
MEDIA_JOB_QUEUE_DRIVER=memory
```

Durable Prisma/PostgreSQL outbox:

```text
MEDIA_JOB_QUEUE_DRIVER=prisma
DATABASE_URL=postgresql://...
```

`MEDIA_PROCESSING_QUEUE_DRIVER` is accepted as a compatibility alias for
`MEDIA_JOB_QUEUE_DRIVER`. The durable adapter stores each scan/transform job in
the `MediaProcessingJob` table with status, attempts, retry availability,
worker lock metadata, completion/failure timestamps, and result metadata.

## Processor Provider Modes

Development processors pass jobs locally:

```text
MEDIA_MALWARE_SCAN_ENDPOINT=
MEDIA_CONTENT_MODERATION_ENDPOINT=
MEDIA_IMAGE_TRANSFORM_ENDPOINT=
MEDIA_VIDEO_TRANSCODE_ENDPOINT=
```

Generic HTTP provider-backed processors:

```text
MEDIA_MALWARE_SCAN_ENDPOINT=https://scanner.example.com/jobs
MEDIA_CONTENT_MODERATION_ENDPOINT=https://moderation.example.com/jobs
MEDIA_IMAGE_TRANSFORM_ENDPOINT=https://images.example.com/jobs
MEDIA_VIDEO_TRANSCODE_ENDPOINT=https://video.example.com/jobs
MEDIA_PROCESSOR_API_KEY=...
MEDIA_PROCESSOR_TIMEOUT_MS=30000
```

Each job type can override shared credentials and provider labels:

```text
MEDIA_MALWARE_SCAN_API_KEY=...
MEDIA_MALWARE_SCAN_PROVIDER_NAME=...
MEDIA_CONTENT_MODERATION_API_KEY=...
MEDIA_CONTENT_MODERATION_PROVIDER_NAME=...
MEDIA_IMAGE_TRANSFORM_API_KEY=...
MEDIA_IMAGE_TRANSFORM_PROVIDER_NAME=...
MEDIA_VIDEO_TRANSCODE_API_KEY=...
MEDIA_VIDEO_TRANSCODE_PROVIDER_NAME=...
```

Provider responses should return JSON:

```json
{
  "ok": true,
  "result": {
    "verdict": "passed",
    "transformStatus": "READY",
    "cdnUrl": "https://cdn.sellfindconnect.com/path/display.jpg",
    "thumbnailUrl": "https://cdn.sellfindconnect.com/path/thumb.jpg",
    "variants": [
      { "label": "display", "url": "https://cdn.sellfindconnect.com/path/display.jpg", "width": 1200 }
    ]
  }
}
```

For blocked or unsafe media, providers can return `ok: false`,
`retryable: false`, and a short `reason`; the worker will mark scan/moderation
jobs as final failures and the publisher will block the media asset.

## Result Publication

Development mode uses a no-op publisher. Prisma publication is enabled with:

```text
MEDIA_ASSET_RESULT_PUBLISHER_DRIVER=prisma
DATABASE_URL=postgresql://...
```

When `MEDIA_JOB_QUEUE_DRIVER=prisma` and `DATABASE_URL` is set, Prisma
publication is selected automatically unless a different publication driver is
explicitly configured. Publication behavior:

- Clean malware scan: records `MALWARE_SCAN_PASSED` as the interim moderation reason.
- Passed content moderation: sets moderation status to `PASSED`.
- Blocked scan/moderation: sets media status and moderation status to `BLOCKED`.
- Image/video transform success: writes transform status, CDN URL, thumbnail URL, and variants.
- Final transform failure: sets transform status to `FAILED`.

## Upload Contract

The API returns:

- `uploadUrl`: short-lived presigned PUT URL.
- `requiredHeaders`: currently includes the signed `content-type`.
- `objectKey`: durable storage key to persist with the media asset.
- `publicUrl`: CDN/public URL for later display.
- `expiresAt`: upload URL expiry time.

Clients must upload the exact file type and `content-type` used during upload
preparation, then call the media attach endpoint with the returned storage
metadata and extracted image/video metadata.

## Worker Contract

Media attach queues:

- `MALWARE_SCAN`
- `CONTENT_MODERATION`
- `IMAGE_TRANSFORM`
- `VIDEO_TRANSCODE`

Workers should:

1. Claim available queued jobs with a stable `workerId` and optional job-type
   filter.
2. Process the referenced media from `objectKey` or `sourceUrl`.
3. Mark successful work as `SUCCEEDED` with result metadata.
4. Mark failed work as retryable to return it to `QUEUED` after backoff, or
   final to move it to `FAILED`.

Job states are `QUEUED`, `RUNNING`, `SUCCEEDED`, and `FAILED`. The next
hardening step is to connect approved live vendors, verify each provider's
response schema, publish CDN assets, and add unsafe-media escalation cases for
human review.

Internal batch runner:

```text
POST /v1/operations/media/processing/run
x-internal-job-key: ...
```

Request controls:

- `workerId`: stable worker identity for locks.
- `limit`: maximum jobs to claim in this batch.
- `jobTypes`: optional subset of media job types.
- `retryAfterSeconds`: retry backoff for transient provider failures.
- `now`: optional scheduler timestamp for deterministic runs/tests.
