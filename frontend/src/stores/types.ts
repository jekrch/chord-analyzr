export type { AddedChord, PianoSettings } from '../util/urlStateEncoder';
export type { ModeScaleChordDto, ScaleNoteDto } from '../api';

export interface ActiveNoteInfo {
    midiNote?: number;
    note: string;
    octave: number;
}

export interface GlobalPatternState {
    currentPattern: string[];
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
}