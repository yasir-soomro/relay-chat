# Relay frontend

The Relay frontend is a Next.js App Router application built with TypeScript
and Tailwind CSS. It includes responsive public pages, authentication,
connection and discovery workflows, profile management, notifications, and
one-to-one messaging backed by the Relay REST and WebSocket APIs.

## Requirements

- Node.js 20.9 or later
- npm

## Set up and run

From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.
The development server reloads when source files change.

## Authentication setup

The frontend forwards API requests to the backend without exposing the backend
origin in browser code. Set `RELAY_API_ORIGIN` in `frontend/.env.local` (or the
frontend hosting environment) if the backend is not at
`http://127.0.0.1:8000`. Configure the backend's
`AUTH_ALLOWED_ORIGINS` to include the exact frontend origin, for example
`http://localhost:3000`, so login requests pass the backend origin check.
Configure a private `AUTH_JWT_SECRET` of at least 32 bytes in the backend
environment as well. Restart the frontend after changing environment variables.

The authentication provider restores the session from the backend's HttpOnly
refresh-token cookie when the app loads. Access tokens stay in memory only;
they are never written to browser storage or a URL. The provider refreshes
access tokens before expiry and retries an authenticated request once after a
401 response. The `/app` route waits for session verification and redirects
unauthenticated visitors to `/login`; backend endpoints must still enforce
authorization independently.

Messaging uses a same-origin `/ws` connection and REST requests for message
history and offline recovery. In production, route `/ws` through an ingress or
reverse proxy that supports WebSocket upgrades and forwards it to the backend;
set `RELAY_API_ORIGIN` to the backend origin for the frontend's REST rewrites.
Run a single backend process/instance unless shared WebSocket coordination is
added, since live connections are held in process memory.

## Checks and production

Run the TypeScript check, lint, and optimized production build:

```powershell
npm run typecheck
npm run lint
npm run build
```

Run the frontend authentication integration tests:

```powershell
npm test
```

Start the production server after building:

```powershell
npm run start
```

## Design system

The shared design system lives in `src/styles/tokens.css` and
`src/app/globals.css`. Semantic CSS variables are exposed to Tailwind for
primary and secondary actions, accent, page and surface backgrounds, borders,
focus, and success, warning, information, and danger states. Indigo `#4F46E5`
is the primary brand color and teal `#14B8A6` is the accent. Light mode uses
off-white backgrounds and white surfaces; dark mode uses layered navy surfaces.

The root layout applies a small `beforeInteractive` theme bootstrap so the
saved System, Light, or Dark preference is applied before the page is painted.
System follows the operating-system preference and updates when it changes.
The theme switcher is available in public navigation and in both authenticated
navigation layouts. User selections are stored as `relay-theme` in local
storage and synchronize across open tabs.

use the reusable primitives in `src/components/ui/`: `Button` supports primary,
secondary, quiet, destructive, and loading states; `Input` and `Textarea`
share accessible form-control states; `Card`, `Badge`, `Avatar`, `Dropdown`,
and `Toast` provide shared presentation; and `Dialog` uses the browser's native
modal dialog for keyboard focus management and Escape handling. Existing
feature notification toasts and mobile navigation continue to own their
feature state while using these shared styles. `PageContainer` and the design
tokens define content width, spacing, typography, breakpoints, radii, and
elevation. Keep feature policy and API calls out of primitives.

Controls have visible focus, hover, active, disabled, and loading feedback.
Status colors are paired with semantic text labels, and global motion honors
`prefers-reduced-motion`. Use semantic token utilities rather than hard-coded
colors when adding UI so both themes retain contrast.

Open `/design-system` to inspect the small component showcase in both themes.

## Project structure

Application source lives in `src/`. App Router routes and layouts are in
`src/app/`, with public routes in `(public)` and the application workspace in
`(authenticated)/app/`. Shared UI and layout components are in
`src/components/`; landing page composition is in `src/features/landing/`;
design tokens and global styles are in `src/styles/` and `src/app/globals.css`.
Shared types and site-level utilities live in `src/types/` and `src/lib/`.
Authentication UI, API access, session state, and the `useAuth` hook live
together in `src/features/auth/`. The root layout provides the session to all
routes; the workspace layout guards authenticated pages.

The project uses system fonts and does not fetch external fonts at build time.
