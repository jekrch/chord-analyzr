import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, Play, Sparkles, Square } from 'lucide-react';
import type { ModeScaleChord, ProgressionStep } from '../api/types';
import type { GenerateOptions } from '../hooks/useProgressionBuilder';
import { Chip, Fader, Knob, NoteChips, Section, Segmented } from './controls';
import { pitchClass, SHARP_KEY_NAMES } from '../util/notes';

type MotionProfile = 'functional' | 'mediant' | 'stepwise' | 'static';

// The engine's flavor knobs. Core controls (length, variety, results, start
// chord) live in their own state — layers never touch them.
interface Knobs {
  rootWeight: number;
  slashWeight: number;
  motionProfile: MotionProfile;
  colorWeight: number;
  colorDevices: string[];
  extraNotes: string[];
  brightness: number;
  maxNotes: number;
  avoidNotes: string[];
  ending: string;
  loopWeight: number;
  pedalNote: string;
}

const DEFAULT_KNOBS: Knobs = {
  rootWeight: 0,
  slashWeight: 0,
  motionProfile: 'functional',
  colorWeight: 0,
  colorDevices: [],
  extraNotes: [],
  brightness: 0,
  maxNotes: 0,
  avoidNotes: [],
  ending: '',
  loopWeight: 0,
  pedalNote: '',
};

// Character layers replace the old one-shot recipes: each is a named mechanism
// the user can stack and dial. `contribute` returns this layer's push on the
// knobs at a given amount (0-1); the panel folds every active layer together
// (see composeKnobs) so several can sound at once. Tooltips carry the old
// recipe names as a hook so the flavor association isn't lost.
interface LayerCtx {
  tonic: string;
  leadingTone?: string;
}

interface Layer {
  id: string;
  name: string;
  tooltip: string;
  suggestedMode?: string;
  contribute: (ctx: LayerCtx, amount: number) => Partial<Knobs>;
}

const LAYERS: Layer[] = [
  {
    id: 'mediants',
    name: 'Chromatic mediants',
    tooltip:
      'Admits third-related chords from outside the scale and leans root motion toward thirds — the cinematic film-score chain (the old "Heroic"). Raises Color, adds the Mediant device, steers Root motion to Thirds.',
    suggestedMode: 'Lydian',
    contribute: (_ctx, a) => ({
      colorWeight: 2.5 * a,
      colorDevices: ['mediant'],
      motionProfile: 'mediant',
      rootWeight: 1 * a,
    }),
  },
  {
    id: 'bright',
    name: 'Bright lean',
    tooltip: 'Pulls chord choice to the sharp side of the circle of fifths — Lydian sparkle and lift. Raises Brightness.',
    suggestedMode: 'Lydian',
    contribute: (_ctx, a) => ({ brightness: 0.9 * a }),
  },
  {
    id: 'dark',
    name: 'Dark lean',
    tooltip:
      'Pulls chord choice to the flat side of the circle of fifths — shadowed, the old "Noir" mood. Lowers Brightness.',
    suggestedMode: 'Aeolian',
    contribute: (_ctx, a) => ({ brightness: -0.9 * a }),
  },
  {
    id: 'borrowed',
    name: 'Borrowed chords',
    tooltip:
      'Modal interchange from the parallel modes — bVI, bVII, iv and tritone subs borrowed into the key. Raises Color, adds the Borrowed and Tritone-sub devices.',
    contribute: (_ctx, a) => ({
      colorWeight: 2.5 * a,
      colorDevices: ['borrowed', 'tritone_sub'],
    }),
  },
  {
    id: 'secondary',
    name: 'Secondary dominants',
    tooltip:
      'Inserts dominants of scale degrees for extra cadential pull — the gospel/jazz turnaround sound. Raises Color and Drive, adds the Sec.-dom device.',
    contribute: (_ctx, a) => ({
      colorWeight: 2.5 * a,
      colorDevices: ['secondary_dominant'],
      rootWeight: 2 * a,
    }),
  },
  {
    id: 'walking-bass',
    name: 'Walking bass',
    tooltip:
      'Allows inversions (Cmaj7/E) and favors a smooth, singable bass line under the chords. Raises the Bass line knob.',
    contribute: (_ctx, a) => ({ slashWeight: 3 * a }),
  },
  {
    id: 'loop',
    name: 'Loop pull',
    tooltip:
      'Scores the wrap-around move back to the start so the progression cycles cleanly — vamps, ostinati, game loops. Raises Loop pull, opens the ending, caps chord size.',
    contribute: (_ctx, a) => ({
      loopWeight: 3 * a,
      ending: 'open',
      maxNotes: 4,
    }),
  },
  {
    id: 'drone',
    name: 'Drone & drift',
    tooltip:
      'Stepwise root motion over a sustained tonic pedal, leading tone avoided — hovering and ambient. Sets Root motion to Steps, adds a pedal note and an avoided leading tone.',
    contribute: (ctx) => ({
      motionProfile: 'stepwise',
      pedalNote: ctx.tonic,
      avoidNotes: ctx.leadingTone ? [ctx.leadingTone] : [],
    }),
  },
];

