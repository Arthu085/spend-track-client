# Production deployment

This guide describes a production setup without selecting a hosting provider. The client is a
static build served over HTTPS from the same origin as the API, for example
`https://app.example.com`: `/api` and `/api/*` go to the API, and every other path serves this
client. Same-origin serving keeps the session cookies first-party and avoids cross-site cookie
dependencies.

This repository ships a ready setup for one server running the API's production Compose stack: the
Caddy rules in [`deploy/frontend.caddy`](../deploy/frontend.caddy), the release script
[`deploy/release.sh`](../deploy/release.sh), and the **Deploy** workflow
([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)). The
[API deployment guide](https://github.com/Arthu085/spend-track-api/blob/main/docs/deployment.md)
is the primary runbook for preparing the server, the Compose stack and its Caddy site, backend
secrets, the database, migrations, mail, health checks, backups, and API updates. Deploy the API
first: the frontend release joins its stack.

## Build a release

Use a clean checkout of the chosen revision, the Node.js version pinned in [`.nvmrc`](../.nvmrc), and
the committed lockfile:

```sh
npm ci
VITE_API_URL=https://app.example.com \
VITE_APP_NAME='Spend Track' \
VITE_APP_MARK=ST \
npm run build
```

All three variables are required; [`.env.example`](../.env.example) and the
[README](../README.md#environment) describe them. The build and browser startup validate them with
the same schema, so missing or invalid configuration fails before publication. `VITE_API_URL` must
be an HTTPS origin without any path, including `/api`, credentials, a query, or a fragment; the HTTP
client appends `/api` itself. HTTP is accepted only on `localhost`, `127.0.0.1`, or `[::1]` for
local development and testing. The application expects to be served at `/`: its routes, service
worker scope, manifest `start_url`, and asset paths are root-relative.

Vite replaces `VITE_*` values at build time. They are public browser configuration, never secrets:
do not put database credentials, signing keys, SMTP credentials, or passwords in them. Changing the
host's runtime environment does not change an existing `dist/`; rebuild for a different API origin
or branding. The CI build uses the example origin `https://app.example.com` only to check
compilation, so produce release artifacts separately with the real public origin. Keep local `.env*`
files out of release artifacts.

## Static hosting

Publish the complete `dist/` directory, including `index.html`, `assets/`, the generated icons,
`manifest.webmanifest`, `sw.js`, and the `workbox-*.js` file. Store each build as a versioned release
directory, such as `releases/<revision>/`, and point a `current` link at the served release so a
switch is atomic. The [single-server deployment](#single-server-deployment) does exactly this. The web server needs read access only. The production client needs no Node.js
process, source files, dependencies, or `.env` file. `npm run preview` is for local inspection, not
production serving.

## Routing and caching rules

Whatever server, CDN, or platform serves the client, it must apply these rules:

- **HTTPS:** serve the site only over HTTPS and redirect HTTP to HTTPS. Browsers register service
  workers and install the app only from secure origins.
- **API:** forward `/api` and `/api/*` to the API unchanged; do not strip the `/api` prefix. API
  responses, including errors, keep their own status and body.
- **SPA fallback:** a request for any other path without a matching file returns `index.html` with
  status 200, so client routes such as `/transactions`, `/account`, `/login`, and `/reset-password`
  load on direct navigation and refresh, including before the service worker is installed.
- **Real 404s:** the fallback never applies to `/api` paths or to requests for missing static files
  (paths with a file extension, such as `/assets/missing.js`); those return 404 instead of HTML.
- **Immutable assets:** files under `/assets/` have content hashes in their names and can be served
  with `Cache-Control: public, max-age=31536000, immutable`.
- **Revalidated files:** `index.html` and SPA fallback responses, `manifest.webmanifest`, `sw.js`,
  the Workbox script, icons, and other unversioned public files use `Cache-Control: no-cache`, so
  releases and icon changes are detected.
- **No API caching:** never cache `/api` in a proxy or CDN, especially authentication, CSRF, and
  personalized responses.
- **Private health checks:** the API's `/api/health/live` and `/api/health/ready` probes are for the
  host or orchestrator. Call them on the API upstream directly and return 404 for them publicly.

Configure the API for the public origin as its guide describes, including `CORS_ORIGINS`,
`APP_WEB_URL` for email links, secure cookies, and the trusted proxy settings. Keep the database and
the API port private. If a load balancer or CDN sits in front of the server, review the whole proxy
chain so forwarding headers and caching still follow these rules.

### Caddy

[`deploy/frontend.caddy`](../deploy/frontend.caddy) implements these rules for Caddy. The API stack's
Caddyfile owns the site address, HTTPS, the `/api` proxy, and the private health checks, and imports
this snippet for every other path:

```caddyfile
app.example.com {
    @health path /api/health /api/health/*
    handle @health {
        respond 404
    }

    @api path /api /api/*
    handle @api {
        reverse_proxy api:3000
    }

    handle {
        import /srv/frontend/current/*.caddy
        respond "Frontend not deployed" 503
    }
}
```

The snippet serves `/srv/frontend/current/dist`: existing files under `/assets/` are immutable, every
other file and the `index.html` fallback is revalidated, and a missing file with an extension returns
404 without caching. Each release carries its own copy of the snippet, so a release and its serving
rules switch and roll back together. `handle` keeps the `/api` prefix; `handle_path` would strip it.
Another server or CDN must apply the same rules itself.

## Single-server deployment

Prepare the server and deploy the API first, as the
[API deployment guide](https://github.com/Arthu085/spend-track-api/blob/main/docs/deployment.md)
describes; this repository adds its releases to that stack.

### GitHub configuration

Create a `production` environment in this repository (Settings → Environments), set **Deployment
branches** to the default branch only, and optionally add required reviewers. The SSH values,
`DEPLOY_PATH`, and `APP_DOMAIN` are the same as in the API repository.

| Name                   | Kind     | Value                                                                         |
| ---------------------- | -------- | ----------------------------------------------------------------------------- |
| `SSH_HOST`, `SSH_USER` | Variable | Server address and deploy user                                                |
| `SSH_PORT`             | Variable | Optional; default `22`                                                        |
| `DEPLOY_PATH`          | Variable | The API stack's directory, such as `/srv/spend-track`                         |
| `APP_DOMAIN`           | Variable | Public hostname without scheme; the build uses `https://$APP_DOMAIN`          |
| `VITE_APP_NAME`        | Variable | Optional; default `Spend Track` ([environment](../README.md#environment))     |
| `VITE_APP_MARK`        | Variable | Optional; default `ST`, the short mark for the collapsed sidebar and manifest |
| `SSH_PRIVATE_KEY`      | Secret   | The deploy user's private key                                                 |
| `SSH_KNOWN_HOSTS`      | Secret   | The server's verified `ssh-keyscan` line; host keys are always checked        |

### Deploy

Run **Deploy** from the Actions tab (`workflow_dispatch`) on the default branch, for the first
release and every update. The workflow:

1. stops unless it runs on the default branch and the CI workflow succeeded for the exact commit;
2. installs dependencies and builds with `VITE_API_URL=https://$APP_DOMAIN`, packages `dist/` with
   `frontend.caddy`, and keeps the package as a workflow artifact for 30 days;
3. over SSH with a pinned host key, installs `release.sh` in `DEPLOY_PATH/frontend/` and runs
   `release.sh activate`;
4. requests `/`, `/login`, `/sw.js`, and `/manifest.webmanifest` over HTTPS and, if any fails, rolls
   back to the previous release.

`release.sh activate` extracts the package into `frontend/releases/<UTC time>-<commit>/`, copies the
previous release's own hashed assets that the new build lacks (so open tabs and lazy-loaded routes
keep working for one more release), switches the `current` link atomically, and reloads Caddy. If
Caddy rejects the new snippet, the previous release stays active. It keeps the five newest releases
plus `current` and `previous` (`KEEP_RELEASES` changes the count).

### Automatic deployment

Manual deployment is the default. To also deploy every push to the default branch once CI passes,
uncomment the `workflow_run` trigger in the workflow (adjust `branches` if the default branch is not
`main`). Manual runs keep working. Before enabling it:

- **Branch restrictions.** Keep the `production` environment limited to the default branch. The
  workflow also deploys only CI runs that succeeded for a `push` to the default branch of this
  repository, never pull requests or forks.
- **Approval.** Required reviewers on the environment make each automatic run wait for approval;
  remove them only when every merge may go live.
- **Concurrency.** Deployments run one at a time per repository. A waiting deployment replaces an
  older waiting one, so a burst of merges deploys the newest commit; the running one is never
  cancelled.
- **Rollback.** A failed public check rolls back to the previous release, but after a manual
  rollback the next merge deploys again: revert the faulty commit first.
- **API first.** The API repository deploys independently, so a frontend change that needs new API
  behavior must merge after that API change is in production.

### Rollback

On the server, switch back to the previous release; running it again rolls forward:

```sh
/srv/spend-track/frontend/release.sh rollback
```

To deploy an older commit instead, re-run its earlier successful **Deploy** run, which rebuilds it
with the environment's current variables. A rolled-back release keeps the variables it was built
with. API rollback and database restore follow the API guide.

## Release checks

Run the repository gate with the release's public variables available for the build:

```sh
export VITE_API_URL=https://app.example.com
export VITE_APP_NAME='Spend Track'
export VITE_APP_MARK=ST
npm run format:check && npm run lint:check && npm run typecheck && npm test && npm run build
```

After hosting is configured, check the deployment in a fresh browser profile:

1. **Routing:** open `/login` and refresh it; after signing in, refresh `/transactions`, `/account`,
   and, as an administrator, `/users`.
   Each returns the application rather than a 404. An unknown `/api` path returns an API error, and
   `/assets/missing.js` returns 404.
2. **Session:** sign in, create or change a permitted record, and sign out. Requests target
   `https://app.example.com/api`, cookies are `Secure` and `HttpOnly`, and unsafe requests carry
   `X-CSRF-Token`. Follow an emailed password reset or email confirmation link to check the API's
   public client URL and mail settings.
3. **Manifest and icons:** `manifest.webmanifest` has the build's name and short name, and every
   icon URL returns an image: the 64px, 192px, and 512px PWA icons, the maskable icon, the Apple
   touch icon, and the favicon. The build generates them from `public/favicon.svg`.
4. **Service worker:** `sw.js` registers with scope `/`, and the app installs on a supported
   browser. After one online visit, the application shell loads offline and shows the offline
   banner; every page needs the API, so it shows the route error page below the banner. The worker
   does not answer `/api` navigations or cache API responses.
5. **Updates:** publish a second build; an open tab shows the update notification, and its Reload
   button loads the new release. Confirm the cache headers on `index.html`, `sw.js`, and a file
   under `/assets/`.

The [PWA documentation](PROJECT.md#progressive-web-app) describes the manifest, icons, caching, and
update prompt in detail.

## Updates and rollback

Build and check each revision before publishing it. Upload a complete release directory, copy the
previous release's hashed `/assets/` files into it so open tabs and lazy-loaded routes keep working,
then switch `current` atomically; `release.sh` does all three. Do not delete old assets while clients
may still reference them. The update prompt lets users reload into the new release; until then, an
open tab keeps its version.

Coordinate the client revision with the API release and its migrations. To roll back the client,
point `current` at the previous complete release; it keeps the public variables it was built with.
API rollback and database restore follow the API guide. The client holds no server data to back
up; keep release artifacts and server configuration.

## References

- [Vite static deployment](https://vite.dev/guide/static-deploy) and
  [environment variables](https://vite.dev/guide/env-and-mode)
- [Vite PWA deployment](https://vite-pwa-org.netlify.app/deployment/)
- [Caddy common patterns](https://caddyserver.com/docs/caddyfile/patterns) and
  [automatic HTTPS](https://caddyserver.com/docs/automatic-https)
