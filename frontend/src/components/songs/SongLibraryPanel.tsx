import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    CloudArrowDownIcon,
    CloudArrowUpIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/20/solid';
import classNames from 'classnames';
import Modal from '../Modal';
import { Button } from '../Button';
import {
    SongLibraryFile,
    isSongLibraryFile,
    useSongStore,
} from '../../stores/songStore';
import { useGoogleDriveStore } from '../../stores/googleDriveStore';
import { isDriveConfigured } from '../../util/googleAuth';
import { downloadBlob } from '../../util/songExport';
import {
    LibraryFileHandle,
    linkedFileName,
    pickLibraryFile,
    saveToLinkedFile,
    setLinkedFile,
    supportsFilePicker,
} from '../../util/libraryFile';

/**
 * The song library: pick/create/delete songs, and save or load the whole
 * library as a single JSON file so it can grow across sessions and devices.
 */
const SongLibraryPanel: React.FC = () => {
    const songs = useSongStore(state => state.songs);
    const currentSongId = useSongStore(state => state.currentSongId);
    const selectSong = useSongStore(state => state.selectSong);
    const createSong = useSongStore(state => state.createSong);
    const deleteSong = useSongStore(state => state.deleteSong);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [pendingImport, setPendingImport] = useState<
        { file: SongLibraryFile; handle?: LibraryFileHandle } | null
    >(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [linkedName, setLinkedName] = useState<string | null>(linkedFileName());
    const [savedNotice, setSavedNotice] = useState<string | null>(null);

    const driveConnected = useGoogleDriveStore(state => state.connected);
    const driveBusy = useGoogleDriveStore(state => state.busy);
    const driveError = useGoogleDriveStore(state => state.error);
    const saveToDrive = useGoogleDriveStore(state => state.saveToDrive);
    const loadFromDrive = useGoogleDriveStore(state => state.loadFromDrive);
    const disconnectDrive = useGoogleDriveStore(state => state.disconnect);

    const handleSaveLibrary = useCallback(async () => {
        const file = useSongStore.getState().exportLibrary();
        const json = JSON.stringify(file, null, 2);
        if (await saveToLinkedFile(json)) {
            // Writing in place shows no download bar, so confirm it briefly
            setSavedNotice(`Saved to ${linkedFileName()}`);
            setTimeout(() => setSavedNotice(null), 2500);
            return;
        }
        downloadBlob(json, 'chordbuildr-songs.json', 'application/json');
    }, []);

    // Ctrl/Cmd+S saves the library instead of opening the browser's save
    // dialog. The panel only mounts on the songs page, so the shortcut is
    // scoped to it — including while typing in the source editor.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSaveLibrary();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleSaveLibrary]);

    const applyLibraryText = (text: string, handle?: LibraryFileHandle) => {
        setImportError(null);
        try {
            const data = JSON.parse(text);
            if (!isSongLibraryFile(data)) {
                setImportError('That file is not a chordbuildr song library.');
                return;
            }
            if (useSongStore.getState().songs.length === 0) {
                useSongStore.getState().importLibrary(data, 'replace');
                linkFile(handle ?? null);
            } else {
                setPendingImport({ file: data, handle });
            }
        } catch {
            setImportError('Could not read that file as JSON.');
        }
    };

    const linkFile = (handle: LibraryFileHandle | null) => {
        setLinkedFile(handle);
        setLinkedName(handle?.name ?? null);
    };

    const handleLoadClick = async () => {
        if (!supportsFilePicker()) {
            fileInputRef.current?.click();
            return;
        }
        const picked = await pickLibraryFile();
        if (picked) applyLibraryText(picked.text, picked.handle);
    };

    const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file later
        if (!file) return;
        setImportError(null);
        const reader = new FileReader();
        reader.onload = () => applyLibraryText(String(reader.result));
        reader.onerror = () => setImportError('Could not read that file.');
        reader.readAsText(file);
    };

    const handleDriveSave = async () => {
        if (await saveToDrive()) {
            setSavedNotice('Saved to Google Drive');
            setTimeout(() => setSavedNotice(null), 2500);
        }
    };

    const handleDriveLoad = async () => {
        setImportError(null);
        const data = await loadFromDrive();
        if (!data) return;
        if (useSongStore.getState().songs.length === 0) {
            useSongStore.getState().importLibrary(data, 'replace');
        } else {
            setPendingImport({ file: data });
        }
    };

    const resolveImport = (mode: 'replace' | 'merge') => {
        if (pendingImport) {
            useSongStore.getState().importLibrary(pendingImport.file, mode);
            if (pendingImport.handle) linkFile(pendingImport.handle);
        }
        setPendingImport(null);
    };

    const deleteTargetSong = songs.find(s => s.id === deleteTarget);

    return (
        <div className="mcb-panel !rounded-lg overflow-hidden flex flex-col sm:w-56 flex-shrink-0 self-start w-full">
            <div className="mcb-panel-header !py-1.5 flex items-center justify-between">
                <span className="mcb-label">Songs</span>
                <button
                    onClick={() => createSong()}
                    className="flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-[var(--mcb-accent-text-primary)] hover:brightness-125 transition-all"
                    title="New song"
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                    New
                </button>
            </div>

            <div className="max-h-64 sm:max-h-96 overflow-y-auto">
                {songs.length === 0 && (
                    <p className="px-3 py-3 text-xs text-mcb-tertiary text-left">
                        No songs yet — create one or load a library file.
                    </p>
                )}
                {songs.map(song => (
                    <div
                        key={song.id}
                        className={classNames(
                            'w-full px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors group text-left',
                            song.id === currentSongId
                                ? 'bg-[var(--mcb-accent-primary)]/15 text-[var(--mcb-accent-text-primary)]'
                                : 'text-mcb-secondary hover:bg-[var(--mcb-bg-hover)] hover:text-white'
                        )}
                        onClick={() => selectSong(song.id)}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{song.title || 'Untitled'}</div>
                            <div className="text-[0.625rem] text-mcb-tertiary">
                                {new Date(song.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                setDeleteTarget(song.id);
                            }}
                            className="p-1 rounded text-mcb-tertiary opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-[var(--mcb-danger-text)] transition-all flex-shrink-0"
                            title="Delete song"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="border-t border-[var(--mcb-border-subtle)] p-2 space-y-1.5">
                <div className="flex gap-1.5">
                    <Button
                        onClick={handleSaveLibrary}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        title={linkedName ? `Save to ${linkedName}` : 'Download all songs as a JSON library file'}
                    >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        Save
                    </Button>
                    <Button onClick={handleLoadClick} variant="secondary" size="sm" className="flex-1" title="Load a JSON library file">
                        <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                        Load
                    </Button>
                </div>
                {isDriveConfigured() && (
                    <>
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[0.625rem] uppercase tracking-wide text-mcb-tertiary">
                                Google Drive
                            </span>
                            {driveConnected && (
                                <button
                                    onClick={disconnectDrive}
                                    className="text-[0.625rem] text-mcb-tertiary underline hover:text-mcb-secondary transition-colors"
                                    title="Disconnect this app from your Google Drive"
                                >
                                    Disconnect
                                </button>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <Button
                                onClick={handleDriveSave}
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                disabled={driveBusy !== null}
                                title="Save all songs to a JSON file in your Google Drive"
                            >
                                <CloudArrowUpIcon className="w-3.5 h-3.5 shrink-0" />
                                {driveBusy === 'save' ? 'Saving…' : 'Save'}
                            </Button>
                            <Button
                                onClick={handleDriveLoad}
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                disabled={driveBusy !== null}
                                title="Load your song library from Google Drive"
                            >
                                <CloudArrowDownIcon className="w-3.5 h-3.5 shrink-0" />
                                {driveBusy === 'load' ? 'Loading…' : 'Load'}
                            </Button>
                        </div>
                        {driveError && (
                            <p className="text-[0.625rem] text-[var(--mcb-danger-text)] text-left">{driveError}</p>
                        )}
                    </>
                )}
                {importError && (
                    <p className="text-[0.625rem] text-[var(--mcb-danger-text)] text-left">{importError}</p>
                )}
                {savedNotice && (
                    <p className="text-[0.625rem] text-[var(--mcb-accent-text-primary)] text-left">{savedNotice}</p>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChosen}
                    className="hidden"
                />
            </div>

            {/* Delete confirmation */}
            <Modal
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                title="Delete song"
                className="max-w-sm"
            >
                <div className="p-4 space-y-4 text-left">
                    <p className="text-sm text-mcb-secondary">
                        Delete <span className="text-mcb-primary font-medium">{deleteTargetSong?.title || 'this song'}</span>?
                        This can't be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setDeleteTarget(null)} variant="secondary" size="sm">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (deleteTarget) deleteSong(deleteTarget);
                                setDeleteTarget(null);
                            }}
                            variant="danger"
                            size="sm"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Replace-or-merge choice when loading into a non-empty library */}
            <Modal
                isOpen={pendingImport !== null}
                onClose={() => setPendingImport(null)}
                title="Load library"
                className="max-w-sm"
            >
                <div className="p-4 space-y-4 text-left">
                    <p className="text-sm text-mcb-secondary">
                        The file contains {pendingImport?.file.songs.length ?? 0} song{(pendingImport?.file.songs.length ?? 0) === 1 ? '' : 's'}.
                        You already have {songs.length} — merge the file into your library, or replace it?
                    </p>
                    <p className="text-xs text-mcb-tertiary">
                        Merge keeps everything: new songs are added and conflicting copies are imported alongside yours.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setPendingImport(null)} variant="secondary" size="sm">
                            Cancel
                        </Button>
                        <Button onClick={() => resolveImport('replace')} variant="danger" size="sm">
                            Replace
                        </Button>
                        <Button onClick={() => resolveImport('merge')} variant="success" size="sm">
                            Merge
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SongLibraryPanel;
