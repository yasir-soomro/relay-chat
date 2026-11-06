# Relay frontend

The Relay frontend is a Next.js App Router application built with TypeScript
and Tailwind CSS. It includes a responsive public landing page and reusable
public and application layout shells, plus login and registration forms backed
by the existing authentication API. Messaging and WebSockets are not
implemented.

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

The frontend forwards `/auth/*` requests to the backend without exposing the
backend origin in browser code. Set `RELAY_API_ORIGIN` in `frontend/.env.local`
if the backend is not at `http://127.0.0.1:8000`. Configure the backend's
`AUTH_ALLOWED_ORIGINS` to include the exact frontend origin, for example
`http://localhost:3000`, so login requests pass the backend origin check.
Configure a private `AUTH_JWT_SECRET` of at least 32 bytes in the backend
environment as well. Restart the frontend after changing environment variables.

Login keeps the access token in memory only. It is not written to browser
storage or a URL; reloading the page clears the in-memory session until the
application auth bootstrap is implemented.

## Checks and production

Run the TypeScript check, lint, and optimized production build:

```powershell
npm run typecheck
npm run lint
npm run build
```

Start the production server after building:

```powershell
npm run start
```

## Project structure

Application source lives in `src/`. App Router routes and layouts are in
`src/app/`, with public routes in `(public)` and the application workspace in
`(authenticated)/app/`. Shared UI and layout components are in
`src/components/`; landing page composition is in `src/features/landing/`;
design tokens and global styles are in `src/styles/` and `src/app/globals.css`.
Shared types and site-level utilities live in `src/types/` and `src/lib/`.
The `src/hooks/` and `src/providers/` directories are reserved for future
client-side workflows; the static landing page does not need client hooks or
application providers yet.

The project uses system fonts and does not fetch external fonts at build time.
