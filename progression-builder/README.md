# Progression Builder

A small, standalone dark-mode UI for building chord progressions against the
`chord-analyzr` Go API (`api-go/`). It's separate from `frontend/` (the full
"modal chord buildr" app) — no sequencer or MIDI, just:

- A three-octave keybed (C3–B5), styled after the main app's vintage synth
  keyboard: click a key to set the root and audition it; dots mark the
  current scale (amber = root) and keys light with the exact voicing as
  chords play.
- Live playback via a small dependency-free WebAudio synth
  (`src/audio/synth.ts`) — no soundfont downloads. Click any chord pad to
  hear it; volume and mute live in the Instrument panel.
- A mode dropdown (populated from `GET /api/modes`).
- A chord grid for the current key/mode (`GET /api/chords`), grouped by
  scale degree with roman-numeral headers; click a pad to play it, `+` adds
  it to the progression.
- A progression rail of playable pads — tap a pad or press `1`–`9`/`0` to
  perform steps live, or Play to hear the whole progression; generated
  results have the same per-result Play. Each pad has ▲/▼ voicing-shift
  buttons that rotate the chord through its inversions one chord tone at a
  time (up sends the bass to the top, down drops the top note into the
  bass), renaming with slash notation as the bass changes. The note order
  is the voicing, so the shifted register carries through local playback,
  the keybed lights, and "open in buildr" links — handy when a chord lands
  in an awkwardly high register.
- A "progression engine" panel over `GET /api/progressions` that exposes the
  full parameter surface of `fn_smooth_progression`:
  - core: start chord, length (up to 12 with color on), randomness, result count
  - motion & bass: `rootWeight`, `slashWeight`, `motionProfile`
    (fifths/thirds/steps/static)
  - color: `colorWeight`, `colorDevices` (borrowed/mediant/secondary
    dominant/tritone sub/chromatic), `extraNotes`, `brightness`
  - texture: `maxNotes`, `avoidNotes`, pedal note (client-side sugar over
    `required`, same as the MCP layer)
  - ending & loop: `ending` cadences, `loopWeight`
  - per-step chord pins (`pinned=Chord@step`)
  - one-click style recipes (heroic, noir, game loop, gospel, ambient) from
    `docs/progression-creativity-plan.md`, applied as knob presets
- Result cards with per-transition voice-leading distances, total cost,
  hover-to-preview on the mini keyboard, and per-result "open in buildr"
  links. Slash and borrowed-root chords not in the diatonic list get their
  notes derived from the chord name (`src/util/chordNotes.ts`, mirroring
  `api-go/internal/mcpserver/chordurl.go`).
- A button that encodes the built progression into a shareable link that
  opens directly in the main modal chord buildr app for full editing,
  playback, and export.

The UI follows the main app's studio-rack design language (see
`frontend/DESIGN.md`) on the default theme's palette: panels with engraved
title bars, recessed inset screens for values, fader-cap sliders, LED
indicators, switch-pill chips, and the aged-ivory/charcoal keybed with its
accent-felt overhang rail.

## Setup

```
bun install   # or npm install
bun run dev   # or npm run dev — starts on http://localhost:5174
```

Requires `api-go` running on `localhost:8080` (see repo root
`docker-compose.yml`, or `cd api-go && go run ./cmd/api`). In dev, the Vite
server proxies `/api` requests to it, so no CORS config is needed.

Copy `.env.example` to `.env` to point at a different API for a prod build
(`VITE_API_BASE_URL` — remember to add this app's deployed origin to the
API's `CORS_ALLOWED_ORIGINS` if so), or to override the base URL used when
generating "open in buildr" links (`VITE_BUILDR_URL`, defaults to
`https://modal.chordbuildr.com`).

## Link encoding

`src/link/` is a minimal, encode-only port of `frontend/src/util/url/`'s `v9`
state format. It has to stay in lock-step with two things in the main app for
generated links to decode correctly there:

- `AVAILABLE_KEYS` (`frontend/src/hooks/useIntegratedAppLogic.ts`) — the key
  is stored as a base36 index into this exact array.
- `chordTypes` (`frontend/src/services/DynamicChordService.ts`) — the chord
  type code table is derived by sorting this map's keys, so the *set* of keys
  has to match (values/order of insertion don't matter, the sort is stable).

If either changes upstream, update `src/link/buildrLink.ts` /
`src/link/chordTypes.ts` to match.
