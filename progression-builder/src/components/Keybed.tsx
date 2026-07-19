import { pitchClass } from '../util/notes';

// Three octaves, C3–B5 — wide enough to show every voicing the audio engine
// produces, so the lit keys are exactly what's sounding.
const WHITES: { note: string; pc: number }[] = [
  { note: 'C', pc: 0 },
  { note: 'D', pc: 2 },
  { note: 'E', pc: 4 },
  { note: 'F', pc: 5 },
  { note: 'G', pc: 7 },
  { note: 'A', pc: 9 },
  { note: 'B', pc: 11 },
];

const BLACKS: { note: string; pc: number; afterWhite: number }[] = [
  { note: 'C#', pc: 1, afterWhite: 0 },
  { note: 'D#', pc: 3, afterWhite: 1 },
  { note: 'F#', pc: 6, afterWhite: 3 },
  { note: 'G#', pc: 8, afterWhite: 4 },
  { note: 'A#', pc: 10, afterWhite: 5 },
];

const OCTAVES = [3, 4, 5];
const WHITE_W = 100 / (OCTAVES.length * WHITES.length);
const BLACK_W = WHITE_W * 0.62;

interface KeybedProps {
  selectedKey: string;
  // click: parent sets the root and auditions the note
  onKeyPress: (note: string, midi: number) => void;
  // MIDI notes currently sounding — violet, and fade out with the note
  litNotes: number[];
  // MIDI notes lit silently by a hover preview — accent-colored
  previewNotes: number[];
  scalePitchClasses: Set<number>;
}

export default function Keybed({ selectedKey, onKeyPress, litNotes, previewNotes, scalePitchClasses }: KeybedProps) {
  const rootPc = pitchClass(selectedKey);
  const lit = new Set(litNotes);
  const preview = new Set(previewNotes);
  // Sounding wins over preview: it reflects what's actually audible.
  const keyState = (midi: number) =>
    lit.has(midi) ? 'pb-key--sounding' : preview.has(midi) ? 'pb-key--lit' : '';

  const dot = (pc: number) => {
    if (pc === rootPc) return <span className="pb-key-dot pb-key-dot--root" />;
    if (scalePitchClasses.has(pc)) return <span className="pb-key-dot" />;
    return null;
  };

  return (
    <div className="pb-keybed h-28 w-full sm:h-32">
      <div className="absolute inset-x-px inset-y-0 flex gap-px pb-px">
        {OCTAVES.flatMap((oct) =>
          WHITES.map(({ note, pc }) => {
            const midi = (oct + 1) * 12 + pc;
            return (
              <button
                key={midi}
                type="button"
                onClick={() => onKeyPress(note, midi)}
                title={`${note}${oct}`}
                aria-pressed={pc === rootPc}
                className={`pb-key pb-key--white relative min-w-0 flex-1 ${keyState(midi)}`}
              >
                {note === 'C' && <span className="pb-key-label">C{oct}</span>}
                {dot(pc)}
              </button>
            );
          }),
        )}
      </div>
      {OCTAVES.flatMap((oct, oi) =>
        BLACKS.map(({ note, pc, afterWhite }) => {
          const midi = (oct + 1) * 12 + pc;
          const left = (oi * 7 + afterWhite + 1) * WHITE_W - BLACK_W / 2;
          return (
            <button
              key={midi}
              type="button"
              onClick={() => onKeyPress(note, midi)}
              title={`${note}${oct}`}
              aria-pressed={pc === rootPc}
              style={{ left: `${left}%`, width: `${BLACK_W}%` }}
              className={`pb-key pb-key--black absolute top-0 z-[2] h-[62%] ${keyState(midi)}`}
            >
              {dot(pc)}
            </button>
          );
        }),
      )}
    </div>
  );
}
