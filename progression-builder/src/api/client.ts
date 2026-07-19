import type { Mode, ModeScaleChord, ProgressionStep, ScaleNote, SmoothProgressionParams } from './types';

// Empty by default so requests go out same-origin as relative `/api/...`
// paths — the Vite dev server proxies those to the Go API (see
// vite.config.ts), sidestepping CORS entirely in dev. Set VITE_API_BASE_URL
// for a prod build that talks to the API directly cross-origin (the API's
// CORS_ALLOWED_ORIGINS must then include this app's origin).
const BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

async function getJSON<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export function fetchModes(): Promise<Mode[]> {
  return getJSON<Mode[]>('/api/modes', {});
}

export function fetchScaleNotes(key: string, mode: string): Promise<ScaleNote[]> {
  return getJSON<ScaleNote[]>('/api/scales', { key, mode });
}

export function fetchChords(key: string, mode: string): Promise<ModeScaleChord[]> {
  return getJSON<ModeScaleChord[]>('/api/chords', { key, mode });
}

// List params go over the wire as one comma-joined value (the API splits on
// commas); zeroes and empty lists are omitted so "knob off" stays off.
const joinList = (values?: string[]) => (values && values.length > 0 ? values.join(',') : undefined);
const nonZero = (n?: number) => (n ? n : undefined);

export function fetchSmoothProgression(params: SmoothProgressionParams): Promise<ProgressionStep[]> {
  return getJSON<ProgressionStep[]>('/api/progressions', {
    key: params.key,
    mode: params.mode,
    startChord: params.startChord,
    length: params.length,
    randomness: nonZero(params.randomness),
    resultCount: params.resultCount,
    rootWeight: nonZero(params.rootWeight),
    slashWeight: nonZero(params.slashWeight),
    motionProfile: params.motionProfile,
    colorWeight: nonZero(params.colorWeight),
    colorDevices: joinList(params.colorDevices),
    extraNotes: joinList(params.extraNotes),
    brightness: nonZero(params.brightness),
    maxNotes: nonZero(params.maxNotes),
    avoidNotes: joinList(params.avoidNotes),
    ending: params.ending,
    loopWeight: nonZero(params.loopWeight),
    pinned: joinList(params.pinned),
    required: joinList(params.required),
  });
}
