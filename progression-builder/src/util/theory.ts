import { pitchClass } from './notes';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Position of a root note within the current scale, or -1 if chromatic.
export function degreeIndex(rootNote: string, scaleNotes: string[]): number {
  const rootPc = pitchClass(rootNote);
  if (rootPc === undefined) return -1;
  return scaleNotes.findIndex((n) => pitchClass(n) === rootPc);
}

// Roman numeral for the triad the scale builds on this degree, cased by the
// third and fifth the scale itself provides: minor third → lowercase,
// diminished fifth → °, augmented fifth → +.
export function romanNumeral(rootNote: string, scaleNotes: string[]): string | null {
  if (scaleNotes.length !== 7) return null;
  const pcs = scaleNotes.map((n) => pitchClass(n));
  if (pcs.some((p) => p === undefined)) return null;
  const degree = degreeIndex(rootNote, scaleNotes);
  if (degree === -1) return null;

  const rootPc = pcs[degree] as number;
  const third = ((pcs[(degree + 2) % 7] as number) - rootPc + 12) % 12;
  const fifth = ((pcs[(degree + 4) % 7] as number) - rootPc + 12) % 12;

  let numeral = ROMAN[degree];
  if (third === 3) numeral = numeral.toLowerCase();
  if (fifth === 6) numeral += '°';
  else if (fifth === 8) numeral += '+';
  return numeral;
}
