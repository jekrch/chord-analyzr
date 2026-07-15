import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// transposeAddedChords looks chords up in the target key via the data service;
// mock it so we control which chords "exist" in the new key.
vi.mock('../services/DataService', () => ({
    dataService: {
        getModeKeyChords: vi.fn(async () => [] as { chordName: string; chordNoteNames: string }[]),
    },
}));

import { usePlaybackStore } from './playbackStore';
import { dataService } from '../services/DataService';
import { AddedChord } from './types';

const mocked = vi.mocked(dataService);

function chord(name: string, notes: string): AddedChord {
    return {
        name,
        notes,
        pattern: ['1', '2', '3', '4'],
        originalKey: 'C',
        originalMode: 'Ionian',
        originalNotes: notes,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    usePlaybackStore.setState({ addedChords: [], activeChordIndex: null });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('transposeAddedChords', () => {
    it('uses the library notes when the transposed chord exists in the new key', async () => {
        // In the new key (D), the transposed chord Dmaj7 exists with tidy spelling.
        mocked.getModeKeyChords.mockResolvedValue([
            { chordName: 'Dmaj7', chordNoteNames: 'D, F#, A, C#' },
        ]);
        usePlaybackStore.setState({ addedChords: [chord('Cmaj7', 'C, E, G, B')] });

        await usePlaybackStore.getState().transposeAddedChords('C', 'D', 'Ionian');

        const [result] = usePlaybackStore.getState().addedChords;
        expect(result.name).toBe('Dmaj7');
        expect(result.notes).toBe('D, F#, A, C#');
        expect(result.originalKey).toBe('D');
        expect(result.originalMode).toBe('Ionian');
        expect(result.originalNotes).toBe('D, F#, A, C#');
    });

    it('manually transposes the notes when the chord is absent from the new key', async () => {
        // Nothing comes back from the library, so notes are shifted by hand.
        mocked.getModeKeyChords.mockResolvedValue([]);
        usePlaybackStore.setState({ addedChords: [chord('Cmaj7', 'C, E, G, B')] });

        await usePlaybackStore.getState().transposeAddedChords('C', 'D', 'Ionian');

        const [result] = usePlaybackStore.getState().addedChords;
        expect(result.name).toBe('Dmaj7');
        expect(result.notes).toBe('D, F#, A, C#');
        // originalKey/mode are preserved on the manual-transpose path
        expect(result.originalKey).toBe('C');
        expect(result.originalMode).toBe('Ionian');
    });

    it('transposes every chord in the progression', async () => {
        mocked.getModeKeyChords.mockResolvedValue([]);
        usePlaybackStore.setState({
            addedChords: [chord('C', 'C, E, G'), chord('G', 'G, B, D')],
        });

        await usePlaybackStore.getState().transposeAddedChords('C', 'D', 'Ionian');

        expect(usePlaybackStore.getState().addedChords.map(c => c.name)).toEqual(['D', 'A']);
    });
});
