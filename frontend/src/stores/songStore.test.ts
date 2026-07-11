import { beforeEach, describe, expect, it } from 'vitest';
import { isSongLibraryFile, useSongStore, Song, SongLibraryFile } from './songStore';

function makeSong(overrides: Partial<Song>): Song {
    const now = new Date().toISOString();
    return {
        id: 'id-1',
        title: 'Song',
        source: 'Hello [Am]darkness',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function makeLibrary(songs: Song[]): SongLibraryFile {
    return {
        format: 'mcb-song-library',
        version: 1,
        savedAt: new Date().toISOString(),
        songs,
    };
}

beforeEach(() => {
    useSongStore.setState({ songs: [], currentSongId: null, stepIndex: null, viewMode: 'edit' });
});

describe('isSongLibraryFile', () => {
    it('accepts a valid library file', () => {
        expect(isSongLibraryFile(makeLibrary([makeSong({})]))).toBe(true);
        expect(isSongLibraryFile(makeLibrary([]))).toBe(true);
    });

    it('rejects wrong formats, newer versions and malformed songs', () => {
        expect(isSongLibraryFile(null)).toBe(false);
        expect(isSongLibraryFile({ format: 'other', version: 1, songs: [] })).toBe(false);
        expect(isSongLibraryFile({ ...makeLibrary([]), version: 99 })).toBe(false);
        expect(isSongLibraryFile(makeLibrary([{ id: 'x' } as Song]))).toBe(false);
    });
});

describe('importLibrary', () => {
    it('replace swaps the whole library and selects the first song', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'old' })], currentSongId: 'old' });
        useSongStore.getState().importLibrary(makeLibrary([makeSong({ id: 'new' })]), 'replace');
        const state = useSongStore.getState();
        expect(state.songs.map(s => s.id)).toEqual(['new']);
        expect(state.currentSongId).toBe('new');
    });

    it('merge appends unknown songs and skips identical ones', () => {
        const existing = makeSong({ id: 'a', source: 'same' });
        useSongStore.setState({ songs: [existing], currentSongId: 'a' });
        useSongStore.getState().importLibrary(
            makeLibrary([makeSong({ id: 'a', source: 'same' }), makeSong({ id: 'b' })]),
            'merge'
        );
        const state = useSongStore.getState();
        expect(state.songs.map(s => s.id)).toEqual(['a', 'b']);
        expect(state.songs[0]).toBe(existing); // untouched
        expect(state.currentSongId).toBe('a');
    });

    it('merge imports conflicting content as a copy under a fresh id', () => {
        useSongStore.setState({ songs: [makeSong({ id: 'a', source: 'mine' })], currentSongId: 'a' });
        useSongStore.getState().importLibrary(
            makeLibrary([makeSong({ id: 'a', source: 'theirs', title: 'Song' })]),
            'merge'
        );
        const state = useSongStore.getState();
        expect(state.songs).toHaveLength(2);
        expect(state.songs[0].source).toBe('mine');
        expect(state.songs[1].source).toBe('theirs');
        expect(state.songs[1].id).not.toBe('a');
        expect(state.songs[1].title).toBe('Song (imported)');
    });
});

describe('song CRUD and step cursor', () => {
    it('creates, renames, edits and deletes songs', () => {
        const store = useSongStore.getState();
        const id = store.createSong();
        expect(useSongStore.getState().currentSongId).toBe(id);

        store.renameSong(id, 'My Song');
        store.updateSongSource(id, '[C]Hi');
        const song = useSongStore.getState().songs[0];
        expect(song.title).toBe('My Song');
        expect(song.source).toBe('[C]Hi');

        store.deleteSong(id);
        expect(useSongStore.getState().songs).toHaveLength(0);
        expect(useSongStore.getState().currentSongId).toBeNull();
    });

    it('steps through the chord sequence and wraps', () => {
        const store = useSongStore.getState();
        expect(store.stepNext(0)).toBeNull();
        expect(store.stepNext(3)).toBe(0);
        expect(store.stepNext(3)).toBe(1);
        expect(store.stepNext(3)).toBe(2);
        expect(store.stepNext(3)).toBe(0); // wraps
        store.resetStep();
        expect(useSongStore.getState().stepIndex).toBeNull();
    });
});

describe('exportLibrary', () => {
    it('round-trips through import', () => {
        const store = useSongStore.getState();
        const id = store.createSong('Round Trip');
        store.updateSongSource(id, 'Hello [Am]darkness');

        const file = useSongStore.getState().exportLibrary();
        expect(isSongLibraryFile(JSON.parse(JSON.stringify(file)))).toBe(true);

        useSongStore.setState({ songs: [], currentSongId: null });
        useSongStore.getState().importLibrary(file, 'replace');
        expect(useSongStore.getState().songs[0].source).toBe('Hello [Am]darkness');
    });
});
