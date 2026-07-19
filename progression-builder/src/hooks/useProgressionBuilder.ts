import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchChords, fetchModes, fetchScaleNotes, fetchSmoothProgression } from '../api/client';
import type { Mode, ModeScaleChord, ProgressionStep, SmoothProgressionParams } from '../api/types';
import { buildBuildrLink } from '../link/buildrLink';
import { chordBaseName, deriveChordNotes, shiftVoicing } from '../util/chordNotes';
import { pitchClass } from '../util/notes';

const BUILDR_URL = import.meta.env.VITE_BUILDR_URL || 'https://modal.chordbuildr.com';
const DEFAULT_KEY = 'C';

export interface ProgressionChord {
  id: string;
  name: string;
  notes: string;
}

export interface SwapOption {
  name: string;
  notes: string;
}

// The open swap panel for one progression slot: engine-suggested
// alternatives for that step, with everything else held in place.
export interface SwapState {
  id: string;
  loading: boolean;
  error: string | null;
  options: SwapOption[];
  // false when a reroll turned up nothing that wasn't already listed
  foundNew: boolean;
}

// With every other slot pinned, one fetch already enumerates most chords
// that fit — so a plain refetch returns the same set. Each reroll instead
// cycles through these lenses, changing which chords are in the pool at all.
const SWAP_VARIATIONS: Partial<SmoothProgressionParams>[] = [
  {},
  { colorWeight: 1.5 },
  { slashWeight: 1.5 },
  { colorWeight: 2, brightness: 0.6 },
  { colorWeight: 2, brightness: -0.6 },
  { colorWeight: 1.5, slashWeight: 1.5 },
  { motionProfile: 'mediant', colorWeight: 1.5 },
  { motionProfile: 'stepwise' },
];

const MAX_SWAP_OPTIONS = 18;
// every reroll should hand back at least this many chords not seen before
const MIN_FRESH_OPTIONS = 5;

const pcSet = (notes: string): number[] => [
  ...new Set(
    notes
      .split(/[\s,]+/)
      .map((n) => pitchClass(n))
      .filter((p): p is number => p !== undefined),
  ),
];

// How far apart two chords are, as total semitone travel between their
// pitch-class sets — a rough client-side stand-in for the engine's
// voice-leading cost, used to rank fallback options smoothest-first.
const chordDistance = (a: number[], b: number[]): number => {
  let total = 0;
  for (const pa of a) {
    let best = 6;
    for (const pb of b) {
      const d = Math.abs(pa - pb) % 12;
      best = Math.min(best, Math.min(d, 12 - d));
    }
    total += best;
  }
  for (const pb of b) {
    let best = 6;
    for (const pa of a) {
      const d = Math.abs(pa - pb) % 12;
      best = Math.min(best, Math.min(d, 12 - d));
    }
    total += best;
  }
  return total;
};

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Everything the generate panel can ask for; mirrors SmoothProgressionParams
// minus key/mode (which come from app state) plus pedalNote, which is
// client-side sugar expanded to required notes, same as the MCP layer does.
export interface GenerateOptions {
  startChord: string;
  length: number;
  randomness: number;
  resultCount: number;
  rootWeight?: number;
  slashWeight?: number;
  motionProfile?: string;
  colorWeight?: number;
  colorDevices?: string[];
  extraNotes?: string[];
  brightness?: number;
  maxNotes?: number;
  avoidNotes?: string[];
  ending?: string;
  loopWeight?: number;
  pinned?: string[];
  pedalNote?: string;
}

