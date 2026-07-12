/**
 * Thin Google Drive v3 REST client for the song library file. Uses plain
 * fetch — the full gapi client would be overkill for four endpoints. All
 * functions take the OAuth token from util/googleAuth.ts; with the
 * drive.file scope these calls only ever see files this app created.
 */

export const DRIVE_LIBRARY_FILE_NAME = 'chordbuildr-songs.json';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'DriveApiError';
        this.status = status;
    }
}

async function driveFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, ...init.headers },
    });
    if (!res.ok) {
        throw new DriveApiError(res.status, `Google Drive request failed (${res.status})`);
    }
    return res;
}

/**
 * Find the library file by name. Returns the most recently modified match,
 * or null when none exists.
 */
export async function findLibraryFile(
    token: string
): Promise<{ id: string; modifiedTime: string } | null> {
    const query = `name = '${DRIVE_LIBRARY_FILE_NAME}' and trashed = false`;
    const params = new URLSearchParams({
        q: query,
        fields: 'files(id,name,modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: '1',
    });
    const res = await driveFetch(token, `${API}/files?${params}`);
    const data = (await res.json()) as { files?: { id: string; modifiedTime: string }[] };
    return data.files?.[0] ?? null;
}

export async function downloadFileText(token: string, fileId: string): Promise<string> {
    const res = await driveFetch(token, `${API}/files/${fileId}?alt=media`);
    return res.text();
}

/** Create the library file in the user's Drive. Returns the new file id. */
export async function createFile(token: string, content: string): Promise<string> {
    const boundary = 'mcb-song-library-boundary';
    const metadata = JSON.stringify({
        name: DRIVE_LIBRARY_FILE_NAME,
        mimeType: 'application/json',
    });
    const body =
        `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        'Content-Type: application/json\r\n\r\n' +
        `${content}\r\n` +
        `--${boundary}--`;
    const res = await driveFetch(token, `${UPLOAD}/files?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
    });
    const data = (await res.json()) as { id: string };
    return data.id;
}

/** Overwrite an existing Drive file's content in place. */
export async function updateFile(token: string, fileId: string, content: string): Promise<void> {
    await driveFetch(token, `${UPLOAD}/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: content,
    });
}
