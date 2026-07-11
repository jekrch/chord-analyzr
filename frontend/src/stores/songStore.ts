import { create } from 'zustand';
import { getMidiNotes } from '../util/ChordUtil';
import { buildAddedChordsFromTokens, buildProgressionChord, inferKeyAndMode } from '../util/ProgressionParser';
import { ParsedSong, SheetChord } from '../util/SongSheetParser';
import { useMusicStore } from './musicStore';
import { usePatternStore } from './patternStore';
import { usePlaybackStore } from './playbackStore';

export interface Song {
    id: string;
    title: string;
    source: string;     // lyrics with inline [Am] chord markers
    createdAt: string;  // ISO
    updatedAt: string;  // ISO
}

export interface SongLibraryFile {
    format: 'mcb-song-library';
    version: 1;
    savedAt: string;
    songs: Song[];
}

export const SONG_LIBRARY_FORMAT = 'mcb-song-library';
export const SONG_LIBRARY_VERSION = 1;
const STORAGE_KEY = 'mcb-song-library';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

export function isSongLibraryFile(data: unknown): data is SongLibraryFile {
    const file = data as SongLibraryFile;
    return (
        !!file &&
        file.format === SONG_LIBRARY_FORMAT &&
        typeof file.version === 'number' &&
        file.version <= SONG_LIBRARY_VERSION &&
        Array.isArray(file.songs) &&
        file.songs.every(s =>
            s && typeof s.id === 'string' &&
            typeof s.title === 'string' &&
            typeof s.source === 'string'
        )
    );
}

