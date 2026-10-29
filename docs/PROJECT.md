# Project context

Purpose, current scope, architecture, and source layout. Engineering rules are in
[`conventions.md`](conventions.md); setup and tooling are in [`README.md`](../README.md).

## Purpose

A reusable React web template for the
[backend-template](https://github.com/Arthu085/backend-template) REST API.

## Stack

- React 19 and TypeScript with strict checking; Vite for development and builds.
- Ant Design 6 for UI components and theming.
- TanStack Query for server state, on top of an Axios HTTP client.
- Zod for runtime validation of environment configuration, API responses, and forms.
- React Router in data mode (`createBrowserRouter`).
- i18next and react-i18next with `pt-BR` (default) and `en`, matching the API.
- Vitest, Testing Library, and jsdom for tests.
- Node.js 24 and npm, ESLint, Prettier, and GitHub Actions CI.

## Current scope

The foundation is in place: application providers, routing with not-found and error pages, the
HTTP client, and localization. The `auth` module adds sign-in, sign-out,
password recovery, email confirmation, session refresh, and route guards. The main layout adds ability-filtered
navigation and a language switcher. Shared list and form building blocks (paginated tables with
URL-synced pagination and filters, form modals, and API success and error feedback) back the `users` module,
which manages users at `/users`, lets every signed-in user edit their own profile and change their
own password at `/account`,
and lets an admin approve or reject changes another admin requested at `/account/change-requests`.
The `authorization` module shows each role's permissions at `/roles` and lets a user with the
ability change them. The `home` module's page at `/` links to every page the user can reach. Its shortcut grid shows a
skeleton until the initial abilities query settles, so late permission-based entries do not move
existing shortcuts. The production build is an installable progressive web app (see
[Progressive web app](#progressive-web-app)).

## Architecture

### Source layout

| Path                    | Responsibility                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `src/main.tsx`          | Bootstrap: initialize i18n, import global styles, mount React    |
| `src/App.tsx`           | Compose the application providers and router                     |
| `src/core/config/`      | Validated environment, Ant Design theme, TanStack Query client   |
| `src/core/http/`        | Axios client and API error helpers                               |
| `src/core/i18n/`        | i18next setup, language preference, switcher, and translations   |
| `src/core/layout/`      | Main layout, with its `header/` and `sidebar/` parts             |
| `src/core/providers/`   | Application-wide providers                                       |
| `src/core/router/`      | Route paths (`app-routes.ts`), route tree (`routes.tsx`), router |
| `src/core/theme/`       | Theme mode preference and the floating theme toggle              |
| `src/core/pwa/`         | Service worker update prompt and offline banner                  |
| `src/core/pages/`       | Application-level pages: not found and route error               |
| `src/modules/<name>/`   | Self-contained feature modules                                   |
| `src/shared/`           | Domain-agnostic components, hooks, and form and list helpers     |
| `src/test/setup.ts`     | Vitest setup: jest-dom matchers, i18n, jsdom gaps, cleanup       |
| `src/test/*`            | Test helpers: HTTP route stubs and rendering a route in memory   |
| `public/`, `index.html` | Static assets and the HTML entry point                           |

`core/` holds application wiring, `modules/` holds features, and `shared/` holds domain-agnostic
components, hooks, and utilities that more than one page or module needs. Import across
folders with the `@/` alias (`@/core/...`); use relative imports within a folder.

### Modules

A module groups its code by layer, creating only the layers it needs:

| Layer           | Contents                                                       |
| --------------- | -------------------------------------------------------------- |
| `domain/`       | Types, Zod schemas, and constants that mirror the API contract |
| `infra/`        | API calls through `httpClient`, and TanStack Query hooks       |
| `presentation/` | Pages, components, and UI hooks                                |

### HTTP client

`httpClient` (`src/core/http/http-client.ts`) targets `${VITE_API_URL}/api` and implements the API
session contract:

- **Cookies:** requests are sent with credentials; the API keeps tokens in httpOnly cookies, so the
  client never stores or sends tokens itself.
- **Language:** every request sends `Accept-Language` with the current i18n language, so API
  messages come back localized.
- **CSRF:** unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) send `X-CSRF-Token`. The token is kept
  in memory, bootstrapped once from `GET /auth/csrf` (concurrent requests share one bootstrap), and
  replaced whenever a response carries a new `X-CSRF-Token` header (login, refresh).
- **CSRF recovery:** an unsafe request answered with `403` bootstraps the token again and is
  retried once only when the token changed, which recovers from a token invalidated by a login in
  another tab. The API has no machine-readable CSRF error, but `GET /auth/csrf` keeps a token that
  is still bound to the session, so an unchanged token means the `403` was a business rule (such
  as an unconfirmed email) and the request is not replayed.

- **Session refresh:** a request answered with `401` triggers one `POST /auth/refresh` and is
  retried once. `/auth/login` and `/auth/refresh` are exempt. The API revokes every session when a
  refresh token is used twice, so refreshes are serialized: concurrent `401`s in a tab share one
  refresh, and tabs take the `auth-session` Web Lock (where the browser supports it). If
  the refresh answers `401` or `403`, the original `401` is rejected; other refresh failures
  (network, `5xx`) reject with their own error and leave the session alone. The refresh has no
  timeout, so a rotation the API already applied is never abandoned.
- **Envelope:** successful responses are `{ data, meta }`, where `meta.message` is the API's
  localized success message when the route declares one. `parseApiResponse` validates the envelope
  and returns `data` parsed with the given Zod schema plus `meta`; `parseApiData` returns only
  `data`. `parsePaginatedResponse` parses a list route's items and its `meta.total`, `meta.page`,
  and `meta.limit`.

`httpClient.clearCsrfToken()` drops the stored token after sign-out, so the next unsafe request
bootstraps a new one. `httpClient.withSessionLock(task)` runs a task under the same Web Lock as
refreshes; login uses it, so a refresh in another tab cannot finish after it and overwrite the new
session's cookies with the previous session's tokens. Logout does not need it: it ends every
session anyway, and it needs a valid access token, so a `401` on it must be able to refresh.

`getApiErrorMessage` returns the API's localized `message`, or a localized fallback for network,
timeout, and unexpected errors. When an API error includes `auditId`, the message also displays
a localized reference label with that value for support investigations.

### Server state

TanStack Query owns server state. Queries are fresh for 30 seconds, do not refetch on window focus,
and retry up to twice except on `4xx` responses; mutations never retry. Authentication queries use
the revalidation policy described below. Keep server data in queries instead of copying it into
component state.

A query or mutation that still fails with `401` (the refresh failed) means the session is gone:
the query client calls `clearSession`, which sets the session to signed out and removes every
other cached query, so the guards send the user to the login page. Mount authenticated queries only under
`AuthGuard`, which unmounts them when the session ends; a query outside it would refetch, fail,
and clear the session again.

### Authentication

The `auth` module mirrors the API's cookie session; the browser never sees a token.

- **Session:** `useSession()` reads `GET /users/me` and keeps the `UserDetail` (or `null` when the
  API answers `401` or `403`). Session and effective abilities queries stay fresh for one minute;
  returning to a visible application or reconnecting revalidates stale active queries while signed
  in. A locally cleared session stays signed out until login or a cross-tab sign-in event. Mounting
  another consumer or navigating does not trigger revalidation. Transient background failures keep
  the cached session and abilities; initial failures reach the route error boundary. A revoked
  session clears protected cached data and notifies other tabs through the existing sign-out
  mechanism. Sign-in stores the user it returns; sign-out and a successful password reset call
  `clearSession`, and clearing a session also drops the CSRF token. Updating the signed-in user
  through user management also calls `clearSession` immediately; updating another user only
  refreshes the users queries. Sign-out ends every session of the user, as the API defines.
- **Other tabs:** the auth cookies are shared by every tab, so tabs keep their session state in
  sync over the `auth-session` `BroadcastChannel` (`session-channel.ts`; skipped where the browser
  lacks it). `clearSession` posts `signed-out` and sign-in posts `signed-in`; `AppProviders`
  subscribes through `syncSessionAcrossTabs`. Every tab that receives a message drops its CSRF
  token. On `signed-out` it clears its session without posting again, so its guards send it to the
  login page; on `signed-in` it removes every other cached query and refetches the session, so a
  tab left on a guest page moves into the app.
- **Guards:** `AuthGuard` wraps protected routes and redirects to `/login`; `GuestGuard` wraps
  login, forgot-password, and resend-confirmation and always sends a signed-in user home, so every
  login lands on the home page. Both show a full-page loader while the session loads; the guest guard resolves before
  mounting the authentication card, so the card does not resize around that loader.
- **Pages:** login, forgot-password, and reset-password (`/reset-password?token=...`, the API's
  default `MAIL_RESET_PASSWORD_PATH`) render inside `AuthLayout`. Reset-password works with or
  without a session. There is no self-registration. A failed submit on any of these pages, and on
  the email confirmation pages below, opens the error dialog; a rejected reset link's dialog links
  to forgot-password.
- **Email confirmation:** `/confirm-email?token=...` (the API's default `MAIL_CONFIRM_EMAIL_PATH`)
  confirms the address only when the user clicks its button, so link scanners and repeated effects
  cannot spend the single-use token; it works with or without a session. A rejected link's error
  dialog links to `/resend-confirmation`, a guest page that asks for the email and, like forgot-password, answers
  the same for every address. A login rejected with `403` (the API's unconfirmed-email answer)
  opens an error dialog linking to that page with the typed email filled in.
- **Forms:** Ant Design forms validate fields with Zod schemas from the module's `domain/` through
  `zodRule` (`src/shared/forms/`). Length limits mirror the API: email up to 255 characters,
  passwords up to 128, and new passwords at least 8. New passwords (reset, create user, and change
  own password) must also mix an ASCII lowercase letter, an ASCII uppercase letter, an ASCII digit,
  and a character that is not an ASCII letter or digit (`STRONG_PASSWORD_PATTERN`), as the API
  requires. A new password that is too short or misses a character class gets one message that
  states the whole rule. Login and current-password fields keep only the length limit, so older
  passwords still sign in.

### Authorization and navigation

The `authorization` module reads the caller's effective abilities from `GET /users/me/abilities`
as `{ action, subject }` pairs (`useAbilities()`), and `hasAbility` checks one pair. Abilities only
show or hide UI; the API still enforces every route. The query is mounted under `AuthGuard` and is
removed with the rest of the cache when the session ends. `AbilitySummary` lists abilities grouped
by subject (`groupAbilitiesBySubject`), with API action and subject labels when supplied, known
frontend translations for bare pairs, and the API identifier for new untranslated actions or
subjects. Permission schemas and grouping accept new nonempty action and subject identifiers
without a frontend catalog change.

`AbilityGuard` wraps routes that need an ability: it shows a loader while abilities load, the
forbidden page when the user lacks the ability, and the route otherwise. A failed initial abilities query
is thrown to the route error boundary. `useRoles()` reads `GET /roles` (`READ` on `ROLE`), and
`RoleSelect` offers those roles with their localized labels and explicit loading and error states.
User forms offer active roles and retain assigned inactive roles visibly; inactive roles can be
removed but cannot be newly selected. Filters opt in to inactive roles. Without `READ` on `ROLE`,
the selector uses only roles already supplied by the session and edited user, explains that the list
is limited, and avoids a forbidden catalog request. The API still decides whether an assignment is
allowed. Role management is described under
[Roles](#roles).

`MainLayout` (`src/core/layout/main.layout.tsx`, with header parts in `header/` and sidebar parts in `sidebar/`) wraps every signed-in page: a side menu whose title links home
and whose bottom holds the theme toggle (see [Theme](#theme)) and a sign-out button, and a header with a sidebar toggle, the language switcher, and a user menu (opened from the user's
name) that links to the account page and signs out. `MainLayout` only composes `MainSidebar` (side menu or drawer, rendering
`SidebarNavigation`, `SidebarThemeToggle`, and `SidebarLogoutButton`) and `MainHeader` (sidebar toggle, language switcher,
and `UserMenu`), and holds the sidebar state both share. The toggle collapses the side menu into an
icon-only rail (the title becomes a short mark) and expands it again. The side menu starts expanded,
and `useSidebarCollapsed` stores the choice in `localStorage` (`sidebar-collapsed`), so it survives
reloads and sign-ins. Below the `lg` breakpoint there is no side menu: the toggle opens the same
title and menu in a drawer from the left, which closes when a link is followed, on a click outside
it, or with Escape, and the header and page use narrower padding. For a user holding `ADMIN`, the
user menu also links to the change requests page, and a dot on the user's name and a count on that entry show pending
change requests. Menu
entries are declared in `sidebar/navigation.ts` as titled sections (`navigationSections`), with shared user
and role page metadata in `core/router/page-metadata.ts` also used by home shortcuts. Each surface
keeps its own entries, ordering, and overrides. An entry with an `ability` is shown only when the
user has it, and while abilities load, only entries without one are shown; a section with no visible
entry is hidden. In the expanded menu each section is a collapsible submenu: clicking its title
shows or hides its entries, several sections can be open at once, and the section holding the
current page opens whenever that page changes. The collapsed rail shows every entry's icon and
separates sections with dividers. In the collapsed rail the bottom buttons show only their icons, with tooltips. The menu scrolls
vertically between the fixed title and bottom buttons when
its entries do not fit.

### Lists and forms

Shared building blocks for feature pages:

- **List parameters:** `useListParams(filterShape)` (`src/shared/list/`) keeps `page`, `limit`, and
  filters in the URL search string, so a list survives reloads and works with the browser history.
  Each filter is a string parsed with its Zod schema; an invalid or empty value is ignored, as are
  an invalid `page` or a `limit` outside `1`–`50` (the API's cap; the page-size options are `10`,
  `20`, and `50`). The API defaults (`page` 1, `limit` 20) are left out of the URL. Default
  filters, passed as the second argument, apply when the URL has no value for them and are left
  out of the URL too; clearing a filter that has a default restores it. Applying filters trims
  them and returns to the first page. Include `page`, `limit`, and the filters in
  the list query's key.
- **Tables:** `PaginatedTable` renders a list query's `PaginatedResponse` in an Ant Design table
  whose pagination reads and writes the list parameters, with the total count and an error alert.
  Wide tables scroll horizontally inside their own container (`scroll={{ x: 'max-content' }}`
  unless the page passes another `scroll`), and on phone widths the pagination switches to its
  small simple form. Use `placeholderData: keepPreviousData` on list queries so rows stay visible
  while a page loads.
- **Filters:** `ListFiltersForm` wraps filter fields in a search form initialized from the URL.
  It lays the `Form.Item` children out in a responsive grid with labels above the fields, one
  column on phones and up to six on wide screens, with the clear action aligned to the fields.
  A change applies automatically after `FILTERS_DEBOUNCE_MS` (400 ms) without the last change, and
  a clear action resets every filter. When the URL changes from elsewhere (clear, browser history),
  pending edits are canceled and the fields follow it, including pagination-only navigation;
  a typed value is kept while it trims to the applied filter. Its field ids
  are prefixed with `list-filters`, so a form modal on the same page can reuse field names.
- **Form modals:** `FormModal` (`src/shared/forms/`) renders a vertical Ant Design form in a modal
  with a submit button, disables it while submitting, and destroys its fields when hidden, so each
  opening starts from `initialValues`. A failed submit reports its error through the feedback
  modal, so the form stays open with the typed values.
- **Inputs:** `RecordStatusSelect` offers the shared `ACTIVE`/`INACTIVE` record status
  (`src/shared/domain/`) with localized labels.
- **Success messages:** a mutation opts in by calling `useApiSuccessMessage()`
  (`src/shared/feedback/`) and passing its result to `onSuccess`; it shows the response's
  `meta.message` with Ant Design's `message.success`, or a generic localized message when the API
  sends none. It needs the Ant Design `App` provider, which `AppProviders` and the test renderer
  supply. `AppProviders` opens messages and notifications below the main layout header and lets
  clicks pass through their list containers, so only the visible notices catch the pointer.
  It also centers every Ant Design modal vertically, including the `App` hook's dialogs.
- **Error and warning modals:** a save or action that fails reports it in a separate dialog
  instead of an inline alert. `useFeedbackModal()` (`src/shared/feedback/`) returns
  `showError(error)`, which opens Ant Design's `modal.error` with a localized title and the
  `getApiErrorMessage` text, and `confirmWarning({ title, content, okText, onOk })`, which opens a
  warning with OK and cancel buttons and runs `onOk` only when confirmed.
  `showErrorWithLink(error, { to, state, label })` adds a link below the message; following it
  closes the dialog and navigates to `to` with the router `state`. The dialogs render in the `App`
  provider's holder, outside the router, so the link navigates through the page's `useNavigate`
  instead of a router `Link`. Pass `showError` to a mutation's `onError` (or call one of them from
  it); never call them while rendering. The dialogs stack above an open modal; closing them
  returns to it. Inline alerts remain for form field validation, failed page or table loads, and
  informational notices.

### Home

`/` is where sign-in lands unless the guards remembered another page (see
[Authentication](#authentication)). It greets the user by name and shows a card linking to each
page they can reach, declared in `home-shortcuts.ts`: Users and Roles with the same abilities as
their menu entries, My account for everyone, and Change requests only for a user holding `ADMIN`,
with the pending count. While abilities load, only cards without an ability are shown.

### Users

The `users` module manages users at `/users`, behind `AbilityGuard` with `READ` on `USER`; the
Users menu entry needs the same ability.

- **List:** a paginated table of name, roles, and status, filtered by name, email, role, and status
  through the URL. The API's list items have no `email`, so email is a filter but not a column.
  The signed-in user's row is marked by comparing its uuid with the session user's. The status
  filter defaults to `ACTIVE` and cannot be emptied. The role filter is shown only with
  `READ` on `ROLE`.
- **Details:** a modal with the user's email, roles, status, email confirmation, and authorship.
  Details and edit request `GET /users/:uuid` on every opening, so they always show current data;
  both are disabled for inactive users, which the API does not return.
- **Create and edit:** `FormModal` forms for name, email, roles, and, on create, a password, with
  the API's limits (name up to 150 characters). Editing loads the user first, because the list has
  no email. Editing your own
  profile ends your session, as the API defines. Unchanged role assignments are omitted from the
  edit payload, preserving existing inactive roles when only profile fields change; a replacement
  role set must satisfy the API's active-role rules.
- **Change requests:** editing a different admin answers `409` (`AdminChangeApprovalRequiredError`).
  The API's error body has no machine-readable code, so the modal treats a `409` on a user who
  holds `ADMIN` and is not the session user as that error: it opens a warning dialog with the API
  message and an offer to send the changes as a change request. Confirming posts the form's
  partial body to `POST /users/:uuid/change-requests` (`UPDATE` + `READ` on `USER`, like edit),
  closes the edit modal, and confirms with a success message; cancelling returns to the edit
  modal with the typed values. Any other error opens the error dialog.
- **Status and delete:** a switch activates or deactivates a user, and delete asks for
  confirmation. A delete that empties the last page moves to the previous one.
- **Feedback:** every mutation shows the API's success message and refetches the users queries;
  failed saves, status changes, deletes, and user loads open the error dialog.

Create needs `CREATE`, edit and the status switch `UPDATE`, and delete `DELETE` on `USER`; actions
without the ability are hidden.

### Account

`/account` lets every signed-in user change their own name and email through `PATCH /users/me`
and their own password through `PATCH /users/me/password`, which need no ability, and shows their
access read-only. No page changes another user's password; the API has no route for it.

- **Form:** name and email with the users form limits. Save is enabled only when a value changed;
  emails are compared trimmed and case-insensitively, as the API normalizes them. The current
  password field appears only when the email changes, because the API requires it then (`422`
  when missing, `403` when wrong) and ignores it otherwise. A failed save opens the error dialog.
- **Ending the session:** every successful update ends all of the user's sessions and clears the
  auth cookies, as the API defines. On success, the mutation drops the CSRF token and calls
  `clearSession`, so `AuthGuard` sends the user to the login page (returning to `/account` after
  sign-in). A notification that stays until closed says that every session ended and, after an
  email change, that the new address must be confirmed before signing in; a login rejected for
  that links to the resend-confirmation page. The notification is rendered by the
  application-level Ant Design `App`, so it survives the redirect.
- **Password:** below the profile form, a separate form asks for the current password, the new
  password, and its confirmation, with the login and reset limits (current password up to 128
  characters, new password 8–128 with the strength rule) and a mismatch check on the confirmation.
  The body sends only `currentPassword` and `newPassword`. A wrong current password is a `403` with an unchanged CSRF
  token, so the HTTP client does not replay it; it opens the error dialog and keeps the session and
  the typed values.
- **Ending the session after a password change:** a successful change ends every session and clears
  the auth cookies, like a profile update, and is handled the same way: the mutation drops the CSRF
  token and calls `clearSession`, and an application-level notification titled with the API's
  success message says that every session ended and asks the user to sign in again.
- **Access:** the session user's roles, and their effective abilities in `AbilitySummary`. From
  the `lg` breakpoint it sits beside the profile and password forms; narrower screens stack it below.
- **Pending change requests:** an alert links to the change requests page while one is pending.

### Change requests

`/account/change-requests` is the API's default `MAIL_USER_CHANGE_REQUEST_PATH`, the page the
change request email links to. It lists `GET /users/me/change-requests` and lets the session user
decide each request. Only admins receive change requests, and the API answers `403` to a caller
without `ADMIN` (whatever the role's status), so `AdminGuard` (authorization module) shows the
forbidden page unless the session user holds `ADMIN`, and the list query runs only for them. The
list is not paginated; the API keeps at most one pending request per user, so the header and
account page read the same query for the pending count.

- **Diff:** each request is a card with the requester (or "a removed user" when the API sends no
  name), the request and expiry dates, and a table of name, email, and roles with the values when
  the request was made (`current`) next to the requested ones. Changed fields are tagged; emails
  are compared like the account form, roles by uuid.
- **Decisions:** approve and reject each ask for confirmation first.
  `POST /users/me/change-requests/:uuid/approve` applies the change and ends every session of the
  user, so on success the mutation drops the CSRF token and calls `clearSession`, and an
  application-level notification says the request was approved, every session ended, and, after an
  email change, that the new address must be confirmed, as on the account page. Reject keeps the
  session, shows the API's success message, and refetches the list.
- **Errors:** a failed decision opens the error dialog with the API message and refetches the
  list. This covers a stale request (`409 UserChangeRequestStaleError`: the profile changed after
  the request was made) and one that is no longer pending.

### Roles

`/roles` lists the roles' labels and statuses from `GET /roles`, behind `AbilityGuard` with `READ`
on `ROLE`; the Roles menu entry needs the same ability. Roles and abilities are a fixed catalog in
the API, so there is no create or delete, and the list is not paginated.

- **Grid:** opening a role shows a modal with a subjects × actions grid of checkboxes, grouped like
  `AbilitySummary`; labels use the API when supplied and otherwise the same fallback labels.
  Checked cells are the role's grants from `GET /roles/:uuid`, requested on every opening. The cells
  come from the ability catalog, `GET /abilities`, which needs `READ` on `ABILITY`. Only pairs returned by the API are
  selectable; the grid derives subjects and action columns from that response. Without catalog
  access, the modal shows only the role's actual grants read-only and explains the limitation.
  A failed catalog request is shown as an error, without a fabricated fallback.
  An inactive role cannot be opened, because the API answers `409` for it.
- **Editing:** with `UPDATE` and `READ` on `ROLE` and `READ` on `ABILITY`, the grid is editable, and
  save sends the full selection to `PATCH /roles/:uuid/abilities`, which replaces the grant set
  (`[]` revokes every grant). Save is enabled only when the selection differs from the grants. On success, the modal
  closes, the API's success message is shown, and the roles queries refetch. When the session user
  holds the role, their abilities refetch too, so the menu and guards follow. The API keeps
  sessions open here. A failed save opens the error dialog above the grid; the error body has no
  machine-readable code, so the frontend does not tell its `403`s or `409`s apart.
- **Read-only:** without `UPDATE` on `ROLE` the grid is disabled and has no save button. `ADMIN`'s
  grants are immutable (the API answers `403` whoever calls), so its grid is always read-only, with
  a note explaining why.

### Routing

Pages and the protected main layout load through the route `lazy` option. Public authentication
pages skip the main layout and its exclusive dependencies. Guards and the authentication layout
load with the application shell. Vite chooses shared dependency chunks from the import graph
without manual vendor groups.

### Theme

The Ant Design theme (`src/core/config/theme.config.ts`) is monochrome, with a light and a dark
mode built from the same token mapping:

- **Light:** black for primary actions, links, and info states on a white background, with light
  grays for selected, hover, and border states.
- **Dark:** Ant Design's dark algorithm with a near-white primary (the algorithm softens the white
  seed to `#dcdcdc`) on a black background, with dark grays for selected, hover, and border states.
  Content drawn on primary fills (primary button text, checkbox and radio marks, switch handles,
  selected date cells, active step icons) is black so it stays readable.

Success, warning, and error keep their default colors in both modes so status stays recognizable.
Secondary typography and description labels use a stronger tertiary text token so normal-sized
text meets a 4.5:1 contrast ratio on the neutral page, card, overlay, and selection backgrounds.
Form validation uses stronger error foregrounds without changing the global status colors or
danger button fills.
`useThemeMode()` (`src/core/theme/`) resolves the mode: the user's choice when there is one,
otherwise the operating system's `prefers-color-scheme`, followed live. Signed-in pages switch
between light and dark from a button at the bottom of the `MainLayout` sidebar (and the navigation
drawer on small screens); the authentication pages keep `ThemeToggle`, a floating button rendered by
`AuthLayout`. Both call `setThemeMode`, which stores the choice in `localStorage` (`theme-mode`) so
it survives reloads and applies to other open tabs. `AppProviders` also sets the document's `color-scheme` and background
to match the mode. Style components through theme tokens instead of hardcoded colors.

### Progressive web app

`vite-plugin-pwa` turns the application into an installable app, in builds and in development.

- **Development:** `npm run dev` registers a development service worker (`devOptions.enabled`),
  generated into the ignored `dev-dist/` folder, and serves the manifest and generated icons, so
  installation, registration, and the update prompt can be tried without a build. It precaches
  only `index.html` for `/`, so offline loading works only in builds. `devOptions.suppressWarnings`
  replaces the build's glob patterns, which match nothing in `dev-dist/`, with an empty
  `suppress-warnings.js`, so Workbox does not warn about them. The worker stays registered for the
  dev server's origin; unregister it in the browser's developer tools before serving another
  project from the same port.
- **Manifest:** generated from `VITE_APP_NAME` (`name`) and `VITE_APP_MARK`
  (`short_name`), with `display: standalone`, `lang: pt-BR`, and white theme and background colors.
  `index.html` declares a white or black `theme-color` per `prefers-color-scheme`.
- **Icons:** `public/favicon.svg` (Vite's default logo) is the only source image.
  `@vite-pwa/assets-generator` (`minimal-2023` preset) generates the favicon, PWA, maskable, and
  Apple touch icons, served by the dev server and written by the build, which also injects their
  `<link>` tags into `index.html`. Replace the SVG to rebrand; the generated PNGs are not committed.
- **Caching:** the Workbox service worker precaches the built application shell (scripts, styles,
  HTML, icons, fonts) and answers navigations with `index.html`, except paths under `/api`. It has
  no runtime caching: API requests always reach the network, so authenticated data, cookies, and
  CSRF tokens never land in a cache.
- **Updates:** registration uses the `prompt` strategy. When a new build is waiting, `UpdatePrompt`
  (mounted in `AppProviders`) opens a notification whose Reload button activates the new service
  worker and reloads every open tab; closing the notification keeps the current version until the
  next visit.
- **Offline:** `OfflineAlert` shows a warning banner while `navigator.onLine` is false, in the main
  layout, the authentication layout, and the route error page. The shell loads offline, but every
  page needs the API, so an offline start shows the route error page under the banner. There is no
  offline data or queued mutations.

Tests never load the service worker: Vitest aliases `virtual:pwa-register/react` to
`src/test/pwa-register.ts`, which reports no waiting update.

### Localization

The initial language is the user's stored choice, when there is one, otherwise the first supported
match in `navigator.languages` (exact tag, then primary subtag, for example `pt-PT` → `pt-BR`),
falling back to `pt-BR`. `LanguageSwitcher`, shown in the main layout header and on the
authentication pages, stores the choice in `localStorage` (`language`) and invalidates every
query, so data the API localized (labels and messages) is fetched again in the new language. Other
open tabs follow the choice: `useLanguageSync`, mounted in `AppProviders`, listens for the `storage`
event on that key and applies the same change. A language change also updates
`<html lang>`, Ant Design, Day.js, and Zod error messages. Translation keys are type-checked against
`pt-BR.json`, and `en.json` must provide every key.
