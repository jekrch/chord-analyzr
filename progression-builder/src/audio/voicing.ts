// Turn an API note list ("C, E, G" — bass first for slash chords) into MIDI
// notes in a close ascending voicing: the first note lands in octave 4 for
// roots C–F and octave 3 for F#–B, and every later note sits just above the
// one before it. That keeps the whole stack on the visible keybed (C3–B5),
// so what lights up is exactly what sounds.
import { pitchClass } from '../util/notes';

export function voiceChord(notes: string | null | undefined): number[] {
  if (!notes) return [];
  const pcs = notes
    .split(/[,\s]+/)
    .map((n) => pitchClass(n))
    .filter((p): p is number => p !== undefined);
  if (pcs.length === 0) return [];

  const midis: number[] = [];
  let prev = (pcs[0] < 6 ? 60 : 48) + pcs[0];
  midis.push(prev);
  for (const pc of pcs.slice(1)) {
    let midi = prev + 1;
    while (midi % 12 !== pc) midi++;
    midis.push(midi);
    prev = midi;
  }
  return midis;
}
