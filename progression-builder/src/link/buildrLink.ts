import { encodeChordName, encodeChordNotes, toBase36Index } from './encode';

// Exact key list from frontend/src/hooks/useIntegratedAppLogic.ts `AVAILABLE_KEYS`.
// The encoded state stores a *base36 index into this array*, so it has to stay
// byte-for-byte identical between the two apps or links will decode to the
// wrong key.
export const AVAILABLE_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

const VERSION = 'v9';
// encodeTiming(120bpm, 0.25 subdivision, 0 swing, no flags) — the app's defaults.
const DEFAULT_TIMING = '1o-1-0-0';
// Piano settings with only the instrument set: electric_piano_1, which is index
// 33 ('x' in base36) in the MusyngKite names.json list the main app loads at
// runtime. Its bootstrap fallback list also has electric_piano_1 at index 0, so
// an out-of-range 33 there still resolves to electric_piano_1.
const DEFAULT_PIANO = 'x';
const DEFAULT_PATTERN = '1.2.3.4';

export interface LinkChord {
  name: string;
  notes: string;
}

export function encodeBuildrState(key: string, mode: string, availableModes: string[], chords: LinkChord[]): string {
  const k = toBase36Index(Math.max(0, AVAILABLE_KEYS.indexOf(key)));
  const m = toBase36Index(Math.max(0, availableModes.indexOf(mode)));

  const chordsStr = chords
    .map((c) => {
      const name = encodeChordName(c.name);
      const notes = encodeChordNotes(c.notes);
      if (!name || !notes) return '';
      return `${name}n${notes}`;
    })
    .filter(Boolean)
    .join(',');

  return `${VERSION}_${k}_${m}_${DEFAULT_PATTERN}_${DEFAULT_TIMING}_${DEFAULT_PIANO}_${chordsStr}`;
}

export function buildBuildrLink(
  baseUrl: string,
  key: string,
  mode: string,
  availableModes: string[],
  chords: LinkChord[],
): string {
  const state = encodeBuildrState(key, mode, availableModes, chords);
  const url = new URL(baseUrl);
  url.searchParams.set('s', state);
  return url.toString();
}
