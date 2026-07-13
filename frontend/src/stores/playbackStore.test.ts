import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { usePlaybackStore } from './playbackStore';
import { AddedChord } from './types';

function chord(name: string): AddedChord {
    return {
        name,
        notes: 'C, E, G',
        pattern: ['1', '2', '3', '4'],
        originalKey: 'C',
        originalMode: 'Ionian',
        originalNotes: 'C, E, G',
    };
}

beforeEach(() => {
    usePlaybackStore.setState({
        activeNotes: [],
        activeChordIndex: null,
        highlightedChordIndex: null,
        addedChords: [],
        temporaryChord: null,
        isPlayingScale: false,
        scalePlaybackNotes: [],
        scalePlaybackStep: -1,
        scalePlaybackTimeouts: [],
    });
});

describe('addChord', () => {
    it('appends a chord carrying its key/mode/notes metadata', () => {
        usePlaybackStore.getState().addChord('Am', 'A, C, E', ['1', '2'], 'C', 'Aeolian');
        const [added] = usePlaybackStore.getState().addedChords;
        expect(added).toMatchObject({
            name: 'Am',
            notes: 'A, C, E',
            originalKey: 'C',
            originalMode: 'Aeolian',
            originalNotes: 'A, C, E',
        });
        // pattern is copied, not shared by reference
        expect(added.pattern).toEqual(['1', '2']);
    });
});

describe('removeChord', () => {
    beforeEach(() => {
        usePlaybackStore.setState({ addedChords: [chord('A'), chord('B'), chord('C')] });
    });

    it('drops the chord at the given index', () => {
        usePlaybackStore.getState().removeChord(1);
        expect(usePlaybackStore.getState().addedChords.map(c => c.name)).toEqual(['A', 'C']);
    });

    it('clears activeChordIndex when the active chord is removed', () => {
        usePlaybackStore.setState({ activeChordIndex: 1 });
        usePlaybackStore.getState().removeChord(1);
        expect(usePlaybackStore.getState().activeChordIndex).toBeNull();
    });

    it('shifts activeChordIndex down when an earlier chord is removed', () => {
        usePlaybackStore.setState({ activeChordIndex: 2 });
        usePlaybackStore.getState().removeChord(0);
        expect(usePlaybackStore.getState().activeChordIndex).toBe(1);
    });

    it('leaves activeChordIndex alone when a later chord is removed', () => {
        usePlaybackStore.setState({ activeChordIndex: 0 });
        usePlaybackStore.getState().removeChord(2);
        expect(usePlaybackStore.getState().activeChordIndex).toBe(0);
    });
});

describe('updateChord / updateChordPattern', () => {
    beforeEach(() => {
        usePlaybackStore.setState({ addedChords: [chord('A'), chord('B')] });
    });

    it('replaces a chord at an index', () => {
        usePlaybackStore.getState().updateChord(1, chord('Bmaj7'));
        expect(usePlaybackStore.getState().addedChords[1].name).toBe('Bmaj7');
        expect(usePlaybackStore.getState().addedChords[0].name).toBe('A');
    });

    it('swaps only the pattern of one chord', () => {
        usePlaybackStore.getState().updateChordPattern(0, ['x', 'x']);
        expect(usePlaybackStore.getState().addedChords[0].pattern).toEqual(['x', 'x']);
        expect(usePlaybackStore.getState().addedChords[1].pattern).toEqual(['1', '2', '3', '4']);
    });
});

describe('clearAllChords', () => {
    it('empties chords and resets active/temporary state', () => {
        usePlaybackStore.setState({
            addedChords: [chord('A')],
            activeChordIndex: 0,
            temporaryChord: { name: 'X', notes: 'C' },
        });
        usePlaybackStore.getState().clearAllChords();
        const s = usePlaybackStore.getState();
        expect(s.addedChords).toEqual([]);
        expect(s.activeChordIndex).toBeNull();
        expect(s.temporaryChord).toBeNull();
    });
});

describe('setIsPlayingScale', () => {
    it('resets scale playback fields when turning off', () => {
        usePlaybackStore.setState({
            isPlayingScale: true,
            scalePlaybackNotes: [{ note: 'C', octave: 4 }],
            scalePlaybackStep: 2,
        });
        usePlaybackStore.getState().setIsPlayingScale(false);
        const s = usePlaybackStore.getState();
        expect(s.isPlayingScale).toBe(false);
        expect(s.scalePlaybackNotes).toEqual([]);
        expect(s.scalePlaybackStep).toBe(-1);
    });

    it('only flips the flag when turning on', () => {
        usePlaybackStore.setState({ scalePlaybackStep: 5 });
        usePlaybackStore.getState().setIsPlayingScale(true);
        expect(usePlaybackStore.getState().isPlayingScale).toBe(true);
        expect(usePlaybackStore.getState().scalePlaybackStep).toBe(5);
    });
});

describe('scale playback timeouts', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('collects timeouts and clears them all', () => {
        vi.useFakeTimers();
        const spy = vi.spyOn(global, 'clearTimeout');
        const t1 = setTimeout(() => {}, 1000);
        const t2 = setTimeout(() => {}, 2000);
        usePlaybackStore.getState().addScalePlaybackTimeout(t1);
        usePlaybackStore.getState().addScalePlaybackTimeout(t2);
        expect(usePlaybackStore.getState().scalePlaybackTimeouts).toHaveLength(2);

        usePlaybackStore.getState().clearScalePlaybackTimeouts();
        expect(spy).toHaveBeenCalledTimes(2);
        expect(usePlaybackStore.getState().scalePlaybackTimeouts).toEqual([]);
    });
});

describe('playNotes', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('clears notes immediately then sets them after a tick', () => {
        vi.useFakeTimers();
        usePlaybackStore.setState({ activeNotes: [{ note: 'C', octave: 4 }] });
        const notes = [{ note: 'D', octave: 4 }, { note: 'F#', octave: 4 }];
        usePlaybackStore.getState().playNotes(notes);
        expect(usePlaybackStore.getState().activeNotes).toEqual([]);
        vi.advanceTimersByTime(10);
        expect(usePlaybackStore.getState().activeNotes).toEqual(notes);
    });
});
