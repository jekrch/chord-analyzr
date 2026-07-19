import { Volume2, VolumeX } from 'lucide-react';
import type { Mode } from '../api/types';
import Keybed from './Keybed';

interface InstrumentPanelProps {
  musicKey: string;
  onKeyChange: (key: string) => void;
  mode: string;
  onModeChange: (mode: string) => void;
  modes: Mode[];
  modesError: string | null;
  scalePitchClasses: Set<number>;
  litNotes: number[];
  previewNotes: number[];
  onPlayKey: (midi: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
}

export default function InstrumentPanel({
  musicKey,
  onKeyChange,
  mode,
  onModeChange,
  modes,
  modesError,
  scalePitchClasses,
  litNotes,
  previewNotes,
  onPlayKey,
  volume,
  onVolumeChange,
  muted,
  onMutedChange,
}: InstrumentPanelProps) {
  const volumePct = volume * 100;

  return (
    <div className="pb-panel overflow-hidden">
      <div className="pb-panel-header">
        <span className="pb-panel-title">Instrument</span>
        <span className="pb-inset px-2.5 py-1 font-mono text-xs text-[var(--pb-accent-text)]">
          {musicKey} {mode}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--pb-text-secondary)]">Mode:</span>
            {modesError ? (
              <span className="text-xs text-[var(--pb-danger)]">failed to load: {modesError}</span>
            ) : (
              <select value={mode} onChange={(e) => onModeChange(e.target.value)} className="pb-select w-44 sm:w-56">
                {modes.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onMutedChange(!muted)}
              aria-pressed={muted}
              title={muted ? 'Unmute' : 'Mute'}
              className="pb-btn pb-btn--ghost !p-1.5"
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              title="Volume"
              aria-label="Volume"
              className="pb-fader w-24"
              style={{
                background: `linear-gradient(to right, var(--pb-accent) ${volumePct}%, var(--pb-bg-inset) ${volumePct}%)`,
              }}
            />
          </div>
        </div>

        <div className="pb-inset p-2 sm:p-2.5">
          <Keybed
            selectedKey={musicKey}
            onKeyPress={(note, midi) => {
              onKeyChange(note);
              onPlayKey(midi);
            }}
            litNotes={litNotes}
            previewNotes={previewNotes}
            scalePitchClasses={scalePitchClasses}
          />
        </div>

        <p className="text-[11px] text-[var(--pb-text-tertiary)]">
          Click a key to set the root · dots mark the scale, amber is the root · keys light as chords play
        </p>
      </div>
    </div>
  );
}
