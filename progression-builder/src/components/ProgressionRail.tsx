import { useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, ExternalLink, Play, RefreshCw, Square, Trash2, X } from 'lucide-react';
import type { ModeScaleChord } from '../api/types';
import type { ProgressionChord, SwapState } from '../hooks/useProgressionBuilder';

interface ProgressionRailProps {
  progression: ProgressionChord[];
  chords: ModeScaleChord[];
  link: string;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onShift: (id: string, direction: -1 | 1) => void;
  onClear: () => void;
  onPreview: (notes: string | null) => void;
  onPlayStep: (index: number) => void;
  onPlayAll: () => void;
  onStop: () => void;
  isPlaying: boolean;
  activeStep: number | null;
  swap: SwapState | null;
  onOpenSwap: (id: string) => void;
  onCloseSwap: () => void;
  onReplace: (id: string, name: string) => void;
}

// Keyboard shortcut label for a step: 1–9 then 0 for the tenth.
const shortcutFor = (index: number) => (index < 10 ? String((index + 1) % 10) : null);

export default function ProgressionRail({
  progression,
  chords,
  link,
  onRemove,
  onMove,
  onShift,
  onClear,
  onPreview,
  onPlayStep,
  onPlayAll,
  onStop,
  isPlaying,
  activeStep,
  swap,
  onOpenSwap,
  onCloseSwap,
  onReplace,
}: ProgressionRailProps) {
  const swapIndex = swap ? progression.findIndex((c) => c.id === swap.id) : -1;
  const swapChord = swapIndex >= 0 ? progression[swapIndex] : null;
  // Only the selected pad (or the one being swapped) shows its edit controls.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; Open still carries the link
    }
  };

  return (
    <div className="pb-panel overflow-hidden">
      <div className="pb-panel-header">
        <span className="pb-panel-title">Progression</span>
        {progression.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {isPlaying ? (
              <button type="button" onClick={onStop} className="pb-btn pb-btn--stop !px-2.5 !py-1 text-[11px]">
                <Square size={11} /> Stop
              </button>
            ) : (
              <button type="button" onClick={onPlayAll} className="pb-btn pb-btn--play !px-2.5 !py-1 text-[11px]">
                <Play size={11} /> Play
              </button>
            )}
            {link && (
              <button
                type="button"
                onClick={handleCopy}
                className="pb-btn !min-w-[4.75rem] !px-2.5 !py-1 text-[11px]"
                title="Copy the modal chord buildr link"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="pb-btn !px-2.5 !py-1 text-[11px]"
                title="Open this progression in modal chord buildr"
              >
                <ExternalLink size={11} /> Open
              </a>
            )}
            <button type="button" onClick={onClear} className="pb-btn pb-btn--ghost !px-2.5 !py-1 text-[11px]">
              <Trash2 size={12} /> Clear
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        {progression.length === 0 ? (
          <p className="pb-inset px-3 py-4 text-center text-xs text-[var(--pb-text-tertiary)]">
            Add chords with the + on any chord pad, or generate a progression below.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-stretch gap-2">
              {progression.map((chord, index) => {
                const shortcut = shortcutFor(index);
                const swapOpen = swap?.id === chord.id;
                const selected = swapOpen || selectedId === chord.id;
                return (
                  <div
                    key={chord.id}
                    className={`pb-pad flex items-stretch overflow-hidden ${selected ? 'pb-pad--selected' : ''} ${activeStep === index ? 'pb-pad--lit' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(chord.id);
                        onPlayStep(index);
                      }}
                      onMouseEnter={() => onPreview(chord.notes)}
                      onMouseLeave={() => onPreview(null)}
                      title={shortcut ? `${chord.notes} (key ${shortcut})` : chord.notes}
                      className="flex cursor-pointer items-center gap-2 py-2 pl-2.5 pr-2"
                    >
                      <span className="pb-readout !text-[10px]">{shortcut ?? index + 1}</span>
                      <span className="font-mono text-sm font-semibold text-[var(--pb-text-primary)]">{chord.name}</span>
                    </button>
                    {selected && (
                      <div className="flex items-center border-l border-[var(--pb-border)] pl-0.5 pr-1">
                        <button
                          type="button"
                          onClick={() => (swapOpen ? onCloseSwap() : onOpenSwap(chord.id))}
                          className={`cursor-pointer rounded-sm p-1 hover:bg-[var(--pb-bg-hover)] ${
                            swapOpen
                              ? 'text-[var(--pb-accent-text)]'
                              : 'text-[var(--pb-text-tertiary)] hover:text-[var(--pb-text-primary)]'
                          }`}
                          title="Swap this chord"
                        >
                          <RefreshCw size={12} />
                        </button>
                        <div className="flex flex-col justify-center">
                          <button
                            type="button"
                            onClick={() => onShift(chord.id, 1)}
                            className="cursor-pointer rounded-sm px-1 py-0 text-[var(--pb-text-tertiary)] hover:bg-[var(--pb-bg-hover)] hover:text-[var(--pb-text-primary)]"
                            title="Shift voicing up: bass note moves to the top"
                          >
                            <ChevronUp size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onShift(chord.id, -1)}
                            className="cursor-pointer rounded-sm px-1 py-0 text-[var(--pb-text-tertiary)] hover:bg-[var(--pb-bg-hover)] hover:text-[var(--pb-text-primary)]"
                            title="Shift voicing down: top note moves to the bass"
                          >
                            <ChevronDown size={11} />
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => onMove(chord.id, -1)}
                          className="cursor-pointer rounded-sm p-1 text-[var(--pb-text-tertiary)] hover:bg-[var(--pb-bg-hover)] hover:text-[var(--pb-text-primary)] disabled:opacity-25 disabled:hover:bg-transparent"
                          title="Move earlier"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={index === progression.length - 1}
                          onClick={() => onMove(chord.id, 1)}
                          className="cursor-pointer rounded-sm p-1 text-[var(--pb-text-tertiary)] hover:bg-[var(--pb-bg-hover)] hover:text-[var(--pb-text-primary)] disabled:opacity-25 disabled:hover:bg-transparent"
                          title="Move later"
                        >
                          <ChevronRight size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(chord.id)}
                          className="cursor-pointer rounded-sm p-1 text-[var(--pb-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--pb-danger)_12%,transparent)] hover:text-[var(--pb-danger)]"
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {swap && swapChord && (
              <div className="pb-inset flex flex-col gap-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="pb-label">Swap step {swapIndex + 1}</span>
                  <span className="font-mono text-xs font-semibold text-[var(--pb-text-primary)]">{swapChord.name}</span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => onOpenSwap(swapChord.id)}
                    disabled={swap.loading}
                    className="pb-btn !px-2 !py-0.5 text-[11px]"
                    title="Fetch more alternatives. Each roll strays further from the smoothest choice."
                  >
                    <RefreshCw size={11} className={swap.loading ? 'animate-spin' : ''} /> Reroll
                  </button>
                  <button
                    type="button"
                    onClick={onCloseSwap}
                    className="cursor-pointer rounded-sm p-1 text-[var(--pb-text-tertiary)] hover:bg-[var(--pb-bg-hover)] hover:text-[var(--pb-text-primary)]"
                    title="Close"
                  >
                    <X size={13} />
                  </button>
                </div>

                {swap.loading && swap.options.length === 0 ? (
                  <p className="text-[11px] text-[var(--pb-text-tertiary)]">Searching for alternatives…</p>
                ) : swap.error ? (
                  <p className="text-xs text-[var(--pb-danger)]">{swap.error}</p>
                ) : swap.options.length === 0 ? (
                  <p className="text-[11px] text-[var(--pb-text-tertiary)]">
                    No alternatives fit this slot. Reroll or pick a chord below.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1 font-mono text-xs">
                      {swap.options.map((option) => (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => onReplace(swapChord.id, option.name)}
                          onMouseEnter={() => onPreview(option.notes)}
                          onMouseLeave={() => onPreview(null)}
                          title={option.notes}
                          className="cursor-pointer rounded-sm bg-[var(--pb-bg-hover)] px-1.5 py-0.5 transition-colors hover:text-[var(--pb-accent-text)]"
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                    {!swap.loading && !swap.foundNew && (
                      <p className="text-[11px] text-[var(--pb-text-tertiary)]">
                        Nothing new this roll. Reroll again or pick a chord below.
                      </p>
                    )}
                  </>
                )}

                <select
                  className="pb-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) onReplace(swapChord.id, e.target.value);
                  }}
                >
                  <option value="">Or pick any chord…</option>
                  {chords.map((c) => (
                    <option key={`${c.chordTypeId}-${c.chordNote}`} value={c.chordName ?? ''}>
                      {c.chordName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
