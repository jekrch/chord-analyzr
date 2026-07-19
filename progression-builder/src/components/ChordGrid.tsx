import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ModeScaleChord } from '../api/types';
import { degreeIndex, romanNumeral } from '../util/theory';

interface ChordGridProps {
  chords: ModeScaleChord[];
  scaleNotes: string[];
  loading: boolean;
  error: string | null;
  onAdd: (chord: ModeScaleChord) => void;
  onPlay: (chord: ModeScaleChord) => void;
  onPreview: (chord: ModeScaleChord | null) => void;
}

interface ChordGroup {
  root: string;
  numeral: string | null;
  chords: ModeScaleChord[];
}

export default function ChordGrid({ chords, scaleNotes, loading, error, onAdd, onPlay, onPreview }: ChordGridProps) {
  const [filter, setFilter] = useState('');

  const groups = useMemo<ChordGroup[]>(() => {
    const term = filter.trim().toLowerCase();
    const filtered = term ? chords.filter((c) => c.chordName?.toLowerCase().includes(term)) : chords;

    const byRoot = new Map<string, ModeScaleChord[]>();
    for (const chord of filtered) {
      const root = chord.chordNoteName?.trim();
      if (!root || !chord.chordName) continue;
      const list = byRoot.get(root) ?? [];
      list.push(chord);
      byRoot.set(root, list);
    }
    return [...byRoot.entries()]
      .map(([root, list]) => ({ root, numeral: romanNumeral(root, scaleNotes), chords: list }))
      .sort((a, b) => {
        const da = degreeIndex(a.root, scaleNotes);
        const db = degreeIndex(b.root, scaleNotes);
        return (da === -1 ? 99 : da) - (db === -1 ? 99 : db);
      });
  }, [chords, filter, scaleNotes]);

  return (
    <div className="pb-panel overflow-hidden">
      <div className="pb-panel-header">
        <span className="pb-panel-title">Chords in scale</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="pb-inset w-28 px-2 py-1 text-xs text-[var(--pb-text-primary)] placeholder:text-[var(--pb-text-tertiary)] focus:outline-none sm:w-36"
        />
      </div>
      <div className="flex flex-col gap-3.5 p-3.5">
        {error && <p className="px-1 py-2 text-xs text-[var(--pb-danger)]">Failed to load chords: {error}</p>}
        {!error && loading && <p className="px-1 py-2 text-xs text-[var(--pb-text-tertiary)]">Loading chords…</p>}
        {!error && !loading && groups.length === 0 && (
          <p className="px-1 py-2 text-xs text-[var(--pb-text-tertiary)]">No chords match.</p>
        )}
        {!error &&
          !loading &&
          groups.map((group) => (
            <div key={group.root} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {group.numeral && <span className="pb-readout">{group.numeral}</span>}
                <span className="font-mono text-xs font-semibold text-[var(--pb-text-secondary)]">{group.root}</span>
                <span className="h-px flex-1 bg-[var(--pb-border)]" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.chords.map((chord) => (
                  <div key={`${chord.chordTypeId}-${chord.chordNote}`} className="pb-pad flex items-stretch overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onPlay(chord)}
                      onMouseEnter={() => onPreview(chord)}
                      onMouseLeave={() => onPreview(null)}
                      onFocus={() => onPreview(chord)}
                      onBlur={() => onPreview(null)}
                      title={chord.chordNoteNames ? `${chord.chordNoteNames} — click to play` : 'Click to play'}
                      className="cursor-pointer px-2.5 py-2 font-mono text-sm font-semibold text-[var(--pb-text-primary)]"
                    >
                      {chord.chordName}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdd(chord)}
                      title="Add to progression"
                      className="flex cursor-pointer items-center border-l border-[var(--pb-border)] px-1.5 text-[var(--pb-text-tertiary)] transition-colors hover:bg-[var(--pb-bg-hover)] hover:text-[var(--pb-accent-text)]"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        {!error && !loading && groups.length > 0 && (
          <p className="text-[11px] text-[var(--pb-text-tertiary)]">Click a chord to hear it · + adds it to the progression</p>
        )}
      </div>
    </div>
  );
}
