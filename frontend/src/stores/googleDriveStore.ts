import { create } from 'zustand';
import { clearCachedToken, getAccessToken, revokeAccess } from '../util/googleAuth';
import {
    DRIVE_LIBRARY_FILE_NAME,
    DriveApiError,
    createFile,
    downloadFileText,
    findLibraryFile,
    updateFile,
} from '../util/googleDrive';
import { SongLibraryFile, isSongLibraryFile, useSongStore } from './songStore';

/**
 * Manual Google Drive sync for the song library: explicit save/load against
 * a single chordbuildr-songs.json in the user's Drive, alongside (not
 * replacing) the local file save/load and localStorage autosave.
 *
 * Only the connection flag, the Drive file id and the last sync time are
 * persisted; access tokens stay in memory (see util/googleAuth.ts).
 */

const STORAGE_KEY = 'mcb-google-drive';

interface StoredDriveState {
    connected: boolean;
    fileId?: string;
    lastSyncedAt?: string;
}

function loadFromStorage(): StoredDriveState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw) as StoredDriveState;
            if (data && typeof data.connected === 'boolean') return data;
        }
    } catch {
        // Corrupt or unavailable storage — treat as never connected
    }
    return { connected: false };
}

function saveToStorage(state: StoredDriveState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage unavailable — sync still works, just won't survive reload
    }
}

interface GoogleDriveState {
    connected: boolean;
    fileId: string | null;
    lastSyncedAt: string | null;
    busy: 'save' | 'load' | null;
    error: string | null;

    disconnect: () => void;
    /** Save the current library to Drive. Returns true on success. */
    saveToDrive: () => Promise<boolean>;
    /**
     * Fetch and validate the library file from Drive. Returns the parsed
     * file so the caller can run the replace/merge flow, or null on any
     * failure (with `error` set).
     */
    loadFromDrive: () => Promise<SongLibraryFile | null>;
}

/**
 * Run a Drive operation, retrying once with a fresh token when the cached
 * one has expired server-side (401).
 */
async function withToken<T>(op: (token: string) => Promise<T>): Promise<T> {
    const token = await getAccessToken();
    try {
        return await op(token);
    } catch (err) {
        if (err instanceof DriveApiError && err.status === 401) {
            clearCachedToken();
            return op(await getAccessToken());
        }
        throw err;
    }
}

function toErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    return 'Something went wrong talking to Google Drive.';
}

export const useGoogleDriveStore = create<GoogleDriveState>((set, get) => {
    const stored = loadFromStorage();

    const persist = (connected: boolean, fileId: string | null, lastSyncedAt: string | null) => {
        set({ connected, fileId, lastSyncedAt });
        saveToStorage({
            connected,
            fileId: fileId ?? undefined,
            lastSyncedAt: lastSyncedAt ?? undefined,
        });
    };

    return {
        connected: stored.connected,
        fileId: stored.fileId ?? null,
        lastSyncedAt: stored.lastSyncedAt ?? null,
        busy: null,
        error: null,

        disconnect: () => {
            revokeAccess();
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // ignore
            }
            set({ connected: false, fileId: null, lastSyncedAt: null, error: null });
        },

        saveToDrive: async () => {
            set({ busy: 'save', error: null });
            try {
                const json = JSON.stringify(useSongStore.getState().exportLibrary(), null, 2);
                const fileId = await withToken(async token => {
                    const knownId = get().fileId;
                    if (knownId) {
                        try {
                            await updateFile(token, knownId, json);
                            return knownId;
                        } catch (err) {
                            // Stale id (file trashed/deleted) — fall through
                            // to find-or-create under a fresh id.
                            if (!(err instanceof DriveApiError && err.status === 404)) throw err;
                        }
                    }
                    const existing = await findLibraryFile(token);
                    if (existing) {
                        await updateFile(token, existing.id, json);
                        return existing.id;
                    }
                    return createFile(token, json);
                });
                persist(true, fileId, new Date().toISOString());
                return true;
            } catch (err) {
                set({ error: toErrorMessage(err) });
                return false;
            } finally {
                set({ busy: null });
            }
        },

        loadFromDrive: async () => {
            set({ busy: 'load', error: null });
            try {
                const result = await withToken(async token => {
                    const knownId = get().fileId;
                    if (knownId) {
                        try {
                            return { id: knownId, text: await downloadFileText(token, knownId) };
                        } catch (err) {
                            if (!(err instanceof DriveApiError && err.status === 404)) throw err;
                        }
                    }
                    const existing = await findLibraryFile(token);
                    if (!existing) return null;
                    return { id: existing.id, text: await downloadFileText(token, existing.id) };
                });
                if (!result) {
                    set({
                        error: `No ${DRIVE_LIBRARY_FILE_NAME} found in your Drive — use Save to Drive first.`,
                    });
                    return null;
                }
                let data: unknown;
                try {
                    data = JSON.parse(result.text);
                } catch {
                    set({ error: "The Drive file isn't valid JSON." });
                    return null;
                }
                if (!isSongLibraryFile(data)) {
                    set({ error: "The Drive file isn't a chordbuildr song library." });
                    return null;
                }
                persist(true, result.id, new Date().toISOString());
                return data;
            } catch (err) {
                set({ error: toErrorMessage(err) });
                return null;
            } finally {
                set({ busy: null });
            }
        },
    };
});