const LAYER_BY_ID = new Map(LAYERS.map((l) => [l.id, l]));

// How each field type folds when layers stack: weights sum (and clamp), lists
// union, single-valued fields go to the highest-amount claimant.
const NUMERIC_KEYS = ['rootWeight', 'slashWeight', 'colorWeight', 'brightness', 'loopWeight'] as const;
const LIST_KEYS = ['colorDevices', 'extraNotes', 'avoidNotes'] as const;
const CATEGORICAL_KEYS = ['motionProfile', 'ending', 'pedalNote', 'maxNotes'] as const;

const NUMERIC_RANGE: Record<(typeof NUMERIC_KEYS)[number], [number, number]> = {
  rootWeight: [0, 5],
  slashWeight: [0, 5],
  colorWeight: [0, 5],
  brightness: [-1, 1],
  loopWeight: [0, 5],
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface ActiveLayer {
  id: string;
  amount: number;
}

// Fold every active layer's contribution into one Knobs object, then let the
// user's hand-tweaks (overrides) win on top.
function composeKnobs(active: ActiveLayer[], overrides: Partial<Knobs>, ctx: LayerCtx): Knobs {
  const k: Knobs = { ...DEFAULT_KNOBS };
  const claimedAt: Partial<Record<(typeof CATEGORICAL_KEYS)[number], number>> = {};

  for (const { id, amount } of active) {
    const contribution = LAYER_BY_ID.get(id)?.contribute(ctx, amount);
    if (!contribution) continue;
    for (const key of NUMERIC_KEYS) {
      const v = contribution[key];
      if (typeof v === 'number') k[key] += v;
    }
    for (const key of LIST_KEYS) {
      const v = contribution[key];
      if (v && v.length) k[key] = [...new Set([...k[key], ...v])];
    }
    for (const key of CATEGORICAL_KEYS) {
      const v = contribution[key];
      // highest amount wins; >= lets a later, equally-dialed layer take it
      if (v !== undefined && (claimedAt[key] === undefined || amount >= claimedAt[key]!)) {
        (k[key] as Knobs[typeof key]) = v as never;
        claimedAt[key] = amount;
      }
    }
  }

  for (const key of NUMERIC_KEYS) {
    k[key] = clamp(k[key], NUMERIC_RANGE[key][0], NUMERIC_RANGE[key][1]);
  }
  return { ...k, ...overrides };
}

// Which override keys each collapsible section owns — for its Reset control and
// per-fader "modified" dots.
const SECTION_KEYS: Record<string, (keyof Knobs)[]> = {
  motion: ['rootWeight', 'slashWeight', 'motionProfile'],
  color: ['colorWeight', 'brightness', 'colorDevices', 'extraNotes'],
  texture: ['maxNotes', 'pedalNote', 'avoidNotes'],
  ending: ['ending', 'loopWeight'],
};

const MOTION_OPTIONS = [
  { value: 'functional' as const, label: 'Fifths', title: 'Purposeful, cadential pull — the ii–V–I sound' },
  { value: 'mediant' as const, label: 'Thirds', title: 'Third-related root moves — cinematic mediant chains' },
  { value: 'stepwise' as const, label: 'Steps', title: 'Half/whole-step root motion — planing, modal drift' },
  { value: 'static' as const, label: 'Static', title: 'Minimal root travel — hovering, ambient' },
];

const ENDING_OPTIONS = [
  { value: '', label: 'Free', title: 'No constraint on how it ends' },
  { value: 'authentic', label: 'Authentic', title: 'V then tonic — the classic full-stop resolution' },
  { value: 'plagal', label: 'Plagal', title: 'IV then tonic — the softer amen close' },
  { value: 'half', label: 'Half', title: 'Ends on the dominant — open, wants to continue' },
  { value: 'deceptive', label: 'Deceptive', title: 'Sets up resolution, then swerves to vi' },
  { value: 'open', label: 'Open', title: 'Ends anywhere but the tonic — floating' },
];

const MAX_NOTES_OPTIONS = [
  { value: '0', label: 'Off', title: 'No cap on chord size' },
  { value: '3', label: '3', title: 'Lean triads where possible' },
  { value: '4', label: '4', title: 'Punchier four-note chords' },
  { value: '5', label: '5', title: 'Allow five-note color' },
];

const COLOR_DEVICES = [
  { value: 'borrowed', label: 'Borrowed', title: 'Modal interchange from the parallel modes — bVI, bVII, iv' },
  { value: 'mediant', label: 'Mediant', title: 'Chromatic-mediant triad moves — the film-score chain' },
  { value: 'secondary_dominant', label: 'Sec. dom', title: 'Dominants of scale degrees — gospel/jazz pull' },
  { value: 'tritone_sub', label: 'Tritone sub', title: 'Dominant a tritone away — slinky chromatic bass' },
  { value: 'chromatic', label: 'Chromatic', title: 'Anything else outside the scale — raw color' },
];

// Newly-loaded layer starts at a moderate amount; the user dials from there.
const DEFAULT_LAYER_AMOUNT = 0.6;

// Normalize any spelling ("Bb") to the sharp names the note chips use ("A#").
const toSharpName = (note: string): string | undefined => {
  const pc = pitchClass(note);
  return pc === undefined ? undefined : SHARP_KEY_NAMES[pc];
};

interface GeneratePanelProps {
  chords: ModeScaleChord[];
  scaleNotes: string[];
  musicKey: string;
  mode: string;
  modeNames: string[];
  onModeChange: (mode: string) => void;
  generating: boolean;
  generateError: string | null;
  results: ProgressionStep[][];
  preferredStartChord?: string;
  onGenerate: (options: GenerateOptions) => void;
  onUseResult: (steps: ProgressionStep[]) => void;
  onPreview: (notes: string | null) => void;
  onPlayChord: (name: string) => void;
  onPlayResult: (steps: ProgressionStep[], index: number) => void;
  onStop: () => void;
  // sequence playback state: which result is playing, and on which step
  playing: { source: string; step: number } | null;
  notesForChord: (name: string) => string | null;
  resultLink: (steps: ProgressionStep[]) => string;
}

export default function GeneratePanel({
  chords,
  scaleNotes,
  musicKey,
  mode,
  modeNames,
  onModeChange,
  generating,
  generateError,
  results,
  preferredStartChord,
  onGenerate,
  onUseResult,
  onPreview,
  onPlayChord,
  onPlayResult,
  onStop,
  playing,
  notesForChord,
  resultLink,
}: GeneratePanelProps) {
  const [startChord, setStartChord] = useState('');
  // core (non-flavor) controls, independent of the character layers
  const [core, setCore] = useState({ length: 4, randomness: 0.2, resultCount: 3 });
  const [activeLayers, setActiveLayers] = useState<ActiveLayer[]>([]);
  const [overrides, setOverrides] = useState<Partial<Knobs>>({});
  const [pins, setPins] = useState<Record<number, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (preferredStartChord) {
      setStartChord(preferredStartChord);
    } else if (!startChord && chords.length > 0) {
      setStartChord(chords[0].chordName ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredStartChord, chords]);

  const scalePitchClasses = useMemo(() => {
    const set = new Set<number>();
    for (const note of scaleNotes) {
      const pc = pitchClass(note);
      if (pc !== undefined) set.add(pc);
    }
    return set;
  }, [scaleNotes]);

  const layerCtx = useMemo<LayerCtx>(() => {
    // leading tone: 7th degree of a 7-note scale, when there is one
    const leadingTone = scaleNotes.length === 7 ? toSharpName(scaleNotes[6]) : undefined;
    const tonic = toSharpName(musicKey) ?? musicKey;
    return { tonic, leadingTone };
  }, [scaleNotes, musicKey]);

  // Effective knobs: active layers folded together, then hand-tweaks on top.
  const knobs = useMemo(() => composeKnobs(activeLayers, overrides, layerCtx), [activeLayers, overrides, layerCtx]);

  const maxLength = knobs.colorWeight > 0 ? 12 : 8;
  const length = Math.min(core.length, maxLength);

  const isLayerActive = (id: string) => activeLayers.some((l) => l.id === id);
  const layerAmount = (id: string) => activeLayers.find((l) => l.id === id)?.amount ?? 0;

  // Open the sections a layer drives, so its effect is visible when loaded.
  const revealLayerSections = (id: string) => {
    const c = LAYER_BY_ID.get(id)?.contribute(layerCtx, 1);
    if (!c) return;
    const touches = (keys: (keyof Knobs)[]) => keys.some((k) => c[k] !== undefined);
    setOpenSections((prev) => ({
      ...prev,
      motion: prev.motion || touches(SECTION_KEYS.motion),
      color: prev.color || touches(SECTION_KEYS.color),
      texture: prev.texture || touches(SECTION_KEYS.texture),
      ending: prev.ending || touches(SECTION_KEYS.ending),
    }));
  };

  const toggleLayer = (id: string) => {
    if (isLayerActive(id)) {
      setActiveLayers((prev) => prev.filter((l) => l.id !== id));
    } else {
      setActiveLayers((prev) => [...prev, { id, amount: DEFAULT_LAYER_AMOUNT }]);
      revealLayerSections(id);
    }
  };

  const setLayerAmount = (id: string, amount: number) => {
    setActiveLayers((prev) => {
      // dialing a not-yet-loaded layer loads it
      if (!prev.some((l) => l.id === id)) {
        revealLayerSections(id);
        return [...prev, { id, amount }];
      }
      return prev.map((l) => (l.id === id ? { ...l, amount } : l));
    });
  };

  const clearAll = () => {
    setActiveLayers([]);
    setOverrides({});
  };

  // Any hand-tweak in a section sets an override that wins over the layers.
  const setOverride = (patch: Partial<Knobs>) => setOverrides((prev) => ({ ...prev, ...patch }));
  const resetSection = (section: string) =>
    setOverrides((prev) => {
      const next = { ...prev };
      for (const key of SECTION_KEYS[section]) delete next[key];
      return next;
    });
  const isOverridden = (key: keyof Knobs) => key in overrides;
  const sectionOverridden = (section: string) => SECTION_KEYS[section].some((k) => k in overrides);

  const toggleSection = (name: string) => setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));

  const toggleDevice = (device: string) => {
    const active = knobs.colorDevices.includes(device);
    const patch: Partial<Knobs> = {
      colorDevices: active ? knobs.colorDevices.filter((d) => d !== device) : [...knobs.colorDevices, device],
    };
    // picking a device is asking for color: switch it on if it's off
    if (knobs.colorWeight === 0 && !active) patch.colorWeight = 1.5;
    setOverride(patch);
  };

  const setPin = (step: number, chord: string) => {
    setPins((prev) => {
      const next = { ...prev };
      if (chord) next[step] = chord;
      else delete next[step];
      return next;
    });
  };

  // Most-recently-loaded layer that wants a mode the user isn't in.
  const suggestedMode = useMemo(() => {
    for (let i = activeLayers.length - 1; i >= 0; i--) {
      const layer = LAYER_BY_ID.get(activeLayers[i].id);
      if (layer?.suggestedMode && layer.suggestedMode !== mode && modeNames.includes(layer.suggestedMode)) {
        return { name: layer.suggestedMode, layerName: layer.name };
      }
    }
    return null;
  }, [activeLayers, mode, modeNames]);

  const handleGenerate = () => {
    const pinned = Object.entries(pins)
      .filter(([step, chord]) => Number(step) <= length && chord)
      .map(([step, chord]) => `${chord}@${step}`);
    onGenerate({
      startChord,
      length,
      randomness: core.randomness,
      resultCount: core.resultCount,
      rootWeight: knobs.rootWeight,
      slashWeight: knobs.slashWeight,
      motionProfile: knobs.motionProfile === 'functional' ? undefined : knobs.motionProfile,
      colorWeight: knobs.colorWeight,
      colorDevices: knobs.colorWeight > 0 ? knobs.colorDevices : [],
      extraNotes: knobs.extraNotes,
      brightness: knobs.brightness,
      maxNotes: knobs.maxNotes,
      avoidNotes: knobs.avoidNotes,
      ending: knobs.ending || undefined,
      loopWeight: knobs.loopWeight,
      pedalNote: knobs.pedalNote || undefined,
      pinned: pinned.length > 0 ? pinned : undefined,
    });
  };

  const previewChordNotes = (name: string) => onPreview(notesForChord(name));

  const motionActive = knobs.rootWeight > 0 || knobs.slashWeight > 0 || knobs.motionProfile !== 'functional';
  const colorActive = knobs.colorWeight > 0 || knobs.extraNotes.length > 0 || knobs.brightness !== 0;
  const textureActive = knobs.maxNotes > 0 || knobs.avoidNotes.length > 0 || knobs.pedalNote !== '';
  const endingActive = knobs.ending !== '' || knobs.loopWeight > 0;
  const pinsActive = Object.keys(pins).some((step) => Number(step) <= length && pins[Number(step)]);

  const hasState = activeLayers.length > 0 || Object.keys(overrides).length > 0;
  const canGenerate = startChord !== '' && !generating;

  return (
    <div className="pb-panel overflow-hidden">
      <div className="pb-panel-header">
        <span className="pb-panel-title">Progression engine</span>
        <span className="flex items-center gap-1.5">
          <span className={`pb-led ${generating ? 'pb-led--busy' : 'pb-led--off'}`} />
          <span className="pb-label">{generating ? 'searching' : 'ready'}</span>
        </span>
      </div>

      {/* Character layers */}
      <div className="flex flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between">
          <span className="pb-label" title="Stackable character layers — load as many as you like and dial each to taste">
            Character layers
          </span>
          {hasState && (
            <button
              type="button"
              className="pb-section-reset !px-0"
              onClick={clearAll}
              title="Turn every layer off and drop all tweaks"
            >
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {LAYERS.map((layer) => {
            const active = isLayerActive(layer.id);
            return (
              <div key={layer.id} className={`pb-layer ${active ? 'pb-layer--active' : ''}`} title={layer.tooltip}>
                <button type="button" className="pb-layer-toggle" aria-pressed={active} onClick={() => toggleLayer(layer.id)}>
                  <span className={`pb-led ${active ? '' : 'pb-led--off'}`} />
                  <span className="pb-layer-name truncate">{layer.name}</span>
                </button>
                <Knob
                  value={layerAmount(layer.id)}
                  onChange={(v) => setLayerAmount(layer.id, v)}
                  active={active}
                  ariaLabel={`${layer.name} amount`}
                  title={layer.tooltip}
                />
              </div>
            );
          })}
        </div>
        {activeLayers.length === 0 && (
          <p className="text-[11px] text-[var(--pb-text-tertiary)]">
            No layers — pure voice leading, the engine at rest. Stack layers and turn each knob to taste.
          </p>
        )}
        {suggestedMode && (
          <div className="pb-inset flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--pb-text-secondary)]">
            <span className="min-w-0 flex-1 truncate">
              {suggestedMode.layerName} sings in {suggestedMode.name}
            </span>
            <button type="button" className="pb-btn !px-2 !py-0.5 text-[10px]" onClick={() => onModeChange(suggestedMode.name)}>
              <ArrowRight size={11} /> Switch mode
            </button>
          </div>
        )}

        {/* Core controls */}
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-3">
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="pb-label">Start chord</span>
            <select value={startChord} onChange={(e) => setStartChord(e.target.value)} className="pb-select">
              {chords.length === 0 && <option value="">—</option>}
              {chords.map((c) => (
                <option key={`${c.chordTypeId}-${c.chordNote}`} value={c.chordName ?? ''}>
                  {c.chordName}
                </option>
              ))}
            </select>
          </label>
          <Fader
            label="Length"
            value={length}
            min={2}
            max={maxLength}
            step={1}
            onChange={(v) => setCore((c) => ({ ...c, length: v }))}
            title={knobs.colorWeight > 0 ? 'Up to 12 chords while color is on' : 'Up to 8 chords; color unlocks 12'}
          />
          <Fader
            label="Variety"
            value={core.randomness}
            min={0}
            max={1}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => setCore((c) => ({ ...c, randomness: v }))}
            title="Each run picks a different near-smoothest progression; 0 is deterministic"
          />
          <Fader
            label="Results"
            value={core.resultCount}
            min={1}
            max={10}
            step={1}
            onChange={(v) => setCore((c) => ({ ...c, resultCount: v }))}
            title="Alternative progressions to compare, best first"
          />
        </div>
      </div>

      {/* Flavor sections — each shows the effective (layer + tweak) value, and a
          Reset once you hand-tweak anything inside it. */}
      <Section
        title="Motion &amp; bass"
        hint="how the roots move, whether the bass walks"
        active={motionActive}
        open={Boolean(openSections.motion)}
        onToggle={() => toggleSection('motion')}
        onReset={sectionOverridden('motion') ? () => resetSection('motion') : undefined}
      >
        <div className="flex flex-col gap-1.5">
          <span className="pb-label">
            Root motion
            {isOverridden('motionProfile') && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
          </span>
          <Segmented options={MOTION_OPTIONS} value={knobs.motionProfile} onChange={(v) => setOverride({ motionProfile: v })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Fader
            label="Drive"
            value={knobs.rootWeight}
            min={0}
            max={5}
            step={0.5}
            modified={isOverridden('rootWeight')}
            onChange={(v) => setOverride({ rootWeight: v })}
            title="Higher = more purposeful, cadential motion in the chosen root-motion flavor"
          />
          <Fader
            label="Bass line"
            value={knobs.slashWeight}
            min={0}
            max={5}
            step={0.5}
            modified={isOverridden('slashWeight')}
            onChange={(v) => setOverride({ slashWeight: v })}
            title="Above 0 allows inversions (Cmaj7/E) and favors a smooth, singable bass"
          />
        </div>
      </Section>

      <Section
        title="Color"
        hint="borrow from outside the scale"
        active={colorActive}
        open={Boolean(openSections.color)}
        onToggle={() => toggleSection('color')}
        onReset={sectionOverridden('color') ? () => resetSection('color') : undefined}
      >
        <div className="grid grid-cols-2 gap-4">
          <Fader
            label="Color"
            value={knobs.colorWeight}
            min={0}
            max={5}
            step={0.5}
            modified={isOverridden('colorWeight')}
            onChange={(v) => setOverride({ colorWeight: v })}
            title="Above 0 admits chords rooted outside the scale — bVI, bVII, mediants; 1 is gentle, 3 is bold"
          />
          <Fader
            label="Brightness"
            value={knobs.brightness}
            min={-1}
            max={1}
            step={0.1}
            format={(v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1))}
            modified={isOverridden('brightness')}
            onChange={(v) => setOverride({ brightness: v })}
            title="Circle-of-fifths lean: + is Lydian sparkle, − is flat-side darkness"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="pb-label" title="Which harmonic devices borrowed chords may use; none selected = all allowed">
            Devices{' '}
            {isOverridden('colorDevices') && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
            {knobs.colorWeight === 0 && <span className="normal-case tracking-normal">(picking one turns color on)</span>}
          </span>
          <div className="flex flex-wrap gap-1">
            {COLOR_DEVICES.map((device) => (
              <Chip
                key={device.value}
                label={device.label}
                active={knobs.colorDevices.includes(device.value)}
                onToggle={() => toggleDevice(device.value)}
                title={device.title}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="pb-label" title="Non-scale tones that scale-rooted chords may borrow — secondary-dominant and borrowed-chord flavor">
            Extra notes
            {isOverridden('extraNotes') && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
          </span>
          <NoteChips
            selected={knobs.extraNotes}
            onChange={(notes) => setOverride({ extraNotes: notes })}
            scalePitchClasses={scalePitchClasses}
            scaleNotes="exclude"
          />
        </div>
      </Section>

      <Section
        title="Texture"
        hint="lean chords, banned notes, a drone"
        active={textureActive}
        open={Boolean(openSections.texture)}
        onToggle={() => toggleSection('texture')}
        onReset={sectionOverridden('texture') ? () => resetSection('texture') : undefined}
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="pb-label" title="Soft cap on chord size — leaner, punchier chords">
              Max notes
              {isOverridden('maxNotes') && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
            </span>
            <Segmented
              options={MAX_NOTES_OPTIONS}
              value={String(knobs.maxNotes) as '0' | '3' | '4' | '5'}
              onChange={(v) => setOverride({ maxNotes: Number(v) })}
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="pb-label" title="A note every chord must contain — a drone under the whole progression">
              Pedal note
              {isOverridden('pedalNote') && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
            </span>
            <select value={knobs.pedalNote} onChange={(e) => setOverride({ pedalNote: e.target.value })} className="pb-select">
              <option value="">None</option>
              {SHARP_KEY_NAMES.map((note, pc) => (
                <option key={note} value={note}>
                  {note}
                  {scalePitchClasses.has(pc) ? ' ·' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <span
            className="pb-label"
            title="Notes no free chord may contain — avoid the leading tone for modal purity, the 3rd for suspended ambiguity, 4 and 7 for pentatonic shimmer"
          >
            Avoid notes
            {isOverridden('avoidNotes') && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
          </span>
          <NoteChips
            selected={knobs.avoidNotes}
            onChange={(notes) => setOverride({ avoidNotes: notes })}
            scalePitchClasses={scalePitchClasses}
          />
        </div>
      </Section>

      <Section
        title="Ending &amp; loop"
        hint="how it closes, whether it cycles"
        active={endingActive}
        open={Boolean(openSections.ending)}
        onToggle={() => toggleSection('ending')}
        onReset={sectionOverridden('ending') ? () => resetSection('ending') : undefined}
      >
        <div className="flex flex-col gap-1.5">
          <span className="pb-label">
            Cadence
            {isOverridden('ending') && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
          </span>
          <Segmented options={ENDING_OPTIONS} value={knobs.ending} onChange={(v) => setOverride({ ending: v })} />
        </div>
        <Fader
          label="Loop pull"
          value={knobs.loopWeight}
          min={0}
          max={5}
          step={0.5}
          modified={isOverridden('loopWeight')}
          onChange={(v) => setOverride({ loopWeight: v })}
          title="Above 0 favors progressions that cycle smoothly back to the start — vamps, ostinati, game loops"
        />
      </Section>

      <Section
        title="Pins"
        hint="fix a chord at a step, the engine fills the rest"
        active={pinsActive}
        open={Boolean(openSections.pins)}
        onToggle={() => toggleSection('pins')}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="pb-label">1</span>
            <select className="pb-select" value={startChord} disabled>
              <option>{startChord || '—'}</option>
            </select>
          </label>
          {Array.from({ length: length - 1 }, (_, i) => i + 2).map((step) => (
            <label key={step} className="flex flex-col gap-1">
              <span className="pb-label">{step}</span>
              <select className="pb-select" value={pins[step] ?? ''} onChange={(e) => setPin(step, e.target.value)}>
                <option value="">free</option>
                {chords.map((c) => (
                  <option key={`${c.chordTypeId}-${c.chordNote}`} value={c.chordName ?? ''}>
                    {c.chordName}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Section>

      {/* Generate + results */}
      <div className="flex flex-col gap-3 border-t border-[var(--pb-border)] p-3.5">
        <button type="button" disabled={!canGenerate} onClick={handleGenerate} className="pb-btn pb-btn--accent pb-btn--transport">
          <Sparkles size={14} /> {generating ? 'Searching…' : 'Generate'}
        </button>

        {generateError && <p className="text-xs text-[var(--pb-danger)]">{generateError}</p>}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((steps, i) => {
              const link = resultLink(steps);
              const isPlayingThis = playing?.source === `result-${i}`;
              return (
                <div key={i} className="pb-inset flex flex-col gap-1.5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="pb-label text-[var(--pb-text-tertiary)]">#{i + 1}</span>
                    <span className="pb-readout" title="Total voice-leading cost — lower is smoother">
                      cost {steps[steps.length - 1]?.totalCost ?? 0}
                    </span>
                    <span className="flex-1" />
                    {isPlayingThis ? (
                      <button type="button" onClick={onStop} className="pb-btn pb-btn--stop !px-2 !py-0.5 text-[10px]" title="Stop">
                        <Square size={11} /> Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPlayResult(steps, i)}
                        className="pb-btn pb-btn--play !px-2 !py-0.5 text-[10px]"
                        title="Play this progression"
                      >
                        <Play size={11} /> Play
                      </button>
                    )}
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer" className="pb-btn !px-2 !py-0.5 text-[10px]" title="Open in modal chord buildr">
                        <ExternalLink size={11} /> Open
                      </a>
                    )}
                    <button type="button" onClick={() => onUseResult(steps)} className="pb-btn !px-2 !py-0.5 text-[10px]" title="Replace the progression with this result">
                      Use
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 font-mono text-xs">
                    {steps.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onPlayChord(s.chord)}
                        onMouseEnter={() => previewChordNotes(s.chord)}
                        onMouseLeave={() => onPreview(null)}
                        title={`${notesForChord(s.chord) ?? s.chord} — click to play`}
                        className="flex cursor-pointer items-center gap-1"
                      >
                        {idx > 0 && (
                          <span className="text-[9px] text-[var(--pb-text-tertiary)]" title="Voice-leading distance from the previous chord">
                            {s.vlFromPrev}
                          </span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 transition-colors ${
                            isPlayingThis && playing?.step === idx
                              ? 'bg-[var(--pb-accent)] text-[var(--pb-accent-contrast)]'
                              : 'bg-[var(--pb-bg-hover)] hover:text-[var(--pb-accent-text)]'
                          }`}
                        >
                          {s.chord}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
