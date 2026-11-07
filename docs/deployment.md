# Production deployment

This guide describes a production setup without selecting a hosting provider. The client is a
static build served over HTTPS from the same origin as the API, for example
`https://app.example.com`: `/api` and `/api/*` go to the API, and every other path serves this
client. Same-origin serving keeps the session cookies first-party and avoids cross-site cookie
dependencies.

The [API deployment guide](https://github.com/Arthu085/spend-track-api/blob/main/docs/deployment.md)
is the primary runbook for backend secrets, trusted proxies, the database, migrations, mail, health
checks, backups, and API updates.

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
switch is atomic. The web server needs read access only. The production client needs no Node.js
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

### Example: Caddy

This is one example of the rules above, not a requirement. It assumes Caddy runs on the host, serves
the release directory, and reaches an API published only on `127.0.0.1:3000`. Caddy obtains and
renews certificates and redirects HTTP to HTTPS automatically; persist its certificate storage.

```caddyfile
app.example.com {
    root * /srv/app/current
    encode zstd gzip

    @health path /api/health /api/health/*
    handle @health {
        respond 404
    }

    @api path /api /api/*
    handle @api {
        reverse_proxy 127.0.0.1:3000
    }

    handle /assets/* {
        header Cache-Control "public, max-age=31536000, immutable"
        file_server
    }

    @static path_regexp static \.[^/]+$
    handle @static {
        header Cache-Control "no-cache"
        file_server
    }

    handle {
        header Cache-Control "no-cache"
        try_files {path} /index.html
        file_server
    }
}
```

`handle` keeps the `/api` prefix; `handle_path` would strip it. If Caddy runs in a container, mount
the release read-only and use the API's address on the private network instead of `127.0.0.1`.
Validate the configuration with `caddy validate` before reloading the service.

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
then switch `current` atomically. Do not delete old assets while clients may still reference them.
The update prompt lets users reload into the new release; until then, an open tab keeps its version.

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