function newSongId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `song-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadFromStorage(): { songs: Song[]; currentSongId: string | null } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (isSongLibraryFile(data)) {
                return { songs: data.songs, currentSongId: data.songs[0]?.id ?? null };
            }
        }
    } catch {
        // Corrupt or unavailable storage — start with an empty library
    }
    return { songs: [], currentSongId: null };
}

interface SongState {
    songs: Song[];
    currentSongId: string | null;
    viewMode: 'edit' | 'sheet';
    stepIndex: number | null; // cursor into the current song's chord sequence

    createSong: (title?: string) => string;
    updateSongSource: (id: string, source: string) => void;
    renameSong: (id: string, title: string) => void;
    deleteSong: (id: string) => void;
    selectSong: (id: string | null) => void;
    setViewMode: (mode: 'edit' | 'sheet') => void;

    stepNext: (sequenceLength: number) => number | null;
    resetStep: () => void;

    exportLibrary: () => SongLibraryFile;
    importLibrary: (file: SongLibraryFile, mode: 'replace' | 'merge') => void;
    loadSongIntoProgression: (parsed: ParsedSong) => Promise<number>;
}

export const useSongStore = create<SongState>((set, get) => ({
    ...loadFromStorage(),
    viewMode: 'edit',
    stepIndex: null,

    createSong: (title?: string) => {
        const now = new Date().toISOString();
        const song: Song = {
            id: newSongId(),
            title: title || `Song ${get().songs.length + 1}`,
            source: '',
            createdAt: now,
            updatedAt: now,
        };
        set(state => ({
            songs: [...state.songs, song],
            currentSongId: song.id,
            viewMode: 'edit',
            stepIndex: null,
        }));
        return song.id;
    },

    updateSongSource: (id: string, source: string) =>
        set(state => ({
            songs: state.songs.map(s =>
                s.id === id ? { ...s, source, updatedAt: new Date().toISOString() } : s
            ),
        })),

    renameSong: (id: string, title: string) =>
        set(state => ({
            songs: state.songs.map(s =>
                s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s
            ),
        })),

    deleteSong: (id: string) =>
        set(state => {
            const songs = state.songs.filter(s => s.id !== id);
            return {
                songs,
                currentSongId: state.currentSongId === id
                    ? (songs[0]?.id ?? null)
                    : state.currentSongId,
                stepIndex: state.currentSongId === id ? null : state.stepIndex,
            };
        }),

    selectSong: (id: string | null) => set({ currentSongId: id, stepIndex: null }),

    setViewMode: (mode: 'edit' | 'sheet') => set({ viewMode: mode }),

    // Advance the step cursor (wrapping) and return the new index so the
    // caller can play that chord; null when the song has no chords.
    stepNext: (sequenceLength: number) => {
        if (!sequenceLength) return null;
        const current = get().stepIndex;
        const next = current === null ? 0 : (current + 1) % sequenceLength;
        set({ stepIndex: next });
        return next;
    },

    resetStep: () => set({ stepIndex: null }),

    exportLibrary: (): SongLibraryFile => ({
        format: SONG_LIBRARY_FORMAT,
        version: SONG_LIBRARY_VERSION,
        savedAt: new Date().toISOString(),
        songs: get().songs,
    }),

    importLibrary: (file: SongLibraryFile, mode: 'replace' | 'merge') =>
        set(state => {
            if (mode === 'replace') {
                return {
                    songs: file.songs,
                    currentSongId: file.songs[0]?.id ?? null,
                    stepIndex: null,
                };
            }
            // Merge: unknown ids append; identical songs are skipped; same id
            // with different content imports as a copy so nothing is lost.
            const byId = new Map(state.songs.map(s => [s.id, s]));
            const added: Song[] = [];
            for (const song of file.songs) {
                const existing = byId.get(song.id);
                if (!existing) {
                    added.push(song);
                } else if (existing.source !== song.source || existing.title !== song.title) {
                    added.push({ ...song, id: newSongId(), title: `${song.title} (imported)` });
                }
            }
            return { songs: [...state.songs, ...added] };
        }),

    /**
     * Replace the main-page progression with this song's chords (in reading
     * order, deduplicated by name so the pad grid stays compact), inferring
     * the best key/mode the same way the progression modal does. Returns the
     * number of chords loaded.
     */
    loadSongIntoProgression: async (parsed: ParsedSong): Promise<number> => {
        const tokens = parsed.chordSequence.map(c => c.parsed);
        const seen = new Set<string>();
        const uniqueTokens = parsed.chordSequence
            .filter(c => (seen.has(c.name) ? false : (seen.add(c.name), true)))
            .map(c => c.parsed);
        if (!tokens.length) return 0;

        const musicStore = useMusicStore.getState();
        const suggestion = await inferKeyAndMode(tokens, musicStore.modes).catch(() => null);
        const key = suggestion?.key ?? musicStore.key;
        const mode = suggestion?.mode ?? musicStore.mode;

        const pattern = usePatternStore.getState().currentlyActivePattern;
        const existing = usePlaybackStore.getState().addedChords;
        const finalChords = await buildAddedChordsFromTokens(uniqueTokens, key, mode, pattern, existing);
        if (!finalChords.length) return 0;

        const { clearAllChords, setAddedChords } = usePlaybackStore.getState();
        clearAllChords();
        if (key !== musicStore.key || mode !== musicStore.mode) {
            useMusicStore.getState().setKeyAndMode(key, mode);
        }
        setAddedChords(finalChords);
        return finalChords.length;
    },
}));

// ---------------------------------------------------------------------------
// Autosave: persist the library to localStorage shortly after any change.
let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
useSongStore.subscribe((state, prev) => {
    if (state.songs === prev.songs) return;
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(useSongStore.getState().exportLibrary()));
        } catch {
            // Storage full or unavailable — the user can still export to file
        }
    }, 500);
});

// ---------------------------------------------------------------------------
// Chord audio for the sheet: notes are generated once per chord/key/mode and
// cached at module level so repeated clicks don't re-run the generator.
const chordNotesCache = new Map<string, string | null>();

export async function getSheetChordNotes(
    chord: Pick<SheetChord, 'name' | 'parsed'>
): Promise<string | null> {
    const { key, mode } = useMusicStore.getState();
    const cacheKey = `${chord.name}|${key}|${mode}`;
    if (!chordNotesCache.has(cacheKey)) {
        const built = await buildProgressionChord(chord.parsed, key, mode).catch(() => null);
        chordNotesCache.set(cacheKey, built?.notes ?? null);
    }
    return chordNotesCache.get(cacheKey) ?? null;
}

/** Play a sheet chord through the app's shared piano (fire and forget). */
export async function playSheetChord(chord: Pick<SheetChord, 'name' | 'parsed'>): Promise<void> {
    const notes = await getSheetChordNotes(chord);
    if (notes) {
        usePlaybackStore.getState().playNotes(getMidiNotes(START_OCTAVE, END_OCTAVE, notes));
    }
}

/** Play an already-known notes string (e.g. a chord from the user's set). */
export function playChordNotes(notes: string): void {
    usePlaybackStore.getState().playNotes(getMidiNotes(START_OCTAVE, END_OCTAVE, notes));
}
