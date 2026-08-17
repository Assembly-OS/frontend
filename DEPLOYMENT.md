# Frontend runtime

The production image listens on port `3000`, runs as UID/GID `10001`, and
mounts the same `/data` directory as backend. It never creates or migrates the
database; Compose waits for backend readiness first.

Required runtime values are `AUTH_SECRET`, `ADMIN_PASSWORD_HASH`, and
`ADMIN_LOGIN`. They must match backend because both services validate cookies
for the same public origin. Caddy sends `/api/*` to backend and all other paths
to this service.

`/control` remains a 404 in production unless `DEV_PANEL_ENABLED=1` and the
same unique `DEV_PANEL_KEY` of at least 32 bytes is supplied to both services.
