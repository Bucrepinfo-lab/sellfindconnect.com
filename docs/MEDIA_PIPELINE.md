# Media Pipeline

Status: provider-ready foundation
Last updated: 2026-06-19

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
- Production still needs provider-backed malware scanning, content moderation,
  image/video execution workers, and CDN publication.

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
hardening step is to add executable worker entrypoints plus provider adapters
for malware scanning, image resizing, CDN cache publication, video transcoding,
and unsafe-media escalation.
