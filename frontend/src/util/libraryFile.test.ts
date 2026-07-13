import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    supportsFilePicker,
    linkedFileName,
    setLinkedFile,
    pickLibraryFile,
    saveToLinkedFile,
    LibraryFileHandle,
} from './libraryFile';

// A stub handle standing in for a File System Access API file handle. The
// writable records what was written so save() can be asserted against it.
function makeHandle(overrides: Partial<LibraryFileHandle> & { contents?: string } = {}): {
    handle: LibraryFileHandle;
    written: string[];
    closed: () => boolean;
} {
    const written: string[] = [];
    let didClose = false;
    const handle: LibraryFileHandle = {
        name: overrides.name ?? 'songs.json',
        getFile: overrides.getFile ?? (async () =>
            new File([overrides.contents ?? '{"songs":[]}'], 'songs.json')),
        createWritable: overrides.createWritable ?? (async () => ({
            write: async (data: string) => { written.push(data); },
            close: async () => { didClose = true; },
        })),
        requestPermission: overrides.requestPermission,
    };
    return { handle, written, closed: () => didClose };
}

beforeEach(() => {
    setLinkedFile(null);
    vi.restoreAllMocks();
});
afterEach(() => {
    setLinkedFile(null);
    delete (window as { showOpenFilePicker?: unknown }).showOpenFilePicker;
});

describe('supportsFilePicker', () => {
    it('is true only when showOpenFilePicker exists on window', () => {
        delete (window as { showOpenFilePicker?: unknown }).showOpenFilePicker;
        expect(supportsFilePicker()).toBe(false);
        (window as { showOpenFilePicker?: unknown }).showOpenFilePicker = () => {};
        expect(supportsFilePicker()).toBe(true);
    });
});

describe('linkedFileName / setLinkedFile', () => {
    it('starts null and reflects the linked handle name', () => {
        expect(linkedFileName()).toBeNull();
        const { handle } = makeHandle({ name: 'my-lib.json' });
        setLinkedFile(handle);
        expect(linkedFileName()).toBe('my-lib.json');
        setLinkedFile(null);
        expect(linkedFileName()).toBeNull();
    });
});

describe('pickLibraryFile', () => {
    it('reads the chosen file and returns its text and handle', async () => {
        const { handle } = makeHandle({ contents: '{"songs":[1]}' });
        (window as { showOpenFilePicker?: unknown }).showOpenFilePicker =
            vi.fn(async () => [handle]);

        const result = await pickLibraryFile();
        expect(result).not.toBeNull();
        expect(result!.text).toBe('{"songs":[1]}');
        expect(result!.handle).toBe(handle);
    });

    it('returns null when the user cancels the picker', async () => {
        (window as { showOpenFilePicker?: unknown }).showOpenFilePicker =
            vi.fn(async () => { throw new DOMException('aborted', 'AbortError'); });

        expect(await pickLibraryFile()).toBeNull();
    });
});

describe('saveToLinkedFile', () => {
    it('returns false when no file is linked', async () => {
        expect(await saveToLinkedFile('data')).toBe(false);
    });

    it('writes and closes the linked file, returning true', async () => {
        const { handle, written, closed } = makeHandle();
        setLinkedFile(handle);

        expect(await saveToLinkedFile('{"songs":[]}')).toBe(true);
        expect(written).toEqual(['{"songs":[]}']);
        expect(closed()).toBe(true);
    });

    it('requests readwrite permission and bails out when denied', async () => {
        const requestPermission = vi.fn(async () => 'denied' as PermissionState);
        const createWritable = vi.fn();
        const { handle } = makeHandle({ requestPermission, createWritable });
        setLinkedFile(handle);

        expect(await saveToLinkedFile('data')).toBe(false);
        expect(requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
        expect(createWritable).not.toHaveBeenCalled();
    });

    it('proceeds when permission is granted', async () => {
        const requestPermission = vi.fn(async () => 'granted' as PermissionState);
        const { handle, written } = makeHandle({ requestPermission });
        setLinkedFile(handle);

        expect(await saveToLinkedFile('payload')).toBe(true);
        expect(written).toEqual(['payload']);
    });

    it('returns false when the write throws (moved file, revoked access)', async () => {
        const { handle } = makeHandle({
            createWritable: async () => ({
                write: async () => { throw new Error('gone'); },
                close: async () => {},
            }),
        });
        setLinkedFile(handle);

        expect(await saveToLinkedFile('data')).toBe(false);
    });
});
