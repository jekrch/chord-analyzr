import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Mock the data service so store actions exercise pure state logic without
// hitting the API or the static data bundle.
vi.mock('../services/DataService', () => ({
    dataService: {
        getModeKeyChords: vi.fn(async () => [{ chordName: 'C', chordNoteNames: 'C, E, G' }]),
        getScaleNotes: vi.fn(async () => [{ noteName: 'C' }, { noteName: 'Bb' }]),
        getAllDistinctChords: vi.fn(async () => [{ chordName: 'Dm', chordNoteNames: 'D, F, A' }]),
    },
}));

import { useMusicStore } from './musicStore';
import { dataService } from '../services/DataService';

const mocked = vi.mocked(dataService);

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useMusicStore.setState({
        chords: undefined,
        scaleNotes: [],
        key: 'C',
        mode: 'Ionian',
        modes: [],
        loadingChords: false,
        normalizedScaleNotes: [],
        allDistinctChords: undefined,
        allDistinctChordsKey: null,
        allDistinctChordsMode: null,
        loadingAllChords: false,
        showAllChords: false,
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('fetchMusicData', () => {
    it('loads chords and normalizes scale notes', async () => {
        await useMusicStore.getState().fetchMusicData('C', 'Ionian');
        const s = useMusicStore.getState();
        expect(s.chords).toHaveLength(1);
        // 'Bb' normalizes to its standard 'A#' spelling
        expect(s.normalizedScaleNotes).toEqual(['C', 'A#']);
        expect(s.loadingChords).toBe(false);
    });

    it('does nothing without a key or mode', async () => {
        await useMusicStore.getState().fetchMusicData('', 'Ionian');
        expect(mocked.getModeKeyChords).not.toHaveBeenCalled();
    });

    it('clears the loading flag when the fetch throws', async () => {
        mocked.getModeKeyChords.mockRejectedValueOnce(new Error('boom'));
        await useMusicStore.getState().fetchMusicData('C', 'Ionian');
        expect(useMusicStore.getState().loadingChords).toBe(false);
    });
});

describe('setKey / setMode / setKeyAndMode', () => {
    it('setKey updates key, clears the distinct-chord cache and refetches', async () => {
        useMusicStore.setState({
            allDistinctChords: [{ chordName: 'X' }],
            allDistinctChordsKey: 'C',
            allDistinctChordsMode: 'Ionian',
        });
        useMusicStore.getState().setKey('D');
        const s = useMusicStore.getState();
        expect(s.key).toBe('D');
        expect(s.allDistinctChords).toBeUndefined();
        expect(s.allDistinctChordsKey).toBeNull();
        expect(mocked.getModeKeyChords).toHaveBeenCalledWith('D', 'Ionian');
    });

    it('setKeyAndMode fetches for the new pair', async () => {
        useMusicStore.getState().setKeyAndMode('E', 'Dorian');
        const s = useMusicStore.getState();
        expect(s.key).toBe('E');
        expect(s.mode).toBe('Dorian');
        expect(mocked.getModeKeyChords).toHaveBeenCalledWith('E', 'Dorian');
    });

    it('refetches distinct chords on key change only when they are shown', async () => {
        useMusicStore.setState({ showAllChords: true });
        useMusicStore.getState().setMode('Dorian');
        expect(mocked.getAllDistinctChords).toHaveBeenCalled();
    });
});

describe('setModes', () => {
    it('auto-fetches on first set when no chords are loaded', () => {
        useMusicStore.getState().setModes(['Ionian', 'Dorian']);
        expect(useMusicStore.getState().modes).toEqual(['Ionian', 'Dorian']);
        expect(mocked.getModeKeyChords).toHaveBeenCalledWith('C', 'Ionian');
    });

    it('does not refetch when chords already exist', () => {
        useMusicStore.setState({ chords: [{ chordName: 'C' }] });
        useMusicStore.getState().setModes(['Ionian']);
        expect(mocked.getModeKeyChords).not.toHaveBeenCalled();
    });
});

describe('fetchAllDistinctChords caching', () => {
    it('skips the fetch when cached for the current key/mode', async () => {
        useMusicStore.setState({
            allDistinctChords: [{ chordName: 'cached' }],
            allDistinctChordsKey: 'C',
            allDistinctChordsMode: 'Ionian',
        });
        await useMusicStore.getState().fetchAllDistinctChords();
        expect(mocked.getAllDistinctChords).not.toHaveBeenCalled();
    });

    it('fetches and tags the result with its key/mode', async () => {
        await useMusicStore.getState().fetchAllDistinctChords();
        const s = useMusicStore.getState();
        expect(s.allDistinctChords).toHaveLength(1);
        expect(s.allDistinctChordsKey).toBe('C');
        expect(s.allDistinctChordsMode).toBe('Ionian');
    });
});

describe('toggleShowAllChords / setShowAllChords', () => {
    it('toggles on and fetches when uncached', () => {
        useMusicStore.getState().toggleShowAllChords();
        expect(useMusicStore.getState().showAllChords).toBe(true);
        expect(mocked.getAllDistinctChords).toHaveBeenCalled();
    });

    it('toggles off without fetching', () => {
        useMusicStore.setState({ showAllChords: true });
        useMusicStore.getState().toggleShowAllChords();
        expect(useMusicStore.getState().showAllChords).toBe(false);
        expect(mocked.getAllDistinctChords).not.toHaveBeenCalled();
    });

    it('setShowAllChords(true) skips the fetch when already cached', () => {
        useMusicStore.setState({
            allDistinctChords: [{ chordName: 'cached' }],
            allDistinctChordsKey: 'C',
            allDistinctChordsMode: 'Ionian',
        });
        useMusicStore.getState().setShowAllChords(true);
        expect(mocked.getAllDistinctChords).not.toHaveBeenCalled();
    });
});
