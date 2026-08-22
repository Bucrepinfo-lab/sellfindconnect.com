# Railway — archived (do not deploy)

Status: **Archived.** Fly.io is the live production host.
Date archived: 2026-08-21
Do not use this file to deploy, reconnect GitHub, or add DNS.

Live runbook: `docs/FLY_DEPLOYMENT.md`  
Candidate host (if leaving Fly): `docs/DIGITALOCEAN_DEPLOYMENT.md`

Railway CLI scripts and the `@railway/cli` package were removed from this
repository on 2026-06-18. Do not add them back.

## Why this file exists

Railway hosted early 2026 staging. Those apps are gone. The URLs below return
**HTTP 404 Application not found** (probed 2026-08-21 and 2026-08-22).
`adverts.telpen.net` and `api.adverts.telpen.net` do not resolve.

Keep the IDs only for account archaeology (billing, old dashboards). They are
not production.

## Dead surfaces

| What | Value | Status |
| --- | --- | --- |
| Temporary web | `https://web-production-32b7d.up.railway.app` | 404 |
| Temporary API | `https://api-production-ae5f.up.railway.app` | 404 |
| Temporary docs | `https://api-production-ae5f.up.railway.app/docs` | 404 |
| Custom web | `https://adverts.telpen.net` | DNS missing |
| Custom API | `https://api.adverts.telpen.net` | DNS missing |

## Historical project IDs

First Railway project (2026-06-15):

- Name: `telpen-adverts`
- ID: `84794ef4-c31c-41cd-8048-089f59040f1f`

Later GitHub-connected project visible to `bucrepinfo@gmail.com`:

- Name: `resplendent-fulfillment`
- ID: `42716fff-95b0-4755-b0b2-59faf081eb86`
- Environment: `production` (`bc3f4b4e-0101-4f70-b346-3df2b8e5405b`)
- API service `@telpen/api`: `99fb3c7e-487c-4a77-ba08-369a83ac7e0d`
- Web service `@telpen/web`: `9b5a1466-f105-44e1-a16e-0b5c45f04ace`

Old GoDaddy records Railway generated for `telpen.net` (no longer in use):

| Type | Name | Historical value |
| --- | --- | --- |
| CNAME | `adverts` | `iuqqjuwo.up.railway.app` |
| TXT | `_railway-verify.adverts` | `railway-verify=31d6e8c7c1206a194fb272ecc9699572b9d49353af88ecc4fa5ebb249dcfd5eb` |
| CNAME | `api.adverts` | `gguqa2z8.up.railway.app` |
| TXT | `_railway-verify.api.adverts` | `railway-verify=b15f6d0009ed7c462c4461d22bdb2d6eabea807ee96397a7b676b0cb0bf9a320` |

Remove those records from GoDaddy if they are still present. Live DNS for
`sellfindconnect.com` / `www` / `api` points at Fly.

## What failed (do not retry)

- Railway GitHub App could not read `Bucrepinfo-lab/sellfindconnect.com`
  (`User does not have access to the repo`).
- Trial-plan custom-domain limit blocked adding `sellfindconnect.com` while
  `adverts.telpen.net` occupied the slot.
- Serverless sleep had no cron; jobs now run on GitHub Actions against Fly.

## If someone asks “redeploy Railway”

Do not. Deploy Fly:

```
cd C:\Users\user\Desktop\Adverts\Telpen Adverts
git fetch origin
git reset --hard origin/main
fly deploy --config fly.web.toml --remote-only
fly deploy --config fly.api.toml --remote-only
```
