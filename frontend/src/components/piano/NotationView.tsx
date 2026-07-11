import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Accidental, Beam, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';
import { useMusicStore } from '../../stores/musicStore';
import { usePatternStore } from '../../stores/patternStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { convertScaleToMajorKey } from '../../util/KeySignatureUtil';
import { getMidiNotes } from '../../util/ChordUtil';
import { createKeySpeller, getMidiNote } from '../../util/NoteUtil';
import { parsePatternStep } from '../../services/SequencerScheduler';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

// Sequencer subdivision (fraction of a beat) -> VexFlow duration code
const DURATION_BY_SUBDIVISION: Record<number, string> = {
    0.125: '32',
    0.25: '16',
    0.5: '8',
    1: 'q',
    2: 'h',
};

const STAVE_HEIGHT = 150;
const STAVE_Y = 40;
// Horizontal room the clef + key signature need before the first note
const NOTE_START_PAD = 110;
const MIN_STEP_PX = 42;

const toVexKey = (note: string, octave: number) => `${note.toLowerCase()}/${octave}`;

/** One rendered step: note keys to draw, or null for a rest. */
type DisplayStep = string[] | null;

interface NotationViewProps {
    className?: string;
}

/**
 * Staff-notation "screen" for the keyboard area. When the sequencer is
 * stopped it shows the active chord as a whole note; while playing it shows
 * the active pattern resolved against the current chord, with note values
 * matching the sequencer subdivision and the sounding step lit in accent.
 */
