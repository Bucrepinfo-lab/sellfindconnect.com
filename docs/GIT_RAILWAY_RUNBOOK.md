# Git And Railway Deployment Runbook

Date: 2026-06-16
Repository: `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git`
Railway project: `84794ef4-c31c-41cd-8048-089f59040f1f`

Status: Archived. Fly.io is the live production host (`docs/FLY_DEPLOYMENT.md`).
Do not use this runbook to deploy.

On 2026-06-18, the root Railway deployment scripts and local `@railway/cli`
dev dependency were removed to keep normal installs focused on coding and to
avoid deploy-only transitive vulnerabilities. If Railway deployment resumes,
install or run the Railway CLI as a transient/separate deployment tool after a
fresh security review.

## Current Root Causes

Two separate issues made push/deployment difficult:

1. GitHub network/auth from this desktop environment is not always available to
   sandboxed commands. Approved `git push` works, but non-approved GitHub
   network checks can fail quickly with `Could not connect to server`.
2. Railway's GitHub source connection still returns
   `User does not have access to the repo`. This means Railway's connected
   GitHub identity/app installation does not have access to
   `Bucrepinfo-lab/sellfindconnect.com`, even though the local Git remote can
   push to that repository.

## Stable Operating Mode

Deployment is currently paused while product coding continues. If Railway is
temporarily reselected later and GitHub source access is still not fixed,
deploy directly from the local workspace using a transient Railway CLI. This
bypasses the GitHub App source connection while still deploying the exact
checked-out code.

Use this order:

1. Validate:

   ```powershell
   npm.cmd run test
   npm.cmd run typecheck
   npm.cmd run lint
   npm.cmd run build
   ```

2. Commit locally:

   ```powershell
   git status --short
   git add .
   git commit -m "Describe change"
   ```

3. Push to GitHub:

   ```powershell
   git push
   ```

4. Deploy to Railway from the local workspace only after deployment resumes:

   ```powershell
   npx.cmd @railway/cli deployment up --service web --environment production --detach --yes --message "Deploy web from local workspace"
   npx.cmd @railway/cli deployment up --service api --environment production --detach --yes --message "Deploy API from local workspace"
   ```

5. Check Railway service state:

   ```powershell
   npx.cmd @railway/cli service list --json
   ```

`SLEEPING` is a successful state because Serverless/App Sleeping is enabled.

## Railway Build Commands

If Railway is building from GitHub/Nixpacks instead of the checked-in
Dockerfiles, set the web service build command to:

```powershell
npm.cmd run build -w @telpen/domain && npm.cmd run build -w @telpen/web
```

The equivalent repository script is:

```powershell
npm.cmd run build:web
```

Do not set the web service to build only `@telpen/web`. The web app imports
compiled exports from `@telpen/domain`, and Next.js cannot resolve those imports
until the domain package has produced its `dist` output.

Set the web service watch patterns to include:

```text
/packages/domain/**
```

This ensures shared domain changes trigger web rebuilds.

As an additional guard, the `@telpen/web` workspace build script also builds
`@telpen/domain` first. This means Railway's auto-detected command
`npm run build --workspace=@telpen/web` is safe too.

For the API service, use:

```powershell
npm.cmd run build:api
```

The `@telpen/api` workspace build script builds `@telpen/domain` and generates
the database client before compiling the API, so Railway's auto-detected API
workspace build remains safe as well.

## Service-Specific Deploys

Deploy only web:

```powershell
npx.cmd @railway/cli deployment up --service web --environment production --detach --yes --message "Deploy web from local workspace"
```

Deploy only API:

```powershell
npx.cmd @railway/cli deployment up --service api --environment production --detach --yes --message "Deploy API from local workspace"
```

## When To Re-enable GitHub Autodeploys

Only switch Railway services to GitHub source after this command succeeds:

```powershell
npx.cmd railway service source connect --repo Bucrepinfo-lab/sellfindconnect.com --branch main --service web --environment production --project 84794ef4-c31c-41cd-8048-089f59040f1f --json
```

If it returns `User does not have access to the repo`, fix GitHub/Railway
authorization first:

1. Open `https://github.com/organizations/Bucrepinfo-lab/settings/installations`.
2. Confirm `Railway App` is installed for `Bucrepinfo-lab`.
3. Configure repository access to include `sellfindconnect.com`.
4. In Railway, reconnect GitHub from the source selector so Railway refreshes
   the GitHub installation.
5. Retry the source connection command above.

## Why This Fixes Day-To-Day Deployment

The local CLI deployment path does not depend on Railway's GitHub App being able
to read the repository. It uses the authenticated Railway CLI and uploads the
current workspace directly, which has already produced successful web and API
deployments.
