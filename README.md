# Spend Track Client

The web client for **Spend Track**, a personal financial organization system, built with React 19,
TypeScript, and Vite.

The application foundation (providers, routing, HTTP client, localization, and tests) and
authentication (sign-in, sign-out, password recovery, and route guards) are in place, along with
users management, a self-service account page, and admin change requests.
See [`docs/PROJECT.md`](docs/PROJECT.md) for scope, architecture, and source layout.

## Related repository

The related API project is [spend-track-api](https://github.com/Arthu085/spend-track-api).
The repositories have separate setup, configuration, and validation. The HTTP client follows the
API contract (cookie sessions, session refresh, session-bound CSRF tokens, `Accept-Language`).
The default tests stub HTTP, so this client builds and validates without the API running.
The optional [API integration tests](#api-integration-tests) check real requests and response schemas
against a disposable backend. Sign in with an API
user, such as the seeded admin from the API's `SEED_ADMIN_*` settings.

## Prerequisites

- Node.js 24, pinned in [`.nvmrc`](.nvmrc), and npm. The supported range is `^24.11.0`.

## Quick start

```sh
nvm use
npm ci
cp .env.example .env
npm run dev
```

Vite serves the app at `http://localhost:5173` by default and uses another port if it is occupied.
The API must allow that origin in its `CORS_ORIGINS`.

## Environment

Variables are documented in [`.env.example`](.env.example) and validated with Zod at startup in
[`src/core/config/env.config.ts`](src/core/config/env.config.ts); the app fails fast on an invalid
value. `VITE_*` values are embedded in the browser bundle, so they must never hold secrets.

| Variable        | Required | Purpose                                          |
| --------------- | -------- | ------------------------------------------------ |
| `VITE_API_URL`  | Yes      | API base URL without the `/api` prefix           |
| `VITE_APP_NAME` | Yes      | Application name for the browser tab and layouts |
| `VITE_APP_MARK` | Yes      | Short mark shown in the collapsed sidebar        |

## Commands

| Command                                   | Purpose                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                             | Start the Vite development server                                       |
| `npm run build`                           | Type-check and build production assets into `dist/`                     |
| `npm run preview`                         | Preview the production build locally, including its service worker      |
| `npm test` / `npm run test:watch`         | Run the Vitest suite once / in watch mode                               |
| `npm run test:integration`                | Check real API contracts against a backend checkout (needs Docker)      |
| `npm run format` / `npm run format:check` | Format the repository / check formatting without writing                |
| `npm run lint` / `npm run lint:check`     | Lint with autofix / check without fixing, failing on any warning        |
| `npm run typecheck`                       | Type-check the application and Vite configuration without emitting code |

## Progressive web app

The production build is installable and caches its application shell; details are in
[`docs/PROJECT.md`](docs/PROJECT.md#progressive-web-app). `npm run dev` also registers a
development service worker for trying installation and updates; offline loading needs a build
(`npm run build && npm run preview`). Browsers install the app
only from `localhost` or HTTPS. The icons are generated from
[`public/favicon.svg`](public/favicon.svg); replace that file to change them.

## Editor

Install the recommended ESLint and Prettier VS Code extensions when prompted. The shared
[settings](.vscode/settings.json) select the local TypeScript SDK, enable ESLint flat configuration,
format on save, and apply ESLint fixes on explicit saves.

## Validation and CI

```sh
npm run format:check && npm run lint:check && npm run typecheck && npm test && npm run build
```

GitHub Actions runs this gate on pull requests targeting `main` and pushes to `main`, after a clean
`npm ci` using the Node version from `.nvmrc`.

## API integration tests

With Docker running and both repositories checked out, install each repository's dependencies and
run this optional suite from the frontend:

```sh
npm ci
npm --prefix ../spend-track-api ci
SPEND_TRACK_API_PATH=../spend-track-api npm run test:integration
```

`SPEND_TRACK_API_PATH` is a test-only path to the API checkout; it defaults to
`../spend-track-api`. That checkout must include `test/frontend/server.ts`. The suite starts an
ephemeral PostgreSQL Testcontainer, applies the backend's migrations and seeds, and listens on an
available localhost port. It closes the API and container after the run, using no developer database
or running API. Both repositories keep their existing validation gates.

These tests call the frontend's API functions and Zod parsers through real Axios XHR requests in
jsdom, including credentialed cookies and CORS. They cover login, automatic refresh and rotation,
CSRF rejection and recovery, user management, roles and permissions, profile updates, session
revocation, logout, and API errors. They supplement the mocked unit and component tests; full browser
behavior, cross-tab synchronization, and email delivery remain outside this suite.

## Project rules

- [`AGENTS.md`](AGENTS.md): short agent entry point and required gate.
- [`CLAUDE.md`](CLAUDE.md): imports the same agent rules.
- [`docs/conventions.md`](docs/conventions.md): engineering rules.
- [`docs/PROJECT.md`](docs/PROJECT.md): purpose, current scope, stack, and source layout.
