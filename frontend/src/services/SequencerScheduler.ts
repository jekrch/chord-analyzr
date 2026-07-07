import { audioContext } from '../piano/audioContext';
import { usePatternStore } from '../stores/patternStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { usePianoStore } from '../stores/pianoStore';
import { getMidiNotes } from '../util/ChordUtil';
import { getMidiNote } from '../util/NoteUtil';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

/**
 * How far ahead (in seconds) notes are committed to the audio clock. Larger
 * values survive longer main-thread stalls; smaller values make chord
 * switches take effect sooner. 100ms is the standard compromise.
 */
const SCHEDULE_AHEAD_SEC = 0.1;

/** How often (ms) the scheduler wakes up to top up the schedule window. */
const TICK_INTERVAL_MS = 25;

export interface ScheduledInstrument {
    /** Play a midi note at an absolute AudioContext time, for durationSec seconds. */
    playNoteAt: (midiNumber: number, when: number, durationSec: number) => void;
    /** Stop all sounding/scheduled notes at an absolute AudioContext time (or now). */
    stopAllNotesAt: (when?: number) => void;
}

export interface ScheduledStep {
    stepIndex: number;
    /** Absolute AudioContext time this step falls on. */
    when: number;
    /** Midi number scheduled for this step, or null for a rest/no-chord step. */
    midiNumber: number | null;
    durationMs: number;
}

const parsePatternStep = (step: string, noteCount: number) => {
    if (step === 'x' || step === 'X') return null; // Rest

    const isOctaveUp = step.includes('+');
    const isOctaveDown = step.includes('-');
    const noteIndex = parseInt(step.replace(/[+-]/g, '')) - 1;

    if (noteIndex >= 0 && noteIndex < noteCount) {
        return { noteIndex, octaveUp: isOctaveUp, octaveDown: isOctaveDown };
    }
    return null;
};

/**
 * Lookahead sequencer scheduler ("A Tale of Two Clocks" pattern).
 *
 * Timing is derived exclusively from AudioContext.currentTime — the audio
 * hardware clock — and every note is committed to the audio graph
 * SCHEDULE_AHEAD_SEC before it sounds. Once scheduled, playback is
 * sample-accurate regardless of main-thread jank, React renders, or rAF
 * throttling on mobile.
 *
 * The wake-up pulse runs in a Web Worker so it is not delayed by main-thread
 * work; even when a tick does land late, any note inside the lookahead
 * window has already been scheduled and plays on time.
 *
 * React is deliberately not on the audio path: chord/pattern/tempo state is
 * read from the zustand stores via getState() at schedule time, so switching
 * chords mid-playback simply changes what the next unscheduled step reads.
 * UI updates (step highlight) are pushed out via listeners timed to land on
 * the beat — where jitter is invisible.
 */
class SequencerScheduler {
    private instrument: ScheduledInstrument | null = null;
    private worker: Worker | null = null;
    private fallbackIntervalId: number | null = null;
    private running = false;
    private stepIndex = 0;
    private nextStepTime = 0;
    private uiTimeouts = new Set<number>();
    private stepListeners = new Set<(step: ScheduledStep) => void>();

    setInstrument(instrument: ScheduledInstrument | null) {
        this.instrument = instrument;
    }

    /**
     * Listen for scheduled steps. The callback fires approximately when the
     * step becomes audible — use for visuals only.
     */
    onStep(listener: (step: ScheduledStep) => void): () => void {
        this.stepListeners.add(listener);
        return () => this.stepListeners.delete(listener);
    }

    get isRunning() {
        return this.running;
    }

    start() {
        if (this.running || !audioContext) return;
        this.running = true;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        this.stepIndex = 0;
        // Small offset so the first step can be scheduled ahead rather than late.
        this.nextStepTime = audioContext.currentTime + 0.05;
        usePatternStore.getState().setGlobalPatternState({ currentStep: 0 });

        this.startTicker();
        this.tick();
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        this.stopTicker();

        this.uiTimeouts.forEach((id) => window.clearTimeout(id));
        this.uiTimeouts.clear();

        this.instrument?.stopAllNotesAt();
    }