export function useProgressionBuilder() {
  const [modes, setModes] = useState<Mode[]>([]);
  const [modesError, setModesError] = useState<string | null>(null);

  const [key, setKey] = useState(DEFAULT_KEY);
  const [mode, setMode] = useState('');

  const [chords, setChords] = useState<ModeScaleChord[]>([]);
  const [chordsLoading, setChordsLoading] = useState(false);
  const [chordsError, setChordsError] = useState<string | null>(null);

  const [scaleNotes, setScaleNotes] = useState<string[]>([]);

  const [progression, setProgression] = useState<ProgressionChord[]>([]);
  const [previewChord, setPreviewChord] = useState<ModeScaleChord | null>(null);

  const [swap, setSwap] = useState<SwapState | null>(null);
  // bumps on every open/close so a stale fetch can't overwrite a newer panel
  const swapSeq = useRef(0);
  // which SWAP_VARIATIONS lens the next reroll uses
  const swapRoll = useRef(0);

  const [results, setResults] = useState<ProgressionStep[][]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Load the mode list once; default to Ionian, falling back to the first mode.
  useEffect(() => {
    fetchModes()
      .then((m) => {
        setModes(m);
        const ionian = m.find((mode) => mode.name === 'Ionian');
        setMode((current) => current || ionian?.name || m[0]?.name || '');
      })
      .catch((err) => setModesError(err instanceof Error ? err.message : String(err)));
  }, []);

  // Reload chords and scale notes whenever the key or mode changes.
  useEffect(() => {
    if (!key || !mode) return;
    let cancelled = false;
    setChordsLoading(true);
    setChordsError(null);
    // any open swap panel's suggestions belong to the old key/mode
    swapSeq.current++;
    setSwap(null);
    fetchChords(key, mode)
      .then((c) => {
        if (!cancelled) setChords(c);
      })
      .catch((err) => {
        if (!cancelled) setChordsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setChordsLoading(false);
      });
    fetchScaleNotes(key, mode)
      .then((notes) => {
        // The API repeats the tonic as the octave note; drop it.
        const names = notes.map((n) => n.noteName.trim());
        if (names.length > 1 && names[names.length - 1] === names[0]) names.pop();
        if (!cancelled) setScaleNotes(names);
      })
      .catch(() => {
        if (!cancelled) setScaleNotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [key, mode]);

  const chordByName = useMemo(() => {
    const map = new Map<string, ModeScaleChord>();
    for (const c of chords) {
      if (c.chordName) map.set(c.chordName, c);
    }
    return map;
  }, [chords]);

  const addChord = useCallback((chord: ModeScaleChord) => {
    if (!chord.chordName || !chord.chordNoteNames) return;
    setProgression((prev) => [...prev, { id: makeId(), name: chord.chordName!, notes: chord.chordNoteNames! }]);
  }, []);

  const removeChord = useCallback((id: string) => {
    setProgression((prev) => prev.filter((c) => c.id !== id));
    setSwap((s) => {
      if (s?.id !== id) return s;
      swapSeq.current++;
      return null;
    });
  }, []);

  const moveChord = useCallback((id: string, direction: -1 | 1) => {
    setProgression((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  // Rotate one chord's voicing up or down a chord tone (see shiftVoicing).
  // Returns the new notes so the caller can sound the changed voicing.
  const shiftChord = useCallback(
    (id: string, direction: -1 | 1): string | null => {
      const chord = progression.find((c) => c.id === id);
      if (!chord) return null;
      const shifted = shiftVoicing(chord.name, chord.notes, direction);
      if (!shifted) return null;
      setProgression((prev) => prev.map((c) => (c.id === id ? { ...c, ...shifted } : c)));
      return shifted.notes;
    },
    [progression],
  );

  const clearProgression = useCallback(() => {
    setProgression([]);
    setResults([]);
    swapSeq.current++;
    setSwap(null);
  }, []);

  const generate = useCallback(
    async (options: GenerateOptions) => {
      setGenerating(true);
      setGenerateError(null);
      try {
        // pedalNote is sugar: "every chord contains X" is a required note at
        // every step after the first.
        const required: string[] = [];
        if (options.pedalNote) {
          for (let step = 2; step <= options.length; step++) {
            required.push(`${options.pedalNote}@${step}`);
          }
        }
        const steps = await fetchSmoothProgression({
          key,
          mode,
          startChord: options.startChord,
          length: options.length,
          randomness: options.randomness,
          resultCount: options.resultCount,
          rootWeight: options.rootWeight,
          slashWeight: options.slashWeight,
          motionProfile: options.motionProfile,
          colorWeight: options.colorWeight,
          colorDevices: options.colorDevices,
          extraNotes: options.extraNotes,
          brightness: options.brightness,
          maxNotes: options.maxNotes,
          avoidNotes: options.avoidNotes,
          ending: options.ending,
          loopWeight: options.loopWeight,
          pinned: options.pinned,
          required: required.length > 0 ? required : undefined,
        });
        const byProgression = new Map<number, ProgressionStep[]>();
        for (const step of steps) {
          const list = byProgression.get(step.progressionId) ?? [];
          list.push(step);
          byProgression.set(step.progressionId, list);
        }
        const grouped = [...byProgression.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, list]) => list.sort((a, b) => a.step - b.step));
        // the engine answers an impossible request (unknown start chord,
        // unsatisfiable constraints) with an empty result, not an error
        if (grouped.length === 0) {
          setGenerateError('No progression found — try another start chord or loosen the constraints.');
        }
        setResults(grouped);
      } catch (err) {
        setGenerateError(err instanceof Error ? err.message : String(err));
      } finally {
        setGenerating(false);
      }
    },
    [key, mode],
  );

  // Notes for any generated chord name: the diatonic list first, then derived
  // from the name — slash voicings and borrowed-root chords aren't in the list.
  const notesForChord = useCallback(
    (name: string): string | null => chordByName.get(name)?.chordNoteNames ?? deriveChordNotes(name),
    [chordByName],
  );

  const replaceChord = useCallback(
    (id: string, name: string) => {
      const notes = notesForChord(name);
      if (!notes) return;
      setProgression((prev) => prev.map((c) => (c.id === id ? { ...c, name, notes } : c)));
    },
    [notesForChord],
  );

  // Open (or reroll) the swap panel for one slot: pin every other chord and
  // ask the engine for alternatives at that step. A reroll keeps what's
  // already listed and hunts for new options through the next variation lens.
  const openSwap = useCallback(
    async (id: string) => {
      const index = progression.findIndex((c) => c.id === id);
      if (index === -1) return;
      const seq = ++swapSeq.current;

      const isReroll = swap?.id === id;
      const prevOptions = isReroll ? swap.options : [];
      swapRoll.current = isReroll ? swapRoll.current + 1 : 0;
      const variation = SWAP_VARIATIONS[swapRoll.current % SWAP_VARIATIONS.length];

      // Top-up pool: every chord in the key not yet offered, ranked by how
      // smoothly it sits between the slot's neighbors. Each reroll digs
      // further down this list, trading smoothness for novelty, so a reroll
      // always brings something new until the key runs dry.
      const localCandidates = (known: Set<string>): SwapOption[] => {
        const before = progression[index - 1];
        const after = progression[index + 1];
        const beforePcs = before ? pcSet(before.notes) : null;
        const afterPcs = after ? pcSet(after.notes) : null;
        return chords
          .filter(
            (c) =>
              c.chordName &&
              c.chordNoteNames &&
              !known.has(c.chordName) &&
              c.chordName !== before?.name &&
              c.chordName !== after?.name,
          )
          .map((c) => {
            const pcs = pcSet(c.chordNoteNames!);
            const cost =
              (beforePcs ? chordDistance(pcs, beforePcs) : 0) + (afterPcs ? chordDistance(pcs, afterPcs) : 0);
            return { name: c.chordName!, notes: c.chordNoteNames!, cost };
          })
          .sort((a, b) => a.cost - b.cost)
          .map(({ name, notes }) => ({ name, notes }));
      };

      // the engine's start chord is fixed, so step 1 (and a one-chord
      // progression) suggests purely from the local ranked pool
      if (index === 0 || progression.length < 2) {
        const known = new Set([progression[index].name, ...prevOptions.map((o) => o.name)]);
        const fresh = localCandidates(known).slice(0, MIN_FRESH_OPTIONS);
        setSwap({
          id,
          loading: false,
          error: null,
          options: [...fresh, ...prevOptions].slice(0, MAX_SWAP_OPTIONS),
          foundNew: fresh.length > 0,
        });
        return;
      }

      setSwap({ id, loading: true, error: null, options: prevOptions, foundNew: true });
      try {
        // The engine only knows base chord names, so slash voicings (engine
        // suggestions or user voicing shifts) are pinned by their base chord.
        const pinned = progression
          .map((c, i) => ({ name: chordBaseName(c.name), step: i + 1 }))
          .filter((p) => p.step !== 1 && p.step !== index + 1)
          .map((p) => `${p.name}@${p.step}`);
        // if the progression already uses borrowed or slash chords, let the
        // suggestions use them too; color also unlocks lengths past 8
        const hasSlash = progression.some((c) => c.name.includes('/'));
        const hasBorrowed = progression.some((c) => !chordByName.has(c.name.split('/')[0].trim()));
        const steps = await fetchSmoothProgression({
          key,
          mode,
          startChord: chordBaseName(progression[0].name),
          length: progression.length,
          randomness: isReroll ? 0.9 : 0.6,
          resultCount: 10,
          pinned: pinned.length > 0 ? pinned : undefined,
          colorWeight: hasBorrowed || progression.length > 8 ? 1.5 : undefined,
          slashWeight: hasSlash ? 1 : undefined,
          ...variation,
        });
        const current = progression[index].name;
        const known = new Set([current, ...prevOptions.map((o) => o.name)]);
        const fresh: SwapOption[] = [];
        for (const step of steps) {
          if (step.step !== index + 1 || known.has(step.chord)) continue;
          known.add(step.chord);
          const notes = notesForChord(step.chord);
          if (notes) fresh.push({ name: step.chord, notes });
        }
        // when the engine's pool is tapped out, top up with progressively
        // less smooth chords from the key
        for (const candidate of localCandidates(known)) {
          if (fresh.length >= MIN_FRESH_OPTIONS) break;
          known.add(candidate.name);
          fresh.push(candidate);
        }
        if (swapSeq.current === seq) {
          setSwap({
            id,
            loading: false,
            error: null,
            options: [...fresh, ...prevOptions].slice(0, MAX_SWAP_OPTIONS),
            foundNew: !isReroll || fresh.length > 0,
          });
        }
      } catch (err) {
        // the engine is unreachable or refused — fall back to key chords
        // ranked by fit, so the panel still offers something
        if (swapSeq.current === seq) {
          const known = new Set([progression[index].name, ...prevOptions.map((o) => o.name)]);
          const fresh = localCandidates(known).slice(0, MIN_FRESH_OPTIONS);
          setSwap({
            id,
            loading: false,
            error: fresh.length > 0 ? null : err instanceof Error ? err.message : String(err),
            options: [...fresh, ...prevOptions].slice(0, MAX_SWAP_OPTIONS),
            foundNew: fresh.length > 0,
          });
        }
      }
    },
    [progression, key, mode, chords, chordByName, notesForChord, swap],
  );

  const closeSwap = useCallback(() => {
    swapSeq.current++;
    setSwap(null);
  }, []);

  const useResult = useCallback(
    (resultChords: ProgressionStep[]) => {
      const next: ProgressionChord[] = [];
      for (const step of resultChords) {
        const notes = notesForChord(step.chord);
        if (notes) {
          next.push({ id: makeId(), name: step.chord, notes });
        }
      }
      setProgression(next);
      setResults([]);
      swapSeq.current++;
      setSwap(null);
    },
    [notesForChord],
  );

  const modeNames = useMemo(() => modes.map((m) => m.name), [modes]);

  const buildrLink = useMemo(() => {
    if (!mode || progression.length === 0) return '';
    return buildBuildrLink(
      BUILDR_URL,
      key,
      mode,
      modeNames,
      progression.map((c) => ({ name: c.name, notes: c.notes })),
    );
  }, [key, mode, modeNames, progression]);

  // A shareable link for one generated result, without adopting it first.
  const resultLink = useCallback(
    (steps: ProgressionStep[]): string => {
      if (!mode) return '';
      const linkChords = [];
      for (const step of steps) {
        const notes = notesForChord(step.chord);
        if (notes) linkChords.push({ name: step.chord, notes });
      }
      if (linkChords.length === 0) return '';
      return buildBuildrLink(BUILDR_URL, key, mode, modeNames, linkChords);
    },
    [key, mode, modeNames, notesForChord],
  );

  return {
    modes,
    modesError,
    key,
    setKey,
    mode,
    setMode,
    chords,
    chordsLoading,
    chordsError,
    scaleNotes,
    progression,
    addChord,
    removeChord,
    moveChord,
    shiftChord,
    replaceChord,
    clearProgression,
    swap,
    openSwap,
    closeSwap,
    previewChord,
    setPreviewChord,
    results,
    generating,
    generateError,
    generate,
    useResult,
    notesForChord,
    buildrLink,
    resultLink,
  };
}

export type ProgressionBuilderState = ReturnType<typeof useProgressionBuilder>;
