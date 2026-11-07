# Spend Track Client

The web client for **Spend Track**, a private personal finance application, built with React 19,
TypeScript, and Vite. It covers the complete MVP, with the monthly dashboard as its main page.
See [`docs/PROJECT.md`](docs/PROJECT.md) for scope, architecture, and source layout.

## Features

| Page                                                            | What it does                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Dashboard (`/`)                                                 | Income, expenses, balances, invoices, budgets, investments, and daily spending guidance for a selected month |
| Transactions (`/transactions`)                                  | Planned and completed income and expenses, and transfers between the user's accounts                         |
| Recurrences (`/recurrences`)                                    | Recurring income, expenses, and card charges, with each occurrence confirmed, edited, or canceled            |
| Credit cards (`/credit-cards`, `/credit-card-purchases`)        | Cards, invoices, installment purchases, refunds, and partial invoice payments                                |
| Budgets (`/budgets`)                                            | Overall and category limits per month, optionally copied from the previous month                             |
| Investments (`/investments`)                                    | Investments, reserves, and goals with contributions, withdrawals, and manual valuations                      |
| Accounts (`/accounts`)                                          | Accounts with opening balances, a default account, and deactivation                                          |
| Financial settings (`/settings`)                                | Spending perspective, the dashboard's default month, and personal categories                                 |
| My account (`/account`)                                         | Profile and password changes                                                                                 |
| Administration (`/users`, `/roles`, `/account/change-requests`) | User and permission management, and approval of changes requested by another administrator                   |

Forms preselect the default account or card, and the user can choose another. Pages and actions
follow the user's abilities, and administrators see only their own finances. The interface is
available in `pt-BR` and `en`, in light and dark themes, and installs as a
[progressive web app](#progressive-web-app).

The API defines the financial rules, including how opening balances, invoices, and the dashboard
figures work. They are summarized in the
[API README](https://github.com/Arthu085/spend-track-api#financial-features).

## Related repository

The related API project is [spend-track-api](https://github.com/Arthu085/spend-track-api).
The repositories have separate setup, configuration, and validation. The HTTP client follows the
API contract (cookie sessions, session refresh, session-bound CSRF tokens, `Accept-Language`).
The default tests stub HTTP, so this client builds and validates without the API running.
The [API integration tests](#api-integration-tests), which run in CI, check real requests and response
schemas against a disposable backend. Sign in with an API
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
Start the API first by following its
[quick start](https://github.com/Arthu085/spend-track-api#quick-start). It must allow the client's
origin in its `CORS_ORIGINS`, and `VITE_API_URL` must point to it.

## Environment

Variables are documented in [`.env.example`](.env.example) and validated with Zod at build time and
startup through the shared schema in
[`src/core/config/env.schema.ts`](src/core/config/env.schema.ts); an invalid value stops the build
or the application. `VITE_*` values are embedded in the browser bundle, so they must never hold
secrets.

| Variable        | Required | Purpose                                          |
| --------------- | -------- | ------------------------------------------------ |
| `VITE_API_URL`  | Yes      | API origin without a path                        |
| `VITE_APP_NAME` | Yes      | Application name for the browser tab and layouts |
| `VITE_APP_MARK` | Yes      | Short mark shown in the collapsed sidebar        |

`VITE_API_URL` must be an origin without any path, including `/api`, and without credentials, a
query, or a fragment; the HTTP client appends `/api` itself. Trailing slashes are accepted and
normalized away. Public origins require HTTPS; HTTP is allowed only for `localhost`, `127.0.0.1`,
and `[::1]`, with optional ports, for local development and testing. Vite reads these values when it
starts or builds; restart the development server or rebuild after changing them.

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
`npm ci` using the Node version from `.nvmrc`. A separate job runs the
[API integration tests](#api-integration-tests).

## API integration tests

GitHub Actions runs this suite in its own job, here and in the API repository, so a contract
incompatibility fails CI on either side. The job uses the API branch with the same name as the client
branch when one exists, and `main` otherwise, so a coordinated contract change uses one branch name in
both repositories.

### CI credentials

The job reads the API repository with its `github.token`, which is enough while that repository is
public. If it becomes private, create a fine-grained personal access token or a GitHub App
installation token limited to both repositories with read-only Contents access (read-only Metadata is
implied), store it in each one as the `CROSS_REPO_TOKEN` Actions secret, and rotate it before it
expires:

```sh
gh secret set CROSS_REPO_TOKEN --repo <owner>/<repo>
```

Missing or insufficient credentials fail the job with an explicit error rather than skip it, so a
contract break cannot pass silently. The token is only available to the steps that read the other
repository, never to dependency installation or test code.

### Running locally

With Docker running and both repositories checked out, install each repository's dependencies and run
the suite from the frontend:

```sh
npm ci
npm --prefix ../spend-track-api ci
SPEND_TRACK_API_PATH=../spend-track-api npm run test:integration
```

`SPEND_TRACK_API_PATH` is a test-only path to the API checkout; it defaults to
`../spend-track-api`. That checkout must include `test/frontend/server.ts`. The suite starts an
ephemeral PostgreSQL Testcontainer, applies the backend's migrations and seeds, and listens on an
available localhost port. It closes the API and container after the run, using no developer database
or running API. Both repositories keep their existing validation gates. The access-token lifetime
comes from the backend fixture (5 seconds by default); on a slow machine, raise it by setting
`FRONTEND_FIXTURE_ACCESS_TOKEN_TTL_SECONDS` for this command, which the fixture inherits.

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
