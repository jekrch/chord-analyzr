import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoogleDriveStore } from './googleDriveStore';
import { useSongStore } from './songStore';
import * as googleAuth from '../util/googleAuth';
import * as googleDrive from '../util/googleDrive';
import { DriveApiError } from '../util/googleDrive';

vi.mock('../util/googleAuth', () => ({
    getAccessToken: vi.fn(),
    clearCachedToken: vi.fn(),
    revokeAccess: vi.fn(),
}));

vi.mock('../util/googleDrive', async importOriginal => {
    const actual = await importOriginal<typeof import('../util/googleDrive')>();
    return {
        ...actual, // keep DriveApiError and DRIVE_LIBRARY_FILE_NAME real
        findLibraryFile: vi.fn(),
        downloadFileText: vi.fn(),
        createFile: vi.fn(),
        updateFile: vi.fn(),
    };
});

const auth = vi.mocked(googleAuth);
const drive = vi.mocked(googleDrive);

function validLibraryJson(): string {
    return JSON.stringify({
        format: 'mcb-song-library',
        version: 1,
        savedAt: new Date().toISOString(),
        songs: [],
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.getAccessToken.mockResolvedValue('tok');
    useSongStore.setState({ songs: [], currentSongId: null });
    useGoogleDriveStore.setState({
        connected: false,
        fileId: null,
        lastSyncedAt: null,
        busy: null,
        error: null,
    });
});

describe('saveToDrive', () => {
    it('creates the file when none exists and persists the id', async () => {
        drive.findLibraryFile.mockResolvedValue(null);
        drive.createFile.mockResolvedValue('new-id');

        expect(await useGoogleDriveStore.getState().saveToDrive()).toBe(true);

        expect(drive.createFile).toHaveBeenCalledWith('tok', expect.stringContaining('mcb-song-library'));
        const state = useGoogleDriveStore.getState();
        expect(state.connected).toBe(true);
        expect(state.fileId).toBe('new-id');
        expect(state.error).toBeNull();
        expect(JSON.parse(localStorage.getItem('mcb-google-drive')!)).toMatchObject({
            connected: true,
            fileId: 'new-id',
        });
    });

    it('updates in place when the file id is known', async () => {
        useGoogleDriveStore.setState({ fileId: 'known-id' });
        drive.updateFile.mockResolvedValue(undefined);

        expect(await useGoogleDriveStore.getState().saveToDrive()).toBe(true);

        expect(drive.updateFile).toHaveBeenCalledWith('tok', 'known-id', expect.any(String));
        expect(drive.findLibraryFile).not.toHaveBeenCalled();
        expect(drive.createFile).not.toHaveBeenCalled();
    });

    it('recovers from a stale file id by finding or recreating the file', async () => {
        useGoogleDriveStore.setState({ fileId: 'stale-id' });
        drive.updateFile.mockRejectedValueOnce(new DriveApiError(404, 'gone'));
        drive.findLibraryFile.mockResolvedValue(null);
        drive.createFile.mockResolvedValue('fresh-id');

        expect(await useGoogleDriveStore.getState().saveToDrive()).toBe(true);
        expect(useGoogleDriveStore.getState().fileId).toBe('fresh-id');
    });

    it('retries once with a fresh token on 401', async () => {
        drive.findLibraryFile
            .mockRejectedValueOnce(new DriveApiError(401, 'expired'))
            .mockResolvedValueOnce(null);
        drive.createFile.mockResolvedValue('id-after-retry');

        expect(await useGoogleDriveStore.getState().saveToDrive()).toBe(true);

        expect(auth.clearCachedToken).toHaveBeenCalledOnce();
        expect(auth.getAccessToken).toHaveBeenCalledTimes(2);
    });

    it('surfaces auth errors and reports failure', async () => {
        auth.getAccessToken.mockRejectedValue(new Error('Google sign-in was cancelled.'));

        expect(await useGoogleDriveStore.getState().saveToDrive()).toBe(false);

        const state = useGoogleDriveStore.getState();
        expect(state.error).toBe('Google sign-in was cancelled.');
        expect(state.busy).toBeNull();
        expect(state.connected).toBe(false);
    });
});

describe('loadFromDrive', () => {
    it('returns the parsed library and remembers the file id', async () => {
        drive.findLibraryFile.mockResolvedValue({ id: 'f1', modifiedTime: 't' });
        drive.downloadFileText.mockResolvedValue(validLibraryJson());

        const file = await useGoogleDriveStore.getState().loadFromDrive();

        expect(file?.format).toBe('mcb-song-library');
        expect(useGoogleDriveStore.getState().fileId).toBe('f1');
        expect(useGoogleDriveStore.getState().connected).toBe(true);
    });

    it('uses the stored file id without searching', async () => {
        useGoogleDriveStore.setState({ fileId: 'known-id' });
        drive.downloadFileText.mockResolvedValue(validLibraryJson());

        expect(await useGoogleDriveStore.getState().loadFromDrive()).not.toBeNull();
        expect(drive.downloadFileText).toHaveBeenCalledWith('tok', 'known-id');
        expect(drive.findLibraryFile).not.toHaveBeenCalled();
    });

    it('falls back to search when the stored id is stale', async () => {
        useGoogleDriveStore.setState({ fileId: 'stale-id' });
        drive.downloadFileText
            .mockRejectedValueOnce(new DriveApiError(404, 'gone'))
            .mockResolvedValueOnce(validLibraryJson());
        drive.findLibraryFile.mockResolvedValue({ id: 'found-id', modifiedTime: 't' });

        expect(await useGoogleDriveStore.getState().loadFromDrive()).not.toBeNull();
        expect(useGoogleDriveStore.getState().fileId).toBe('found-id');
    });

    it('sets a friendly error when no Drive file exists', async () => {
        drive.findLibraryFile.mockResolvedValue(null);

        expect(await useGoogleDriveStore.getState().loadFromDrive()).toBeNull();
        expect(useGoogleDriveStore.getState().error).toContain('No chordbuildr-songs.json found');
    });

    it('rejects invalid JSON without touching the library', async () => {
        drive.findLibraryFile.mockResolvedValue({ id: 'f1', modifiedTime: 't' });
        drive.downloadFileText.mockResolvedValue('not json {');

        expect(await useGoogleDriveStore.getState().loadFromDrive()).toBeNull();
        expect(useGoogleDriveStore.getState().error).toBe("The Drive file isn't valid JSON.");
    });

    it('rejects JSON that is not a song library', async () => {
        drive.findLibraryFile.mockResolvedValue({ id: 'f1', modifiedTime: 't' });
        drive.downloadFileText.mockResolvedValue('{"format":"other"}');

        expect(await useGoogleDriveStore.getState().loadFromDrive()).toBeNull();
        expect(useGoogleDriveStore.getState().error).toBe(
            "The Drive file isn't a chordbuildr song library."
        );
    });
});

describe('disconnect', () => {
    it('revokes access and clears persisted state', async () => {
        useGoogleDriveStore.setState({ connected: true, fileId: 'f1' });
        localStorage.setItem('mcb-google-drive', JSON.stringify({ connected: true, fileId: 'f1' }));

        useGoogleDriveStore.getState().disconnect();

        expect(auth.revokeAccess).toHaveBeenCalledOnce();
        expect(useGoogleDriveStore.getState().connected).toBe(false);
        expect(useGoogleDriveStore.getState().fileId).toBeNull();
        expect(localStorage.getItem('mcb-google-drive')).toBeNull();
    });
});
