// Small shared controls for the generate panel, styled after the main app's
// studio-rack language: faders with filled tracks, rotary knobs, switch-pill
// chips with LED dots, and collapsible sections that light up when in use.
import { useId, useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  // format the readout; defaults to the raw number
  format?: (value: number) => string;
  title?: string;
  // amber dot on the label: this field has been hand-tweaked off its layer value
  modified?: boolean;
}

export function Fader({ label, value, min, max, step, onChange, format, title, modified }: FaderProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <label className="flex min-w-0 flex-col gap-1.5" title={title}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="pb-label truncate">
          {label}
          {modified && <span className="pb-mod-dot" title="Hand-tweaked off the layer value" />}
        </span>
        <span className="pb-readout">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pb-fader"
        style={{
          background: `linear-gradient(to right, var(--pb-accent) ${pct}%, var(--pb-bg-inset) ${pct}%)`,
        }}
      />
    </label>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Polar point on a circle where 0deg points up and angle grows clockwise.
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

// SVG arc path from angle a0 to a1 (degrees, clockwise), both in [-135, 135].
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const start = polar(cx, cy, r, a0);
  const end = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
};

const KNOB_SWEEP = 135; // dial travels from -135deg to +135deg, a 270deg arc

interface KnobProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  // active dials show the accent fill + a percentage readout; inactive are dim
  active?: boolean;
  disabled?: boolean;
  size?: number;
  title?: string;
  ariaLabel?: string;
}

// Rotary knob: drag vertically, scroll, or arrow-key to turn. The fill arc and
// pointer are SVG; 0deg is up, the gap sits at the bottom.
export function Knob({ value, min = 0, max = 1, onChange, active, disabled, size = 34, title, ariaLabel }: KnobProps) {
  const drag = useRef<{ startY: number; startVal: number } | null>(null);
  const pct = max === min ? 0 : (value - min) / (max - min);
  const angle = -KNOB_SWEEP + pct * 2 * KNOB_SWEEP;
  const tip = polar(20, 20, 15, angle);
  const step = (max - min) * 0.05;

  const set = (v: number) => onChange(clamp(v, min, max));

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startY: e.clientY, startVal: value };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    // a full knob sweep spans ~180px of vertical travel
    const dy = drag.current.startY - e.clientY;
    set(drag.current.startVal + (dy / 180) * (max - min));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') set(value + step);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') set(value - step);
    else if (e.key === 'Home') set(min);
    else if (e.key === 'End') set(max);
    else return;
    e.preventDefault();
  };
  const onWheel = (e: React.WheelEvent) => {
    if (disabled) return;
    set(value + (e.deltaY < 0 ? step : -step));
  };

  return (
    <div
      className={`pb-knob ${active ? 'pb-knob--active' : ''}`}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(2))}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      title={title}
      style={{ width: size, height: size }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <path className="pb-knob-track" d={arc(20, 20, 15, -KNOB_SWEEP, KNOB_SWEEP)} />
        {pct > 0 && <path className="pb-knob-fill" d={arc(20, 20, 15, -KNOB_SWEEP, angle)} />}
        <line className="pb-knob-pointer" x1={20} y1={20} x2={tip.x} y2={tip.y} />
        {active && (
          <text className="pb-knob-text" x={20} y={20} textAnchor="middle" dominantBaseline="central">
            {Math.round(pct * 100)}
          </text>
        )}
      </svg>
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  // small marker dot next to the label (e.g. "in scale")
  marked?: boolean;
  title?: string;
}

export function Chip({ label, active, onToggle, disabled, marked, title }: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onToggle}
      title={title}
      className={`pb-chip ${active ? 'pb-chip--active' : ''}`}
    >
      <span className={`pb-led ${active ? '' : 'pb-led--off'}`} />
      {label}
      {marked && <span className="pb-chip-dot" />}
    </button>
  );
}

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface NoteChipsProps {
  selected: string[];
  onChange: (notes: string[]) => void;
  // scale notes get a marker dot; when scaleOnly is 'exclude' they can't be
  // picked (extra notes must be non-scale tones)
  scalePitchClasses: Set<number>;
  scaleNotes?: 'mark' | 'exclude';
}

const NOTE_PC: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

export function NoteChips({ selected, onChange, scalePitchClasses, scaleNotes = 'mark' }: NoteChipsProps) {
  const toggle = (note: string) => {
    onChange(selected.includes(note) ? selected.filter((n) => n !== note) : [...selected, note]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {CHROMATIC.map((note) => {
        const inScale = scalePitchClasses.has(NOTE_PC[note]);
        return (
          <Chip
            key={note}
            label={note}
            active={selected.includes(note)}
            marked={inScale}
            disabled={scaleNotes === 'exclude' && inScale}
            onToggle={() => toggle(note)}
            title={inScale ? `${note} — in the current scale` : note}
          />
        );
      })}
    </div>
  );
}

interface SectionProps {
  title: string;
  // one-line "what it sounds like" blurb next to the title
  hint?: string;
  // lights the LED: some knob in the section is off its default
  active: boolean;
  open: boolean;
  onToggle: () => void;
  // when set, a reset control appears: this section has hand-tweaks to clear
  onReset?: () => void;
  children: ReactNode;
}

export function Section({ title, hint, active, open, onToggle, onReset, children }: SectionProps) {
  const id = useId();
  return (
    <div className="border-t border-[var(--pb-border)]">
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="pb-section-toggle flex-1"
        >
          <span className={`pb-led ${active ? '' : 'pb-led--off'}`} />
          <span className="pb-label">{title}</span>
          {hint && <span className="min-w-0 flex-1 truncate text-left text-[11px] text-[var(--pb-text-tertiary)]">{hint}</span>}
          <ChevronDown size={13} className={`ml-auto shrink-0 text-[var(--pb-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {onReset && (
          <button type="button" className="pb-section-reset" onClick={onReset} title="Clear this section's hand-tweaks">
            Reset
          </button>
        )}
      </div>
      {open && (
        <div id={id} className="flex flex-col gap-3 px-3.5 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; title?: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="pb-inset flex flex-wrap gap-0.5 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`pb-seg ${value === opt.value ? 'pb-seg--active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