const NotationView: React.FC<NotationViewProps> = ({ className = '' }) => {
    const scaleNotes = useMusicStore(state => state.scaleNotes);

    const isPlaying = usePatternStore(state => state.globalPatternState.isPlaying);
    const subdivision = usePatternStore(state => state.globalPatternState.subdivision);
    const currentStep = usePatternStore(state => state.globalPatternState.currentStep);
    const currentlyActivePattern = usePatternStore(state => state.currentlyActivePattern);

    const activeNotes = usePlaybackStore(state => state.activeNotes);
    const isPlayingScale = usePlaybackStore(state => state.isPlayingScale);
    const scalePlaybackNotes = usePlaybackStore(state => state.scalePlaybackNotes);
    const scalePlaybackStep = usePlaybackStore(state => state.scalePlaybackStep);
    const temporaryChord = usePlaybackStore(state => state.temporaryChord);
    const activeChordIndex = usePlaybackStore(state => state.activeChordIndex);
    const addedChords = usePlaybackStore(state => state.addedChords);

    const drawRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [availableWidth, setAvailableWidth] = useState(600);

    useEffect(() => {
        const el = measureRef.current;
        if (!el) return;
        const observer = new ResizeObserver(entries => {
            const width = Math.floor(entries[0].contentRect.width);
            if (width > 0) setAvailableWidth(width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Major key sharing the current scale's accidentals, e.g. C Lydian -> G
    const keySignature = useMemo(() => {
        const names = scaleNotes
            .map(scaleNote => scaleNote.noteName)
            .filter(Boolean) as string[];
        const majorKey = names.length ? convertScaleToMajorKey(names) : null;
        return majorKey ? majorKey.split(' ')[0] : 'C';
    }, [scaleNotes]);

    // Store notes are normalized to sharp spellings; respell them to match the
    // key signature so in-key notes don't get redundant accidentals drawn
    const spellKey = useMemo(() => {
        const speller = createKeySpeller(
            scaleNotes.map(scaleNote => scaleNote.noteName),
            keySignature
        );
        return (note: string, octave: number) => {
            const spelled = speller(note, octave);
            return toVexKey(spelled.note, spelled.octave);
        };
    }, [scaleNotes, keySignature]);

    // Same chord/pattern resolution the scheduler uses at schedule time
    const steps: DisplayStep[] = useMemo(() => {
        const selectedChord =
            activeChordIndex !== null ? addedChords[activeChordIndex] : undefined;
        const chord = temporaryChord ?? selectedChord ?? null;
        const pattern =
            !temporaryChord && selectedChord ? selectedChord.pattern : currentlyActivePattern;

        // Scale playback: the whole ascending scale at once, one note per step
        if (isPlayingScale && scalePlaybackNotes.length > 0) {
            return scalePlaybackNotes.map(({ note, octave }) =>
                [spellKey(note, octave ?? START_OCTAVE)]);
        }

        if (isPlaying) {
            if (!chord || pattern.length === 0) return [];
            const chordNotes = getMidiNotes(START_OCTAVE, END_OCTAVE, chord.notes);
            return pattern.map(stepValue => {
                const parsed = parsePatternStep(stepValue, chordNotes.length);
                if (!parsed) return null;
                const { note, octave = START_OCTAVE } = chordNotes[parsed.noteIndex];
                let finalOctave = octave;
                if (parsed.octaveUp) finalOctave += 1;
                if (parsed.octaveDown) finalOctave -= 1;
                finalOctave = Math.max(1, Math.min(8, finalOctave));
                return [spellKey(note, finalOctave)];
            });
        }

        // Stopped: the currently sounding notes as one chord
        if (activeNotes.length === 0) return [];
        const keys = [...activeNotes]
            .sort((a, b) =>
                getMidiNote(a.note, a.octave ?? START_OCTAVE) -
                getMidiNote(b.note, b.octave ?? START_OCTAVE))
            .map(({ note, octave = START_OCTAVE }) => spellKey(note, octave));
        return [keys];
    }, [isPlaying, isPlayingScale, scalePlaybackNotes, temporaryChord, activeChordIndex, addedChords, currentlyActivePattern, activeNotes, spellKey]);

    const scaleMode = isPlayingScale && scalePlaybackNotes.length > 0;
    const highlightIndex = scaleMode
        ? scalePlaybackStep
        : isPlaying && steps.length > 0 ? currentStep % steps.length : -1;

    useEffect(() => {
        const host = drawRef.current;
        if (!host) return;
        host.innerHTML = '';

        const style = getComputedStyle(host);
        const ink = style.getPropertyValue('--mcb-text-primary').trim() || '#cbd5e1';
        const accent = style.getPropertyValue('--mcb-accent-primary').trim() || '#22d3ee';

        // Scale playback sounds each note for half a beat -> eighth notes
        const duration = scaleMode
            ? '8'
            : isPlaying ? (DURATION_BY_SUBDIVISION[subdivision] ?? 'q') : 'w';
        const width = Math.max(
            availableWidth,
            NOTE_START_PAD + Math.max(steps.length, 1) * MIN_STEP_PX
        );

        const renderer = new Renderer(host, Renderer.Backends.SVG);
        renderer.resize(width, STAVE_HEIGHT);
        const context = renderer.getContext();
        context.setFillStyle(ink);
        context.setStrokeStyle(ink);

        const stave = new Stave(0, STAVE_Y, width - 1);
        stave.addClef('treble').addKeySignature(keySignature);
        stave.setStyle({ fillStyle: ink, strokeStyle: ink });
        stave.setContext(context).draw();

        const staveNotes = (steps.length > 0 ? steps : [null]).map((keys, index) => {
            const note = keys
                ? new StaveNote({ keys, duration })
                : new StaveNote({ keys: ['b/4'], duration: `${duration}r` });
            const color = index === highlightIndex ? accent : ink;
            note.setStyle({ fillStyle: color, strokeStyle: color });
            return note;
        });

        const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
        voice.addTickables(staveNotes);
        Accidental.applyAccidentals([voice], keySignature);

        // Natural spacing (~56px per note) rather than justifying across the
        // stave — full-width justification stretches beams into steep slants.
        const beams = Beam.generateBeams(staveNotes);
        const formatWidth = Math.min(width - NOTE_START_PAD - 20, staveNotes.length * 56);
        new Formatter().joinVoices([voice]).format([voice], formatWidth);
        voice.draw(context, stave);
        beams.forEach(beam => {
            beam.setStyle({ fillStyle: ink, strokeStyle: ink });
            beam.setContext(context).draw();
        });
    }, [steps, highlightIndex, isPlaying, scaleMode, subdivision, keySignature, availableWidth]);

    return (
        <div className={`mcb-inset p-2 sm:p-3 w-full ${className}`}>
            <div ref={measureRef} className="w-full overflow-x-auto">
                <div ref={drawRef} />
            </div>
        </div>
    );
};

export default React.memo(NotationView);
