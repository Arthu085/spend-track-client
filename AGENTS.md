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

```sh
npm run format:check && npm run lint:check && npm run typecheck && npm test && npm run build
```
