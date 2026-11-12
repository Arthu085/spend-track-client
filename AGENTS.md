# Spend Track Client

Web client for Spend Track, a personal financial organization system.

React 19: TypeScript, Vite, Ant Design, TanStack Query, Axios, Zod, React Router,
i18next, Vitest, ESLint, Prettier, npm.

## Read before changing code

Always read [`docs/conventions.md`](docs/conventions.md). Then read what matches the area you change:

| Area                                     | Document                             |
| ---------------------------------------- | ------------------------------------ |
| Purpose, scope, architecture, layout     | [`docs/PROJECT.md`](docs/PROJECT.md) |
| Setup, npm commands, editor settings, CI | [`README.md`](README.md)             |

## Hard rules

- Inspect existing code and reuse its patterns before adding abstractions or dependencies.
- Keep TypeScript strict; no explicit `any` or unchecked casts to bypass type errors.
- Never commit secrets or local `.env` files; `VITE_*` values are public browser configuration.
- Update invalidated documentation in the same change.

## Gate

Choose local validation based on the files and behavior affected:

- Documentation-only changes (`README.md`, `docs/`, `AGENTS.md`) that do not affect runtime behavior,
  builds, dependencies, or executable configuration do not require application lint, type checking,
  tests, or builds. Review the changed text, relevant links and examples, run `git diff --check`,
  and run existing documentation checks only when applicable, scoped to the changed files.
- For code or configuration changes, run the relevant existing checks and focused tests. Run the
  full gate below for broad or cross-cutting changes, uncertain impact, or an explicit requirement.
- Report which checks ran and why others were skipped. CI continues to run its configured checks.

Full gate:

```sh
npm run format:check && npm run lint:check && npm run typecheck && npm test && npm run build
```
