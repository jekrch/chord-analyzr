import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// syncGlobalKeyMode -> musicStore.setKeyAndMode fires a data fetch; mock the
// service so these tests stay offline and deterministic.
vi.mock('../services/DataService', () => ({
    dataService: {
        getModeKeyChords: vi.fn(async () => []),
        getScaleNotes: vi.fn(async () => []),
        getAllDistinctChords: vi.fn(async () => []),
    },
}));

import { useSongStore, Song, DEFAULT_SHEET_EXPORT_SETTINGS, getActiveSheetKeyMode, playChordNotes } from './songStore';
import { useMusicStore } from './musicStore';
import { usePlaybackStore } from './playbackStore';
import { transposeNoteName } from '../util/NoteUtil';

function makeSong(overrides: Partial<Song>): Song {
    const now = new Date().toISOString();
    return { id: 'id-1', title: 'Song', source: '[C]Hi there', createdAt: now, updatedAt: now, ...overrides };
}

beforeEach(() => {
    vi.clearAllMocks();
    useSongStore.setState({
        songs: [],
        currentSongId: null,
        stepIndex: null,
        viewMode: 'edit',
        sheetFullscreen: false,
        sheetExportPreview: false,
        inferredKeyMode: null,
        sheetExportSettings: { ...DEFAULT_SHEET_EXPORT_SETTINGS },
    });
    useMusicStore.setState({ key: 'C', mode: 'Ionian' });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('selectSong', () => {
    it('syncs the app key/mode when the selected song has its own', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a', key: 'G', mode: 'Ionian' })] });
        useSongStore.getState().selectSong('a');
        expect(useSongStore.getState().currentSongId).toBe('a');
        expect(useMusicStore.getState().key).toBe('G');
    });

    it('leaves the global key/mode alone for a song without one', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a' })] });
        useSongStore.getState().selectSong('a');
        expect(useMusicStore.getState().key).toBe('C');
    });
});

describe('deleteSong current-selection handling', () => {
    it('falls back to the first remaining song and resets the step', () => {
        useSongStore.setState({
            songs: [makeSong({ id: 'a' }), makeSong({ id: 'b' })],
            currentSongId: 'a',
            stepIndex: 4,
        });
        useSongStore.getState().deleteSong('a');
        const s = useSongStore.getState();
        expect(s.currentSongId).toBe('b');
        expect(s.stepIndex).toBeNull();
    });

    it('keeps the current selection when a different song is deleted', () => {
        useSongStore.setState({
            songs: [makeSong({ id: 'a' }), makeSong({ id: 'b' })],
            currentSongId: 'a',
            stepIndex: 2,
        });
        useSongStore.getState().deleteSong('b');
        expect(useSongStore.getState().currentSongId).toBe('a');
        expect(useSongStore.getState().stepIndex).toBe(2);
    });
});

describe('setSongKeyMode / setInferredKeyMode', () => {
    it('setSongKeyMode writes the song key and mirrors it globally', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a' })], currentSongId: 'a' });
        useSongStore.getState().setSongKeyMode('a', 'D', 'Dorian');
        const song = useSongStore.getState().songs[0];
        expect(song.key).toBe('D');
        expect(song.mode).toBe('Dorian');
        expect(useMusicStore.getState().key).toBe('D');
    });

    it('setInferredKeyMode syncs globally only for the current song', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a' })], currentSongId: 'a' });
        useSongStore.getState().setInferredKeyMode('a', 'E', 'Phrygian');
        expect(useMusicStore.getState().key).toBe('E');

        useMusicStore.setState({ key: 'C', mode: 'Ionian' });
        useSongStore.getState().setInferredKeyMode('other', 'A', 'Aeolian');
        expect(useMusicStore.getState().key).toBe('C'); // not the current song
    });
});

describe('getActiveSheetKeyMode', () => {
    it('prefers the song key, then the inferred key, then the global', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a', key: 'F', mode: 'Lydian' })], currentSongId: 'a' });
        expect(getActiveSheetKeyMode()).toEqual({ key: 'F', mode: 'Lydian' });

        useSongStore.setState({
            songs: [makeSong({ id: 'a' })],
            currentSongId: 'a',
            inferredKeyMode: { songId: 'a', key: 'G', mode: 'Mixolydian' },
        });
        expect(getActiveSheetKeyMode()).toEqual({ key: 'G', mode: 'Mixolydian' });

        useSongStore.setState({ songs: [makeSong({ id: 'a' })], currentSongId: 'a', inferredKeyMode: null });
        useMusicStore.setState({ key: 'C', mode: 'Ionian' });
        expect(getActiveSheetKeyMode()).toEqual({ key: 'C', mode: 'Ionian' });
    });
});

