# chord-analyzr API (Go)

A thin HTTP layer over the postgres views and the `fn_smooth_progression`
voice-leading engine (`flyway/sql/views/R__voice_leading.sql`).

| Endpoint | Description |
| --- | --- |
| `GET /api/modes` | All modes |
| `GET /api/scales?key=C&mode=Ionian` | Notes of a scale |
| `GET /api/chords?key=C&mode=Ionian` | Chords that fit within a key/mode |
| `GET /api/progressions?key=C&mode=Ionian&startChord=Cmaj7&length=4` | Smoothest progression of `length` chords starting on `startChord` |
| `GET /v3/api-docs` | OpenAPI spec (source for the frontend's generated client) |
| `GET /swagger-ui.html` | Interactive docs |
| `GET /healthz` | Liveness probe |

## Layout

- `cmd/api` — entrypoint: config, db readiness wait, graceful shutdown
- `internal/httpapi` — routing, handlers, CORS, OpenAPI documents
- `internal/service` — input shaping: key normalization, length/weight clamps, pin parsing
- `internal/store` — pgx queries against the views and progression function

## Development

```sh
go test ./...        # unit tests (no database needed)
go run ./cmd/api     # serves on :8080 against localhost postgres
```

Configuration is via environment variables: `PORT`, `DATABASE_URL` (or
`DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`), and
`CORS_ALLOWED_ORIGINS` (comma-separated, defaults to `http://localhost:5173`).
Startup blocks until flyway's last materialized view is queryable, so the
container needs no external wait script.
