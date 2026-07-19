export interface Mode {
  id: number;
  name: string;
}

export interface ScaleNote {
  seqNote: number;
  noteName: string;
}

export interface ModeScaleChord {
  modeId: number;
  chordTypeId: number;
  chordNote: number;
  keyNote: number;
  mode: string;
  keyName: string;
  chordNoteName: string | null;
  chordName: string | null;
  modeNotes: number[];
  chordNotes: string | null;
  chordNoteNames: string | null;
  modeChordNoteDiff: number[];
  modeChordNoteDiffCount: number;
}

export interface ProgressionStep {
  progressionId: number;
  step: number;
  chord: string;
  vlFromPrev: number;
  totalCost: number;
}

// One request to GET /api/progressions. Everything past startChord is
// optional; zero/empty means "knob off" and is omitted from the query string
// (the API defaults them the same way).
export interface SmoothProgressionParams {
  mode: string;
  key: string;
  startChord: string;
  length?: number;
  randomness?: number;
  resultCount?: number;
  // motion & bass
  rootWeight?: number;
  slashWeight?: number;
  motionProfile?: string;
  // chromatic color
  colorWeight?: number;
  colorDevices?: string[];
  extraNotes?: string[];
  brightness?: number;
  // texture
  maxNotes?: number;
  avoidNotes?: string[];
  // shape & intent
  ending?: string;
  loopWeight?: number;
  pinned?: string[];
  required?: string[];
}
