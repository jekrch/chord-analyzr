import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DRIVE_LIBRARY_FILE_NAME,
    DriveApiError,
    createFile,
    downloadFileText,
    findLibraryFile,
    updateFile,
} from './googleDrive';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('findLibraryFile', () => {
    it('queries by name and returns the first match', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({ files: [{ id: 'f1', name: DRIVE_LIBRARY_FILE_NAME, modifiedTime: 't1' }] })
        );
        const found = await findLibraryFile('tok');
        expect(found).toEqual({ id: 'f1', name: DRIVE_LIBRARY_FILE_NAME, modifiedTime: 't1' });

        const [url, init] = fetchMock.mock.calls[0];
        const parsed = new URL(url as string);
        expect(parsed.pathname).toBe('/drive/v3/files');
        expect(parsed.searchParams.get('q')).toBe(
            `name = '${DRIVE_LIBRARY_FILE_NAME}' and trashed = false`
        );
        expect(parsed.searchParams.get('orderBy')).toBe('modifiedTime desc');
        expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
    });

    it('returns null when no file exists', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ files: [] }));
        expect(await findLibraryFile('tok')).toBeNull();
    });

    it('throws DriveApiError with the status on failure', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}, 401));
        await expect(findLibraryFile('tok')).rejects.toMatchObject(
            { name: 'DriveApiError', status: 401 }
        );
    });
});

describe('downloadFileText', () => {
    it('downloads with alt=media and returns the body text', async () => {
        fetchMock.mockResolvedValue(new Response('{"a":1}', { status: 200 }));
        expect(await downloadFileText('tok', 'f1')).toBe('{"a":1}');
        const [url] = fetchMock.mock.calls[0];
        expect(url).toContain('/files/f1?alt=media');
    });

    it('throws DriveApiError on 404', async () => {
        fetchMock.mockResolvedValue(new Response('', { status: 404 }));
        await expect(downloadFileText('tok', 'gone')).rejects.toMatchObject({ status: 404 });
        await expect(downloadFileText('tok', 'gone')).rejects.toBeInstanceOf(DriveApiError);
    });
});

describe('createFile', () => {
    it('posts a multipart body with metadata and content parts', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 'new-id' }));
        expect(await createFile('tok', '{"songs":[]}')).toBe('new-id');

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/upload/drive/v3/files?uploadType=multipart');
        expect(init.method).toBe('POST');
        const body = init.body as string;
        expect(body).toContain(`"name":"${DRIVE_LIBRARY_FILE_NAME}"`);
        expect(body).toContain('"mimeType":"application/json"');
        expect(body).toContain('{"songs":[]}');
        // Metadata part comes before the content part, and the body is
        // terminated with the closing boundary.
        expect(body.indexOf('"name"')).toBeLessThan(body.indexOf('{"songs":[]}'));
        expect(body.trimEnd().endsWith('--')).toBe(true);
    });
});

describe('updateFile', () => {
    it('patches the file content with uploadType=media', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 'f1' }));
        await updateFile('tok', 'f1', '{"songs":[]}');
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/upload/drive/v3/files/f1?uploadType=media');
        expect(init.method).toBe('PATCH');
        expect(init.body).toBe('{"songs":[]}');
    });

    it('throws DriveApiError on 404 so callers can recreate the file', async () => {
        fetchMock.mockResolvedValue(new Response('', { status: 404 }));
        await expect(updateFile('tok', 'stale', '{}')).rejects.toMatchObject({ status: 404 });
    });
});
