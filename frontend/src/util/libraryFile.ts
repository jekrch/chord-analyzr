/**
 * Write-back support for the song library file. Where the browser supports
 * the File System Access API (Chrome/Edge), loading a library keeps a handle
 * to the chosen file so Save can write back to it in place. Browsers without
 * the API (Firefox/Safari) fall back to the classic upload/download flow.
 *
 * The handle lives at module level: it can't survive a page reload, but it
 * keeps load/save linked for the whole session regardless of which component
 * triggers them.
 */

interface WritableLike {
    write(data: string): Promise<void>;
    close(): Promise<void>;
}

export interface LibraryFileHandle {
    name: string;
    getFile(): Promise<File>;
    createWritable(): Promise<WritableLike>;
    requestPermission?(opts: { mode: 'readwrite' }): Promise<PermissionState>;
}

let currentHandle: LibraryFileHandle | null = null;

export function supportsFilePicker(): boolean {
    return typeof (window as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function';
}

export function linkedFileName(): string | null {
    return currentHandle?.name ?? null;
}

export function setLinkedFile(handle: LibraryFileHandle | null): void {
    currentHandle = handle;
}

/**
 * Open the file picker and read the chosen library file. Returns null when
 * the user cancels. Only call when supportsFilePicker() is true.
 */
export async function pickLibraryFile(): Promise<{ text: string; handle: LibraryFileHandle } | null> {
    try {
        const picker = (window as unknown as {
            showOpenFilePicker(opts: unknown): Promise<LibraryFileHandle[]>;
        }).showOpenFilePicker;
        const [handle] = await picker({
            types: [{
                description: 'chordbuildr song library',
                accept: { 'application/json': ['.json'] },
            }],
        });
        const file = await handle.getFile();
        return { text: await file.text(), handle };
    } catch {
        return null; // user cancelled the picker
    }
}

/**
 * Write the library JSON back to the linked file. Returns false when there is
 * no linked file or the write fails (permission revoked, file moved, ...) so
 * the caller can fall back to a download.
 */
export async function saveToLinkedFile(content: string): Promise<boolean> {
    const handle = currentHandle;
    if (!handle) return false;
    try {
        if (handle.requestPermission &&
            (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
            return false;
        }
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
    } catch {
        return false;
    }
}
