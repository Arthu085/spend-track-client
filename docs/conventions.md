# Engineering conventions

Rules for every change to this repository. Project scope and layout are in
[`PROJECT.md`](PROJECT.md); setup, editor configuration, and commands are in
[`README.md`](../README.md).

## Scope and structure

- Inspect similar implementations before editing. Follow existing patterns and reuse utilities.
- Keep changes focused. Prefer the simplest maintainable solution without speculative layers,
  empty directories, or unrelated cleanup.
- Keep `src/main.tsx` focused on bootstrap and `src/App.tsx` on application composition.
- Follow the architecture and stack in [`PROJECT.md`](PROJECT.md#architecture). Do not add
  libraries that overlap with the chosen ones (another UI kit, HTTP client, or state manager).
- Use npm only. Commit `package-lock.json` with dependency changes and use `npm ci` for clean installs.

## TypeScript and React

- Keep strict checking enabled in both application and tooling TypeScript configurations.
- Do not use explicit `any`, suppress type errors, or cast untrusted input to make it compile.
  Narrow `unknown` values and model inputs and outputs explicitly.
- Use function components and follow the Rules of Hooks. Keep rendering pure and state updates
  immutable. Use effects to synchronize with external systems, not to calculate derived values.
- Keep state near its consumers. Extract reusable logic or components when there is a concrete need.
- Use semantic HTML, associated form labels, accessible names, and keyboard-operable controls.
  Navigate with links, not buttons.
- Build UI with Ant Design components and theme tokens before writing custom CSS.
- Write code, identifiers, documentation, and commit messages in English. Preserve API field names
  and enum values exactly as published.
- Production code should explain itself through clear names and small functions. Add comments only
  for constraints the code cannot express.

## Data, API, and localization

- Call the API only through `httpClient`, and expose server data through TanStack Query hooks.
- Treat API responses as untrusted input: parse them with Zod schemas instead of casting.
- Mirror API contract changes in module `domain/` types and schemas in the same change.
- Every user-facing string goes through i18next, with keys in both `pt-BR.json` and `en.json`.
  Show API error messages with `getApiErrorMessage`; the API already localizes them.

## Configuration and secrets

- Node.js 24 is pinned in `.nvmrc`; `package.json` declares the supported range.
- Never commit `.env` files, credentials, private keys, or tokens. `.env.example` is the only allowed
  environment example and must contain placeholders or safe local defaults.
- Vite exposes `VITE_*` values to the browser. Treat them as public configuration, never secrets.
- When adding environment configuration, document it in `.env.example` and the README and add it
  to the Zod schema in `src/core/config/env.config.ts`; read it only through `env`.

## Formatting and validation

- Prettier owns formatting, including single quotes, semicolons, and trailing commas.
  `npm run format` formats the repository; generated output and the npm lockfile are excluded.
- ESLint uses flat configuration, type-aware TypeScript rules, React Hooks rules, React Refresh
  rules, and Prettier integration. `npm run lint` applies fixes; `npm run lint:check` fails on warnings.
- Await promises or explicitly handle rejections. Do not silence floating promises with `void` alone.
- Run the required gate before delivery; CI runs the same checks:

```sh
npm run format:check && npm run lint:check && npm run typecheck && npm test && npm run build
```

## Testing

- Vitest runs in jsdom with Testing Library. Add focused tests when behavior changes.
- Place tests in a `__tests__/` folder next to the code, named `<file>.spec.ts(x)`.
- Import test APIs from `vitest` explicitly; globals are disabled.
- Never reach the network: stub HTTP with a custom Axios adapter on the client under test.
  `src/test/http-stub.ts` stubs routes by `METHOD /path`, and `src/test/render-route.tsx` renders
  the route tree at a path with a fresh query client.
- The opt-in `src/test/integration/` suite is the exception: it checks real HTTP against a disposable
  backend and is excluded from `npm test`. Setup and scope are in the
  [README](../README.md#api-integration-tests).
- Media queries answer for a 1280px-wide viewport. To test a narrower screen, stub
  `window.matchMedia` with `createMatchMedia(width)` from `src/test/match-media.ts`.
- Query the DOM by role and accessible name, and compare text with `i18n.t(...)` rather than
  hardcoded translations. Ant Design gives every generated id the same value under test, so a
  dialog's accessible name is unreliable next to other Ant Design components; find a dialog by its
  text with `findDialog` (`src/test/find-dialog.ts`).

## Delivery

- Preserve unrelated user changes. Never commit generated `dist/`, dependencies, or secrets.
- Update documentation invalidated by a change in the same change. Keep each fact in one primary
  document and link to it from other documents.
- Use Conventional Commits (`type(scope): subject`).