describe('view-mode setters', () => {
    it('setSheetFullscreen(true) forces the sheet view', () => {
        useSongStore.getState().setSheetFullscreen(true);
        const s = useSongStore.getState();
        expect(s.sheetFullscreen).toBe(true);
        expect(s.viewMode).toBe('sheet');
        useSongStore.getState().setSheetFullscreen(false);
        expect(useSongStore.getState().sheetFullscreen).toBe(false);
    });

    it('setSheetExportPreview(true) forces the sheet view', () => {
        useSongStore.setState({ viewMode: 'edit' });
        useSongStore.getState().setSheetExportPreview(true);
        expect(useSongStore.getState().viewMode).toBe('sheet');
        expect(useSongStore.getState().sheetExportPreview).toBe(true);
    });
});

describe('per-song saved view', () => {
    beforeEach(() => {
        useSongStore.setState({
            songs: [makeSong({ id: 'a' })],
            currentSongId: 'a',
            sheetExportSettings: { ...DEFAULT_SHEET_EXPORT_SETTINGS, columns: 2 },
        });
    });

    it('saveSongView snapshots the shared layout onto the song', () => {
        useSongStore.getState().saveSongView('a');
        expect(useSongStore.getState().songs[0].viewSettings?.columns).toBe(2);
    });

    it('updateSongViewSettings edits an existing saved view only', () => {
        useSongStore.getState().saveSongView('a');
        useSongStore.getState().updateSongViewSettings('a', { margin: 1 });
        expect(useSongStore.getState().songs[0].viewSettings?.margin).toBe(1);
    });

    it('updateSongViewSettings is a no-op when the song has no saved view', () => {
        useSongStore.getState().updateSongViewSettings('a', { margin: 1 });
        expect(useSongStore.getState().songs[0].viewSettings).toBeUndefined();
    });

    it('clearSongView drops the saved view', () => {
        useSongStore.getState().saveSongView('a');
        useSongStore.getState().clearSongView('a');
        expect(useSongStore.getState().songs[0].viewSettings).toBeUndefined();
    });
});

describe('sheet export settings', () => {
    it('patches and resets the shared export settings', () => {
        useSongStore.getState().setSheetExportSettings({ columns: 3, orientation: 'landscape' });
        expect(useSongStore.getState().sheetExportSettings.columns).toBe(3);
        expect(useSongStore.getState().sheetExportSettings.orientation).toBe('landscape');

        useSongStore.getState().resetSheetExportSettings();
        expect(useSongStore.getState().sheetExportSettings).toEqual(DEFAULT_SHEET_EXPORT_SETTINGS);
    });
});

describe('transposeSong', () => {
    it('rewrites the source, pins the shifted key and mirrors it globally', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a', key: 'C', mode: 'Ionian' })], currentSongId: 'a' });
        useSongStore.getState().transposeSong('a', 2);
        const song = useSongStore.getState().songs[0];
        expect(song.key).toBe(transposeNoteName('C', 2));
        expect(song.mode).toBe('Ionian');
        expect(song.source).not.toBe('[C]Hi there');
        expect(song.source).toContain('[D]');
        expect(useMusicStore.getState().key).toBe(transposeNoteName('C', 2));
    });

    it('honors an explicit target key spelling', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a', key: 'C', mode: 'Ionian' })], currentSongId: 'a' });
        useSongStore.getState().transposeSong('a', 1, 'Db');
        expect(useSongStore.getState().songs[0].key).toBe('Db');
    });

    it('does nothing for an unknown song id', () => {
        useSongStore.getState().transposeSong('nope', 2);
        expect(useSongStore.getState().songs).toEqual([]);
    });
});

describe('playChordNotes', () => {
    it('routes generated midi notes to the playback store', () => {
        const spy = vi.spyOn(usePlaybackStore.getState(), 'playNotes').mockImplementation(() => {});
        playChordNotes('C, E, G');
        expect(spy).toHaveBeenCalledTimes(1);
        const notes = spy.mock.calls[0][0];
        expect(notes.map(n => n.note)).toEqual(['C', 'E', 'G']);
    });
});