    private startTicker() {
        if (typeof Worker !== 'undefined') {
            try {
                const src = `let id=null;onmessage=(e)=>{if(e.data==='start'&&!id){id=setInterval(()=>postMessage('tick'),${TICK_INTERVAL_MS})}else if(e.data==='stop'){clearInterval(id);id=null}};`;
                this.worker = new Worker(
                    URL.createObjectURL(new Blob([src], { type: 'application/javascript' }))
                );
                this.worker.onmessage = () => this.tick();
                this.worker.postMessage('start');
                return;
            } catch {
                this.worker = null;
            }
        }
        this.fallbackIntervalId = window.setInterval(() => this.tick(), TICK_INTERVAL_MS);
    }

    private stopTicker() {
        if (this.worker) {
            this.worker.postMessage('stop');
            this.worker.terminate();
            this.worker = null;
        }
        if (this.fallbackIntervalId !== null) {
            window.clearInterval(this.fallbackIntervalId);
            this.fallbackIntervalId = null;
        }
    }

    private tick() {
        if (!this.running || !audioContext) return;

        while (this.nextStepTime < audioContext.currentTime + SCHEDULE_AHEAD_SEC) {
            const stepDurationMs = this.getStepDurationMs(this.stepIndex);
            this.scheduleStep(this.stepIndex, this.nextStepTime, stepDurationMs);
            this.nextStepTime += stepDurationMs / 1000;
            this.stepIndex++;
        }
    }

    /** Step duration in ms, reading bpm/subdivision/swing fresh so tempo changes apply on the next step. */
    private getStepDurationMs(stepIndex: number): number {
        const { bpm, subdivision, swing } = usePatternStore.getState().globalPatternState;
        const base = (60000 / bpm) * subdivision;
        if (swing === 0) return base;
        const swingRatio = 1 + swing / 100;
        return stepIndex % 2 === 1 ? base * swingRatio : base / swingRatio;
    }

    private scheduleStep(stepIndex: number, when: number, stepDurationMs: number) {
        if (!audioContext) return;

        const { temporaryChord, activeChordIndex, addedChords } = usePlaybackStore.getState();
        const { currentlyActivePattern } = usePatternStore.getState();
        const pianoSettings = usePianoStore.getState().pianoSettings;

        // Same resolution rules the UI uses: a temporary (previewed) chord plays
        // with the globally active pattern; a selected chord plays its own.
        const selectedChord =
            activeChordIndex !== null ? addedChords[activeChordIndex] : undefined;
        const chord = temporaryChord ?? selectedChord ?? null;
        const pattern =
            !temporaryChord && selectedChord ? selectedChord.pattern : currentlyActivePattern;

        let midiNumber: number | null = null;
        const durationMs = Math.max(
            30,
            Math.min(stepDurationMs * pianoSettings.noteDuration, stepDurationMs - 50)
        );

        if (chord && pattern.length > 0) {
            const notes = getMidiNotes(START_OCTAVE, END_OCTAVE, chord.notes);
            const stepValue = pattern[stepIndex % pattern.length];
            const parsed = parsePatternStep(stepValue, notes.length);

            if (parsed) {
                const { note, octave = 4 } = notes[parsed.noteIndex];
                let finalOctave = octave;
                if (parsed.octaveUp) finalOctave += 1;
                if (parsed.octaveDown) finalOctave -= 1;
                finalOctave = Math.max(1, Math.min(8, finalOctave));

                midiNumber = getMidiNote(note, finalOctave) + pianoSettings.octaveOffset * 12;
            }
        }

        if (midiNumber !== null && this.instrument) {
            if (!pianoSettings.cutOffPreviousNotes) {
                this.instrument.stopAllNotesAt(when);
            }
            this.instrument.playNoteAt(midiNumber, when, durationMs / 1000);
        }

        this.notifyOnBeat({ stepIndex, when, midiNumber, durationMs });
    }

    /** Fire UI listeners and the store's currentStep as close to the audible beat as possible. */
    private notifyOnBeat(step: ScheduledStep) {
        if (!audioContext) return;
        const delayMs = Math.max(0, (step.when - audioContext.currentTime) * 1000);

        const id = window.setTimeout(() => {
            this.uiTimeouts.delete(id);
            if (!this.running) return;
            usePatternStore.getState().setGlobalPatternState({ currentStep: step.stepIndex });
            this.stepListeners.forEach((listener) => listener(step));
        }, delayMs);

        this.uiTimeouts.add(id);
    }
}

export const sequencerScheduler = new SequencerScheduler();
