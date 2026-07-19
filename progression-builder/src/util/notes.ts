const PITCH_CLASS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0,
};

export function pitchClass(note: string): number | undefined {
  return PITCH_CLASS[note.trim()];
}

export function parseNoteList(notes: string | null | undefined): number[] {
  if (!notes) return [];
  return notes
    .split(/[,\s]+/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map(pitchClass)
    .filter((p): p is number => p !== undefined);
}

export const SHARP_KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
