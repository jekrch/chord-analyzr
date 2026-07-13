import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowsPointingInIcon,
    BookmarkIcon,
    BookmarkSlashIcon,
    CameraIcon,
    DocumentTextIcon,
    PrinterIcon,
    XMarkIcon,
} from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { Song, useSongStore } from '../../stores/songStore';
import { ParsedSong } from '../../util/SongSheetParser';
import {
    exportSongImage,
    exportSongPdf,
    exportSongText,
    withSheetPrintNode,
} from '../../util/songExport';
import SheetExportControls from './SheetExportControls';

interface SheetFullscreenMenuProps {
    song: Song;
    parsed: ParsedSong;
    isOpen: boolean;
    onClose: () => void;
    onExitFullscreen: () => void;
}

const CLOSE_DURATION_MS = 340;

/**
 * A right-side flyover for the full-screen sheet: switch between songs in the
 * library and restyle how the sheet reads on screen — columns, margin, line
 * spacing and lyric / chord sizes, applied live (and shared with print /
 * image export). Slides in over the sheet without covering it, reusing the
 * app's fullscreen menu motion.
 */
const SheetFullscreenMenu: React.FC<SheetFullscreenMenuProps> = ({
    song,
    parsed,
    isOpen,
    onClose,
    onExitFullscreen,
}) => {
    const songs = useSongStore(state => state.songs);
    const selectSong = useSongStore(state => state.selectSong);
    const globalSettings = useSongStore(state => state.sheetExportSettings);

    // The song's own saved view wins; otherwise the sliders edit the shared
    // default (and drive every song without its own view).
    const hasView = !!song.viewSettings;
    const effective = song.viewSettings ?? globalSettings;
    const applyLayout = (patch: Partial<typeof effective>) => {
        const store = useSongStore.getState();
        if (song.viewSettings) store.updateSongViewSettings(song.id, patch);
        else store.setSheetExportSettings(patch);
    };

    const [mounted, setMounted] = useState(false);
    const [phase, setPhase] = useState<'enter' | 'open' | 'closing'>('enter');
    const closeTimer = useRef<ReturnType<typeof setTimeout>>();
    const panelRef = useRef<HTMLDivElement>(null);

    // Mount, flip to open next frame so the transition runs; on close, play
    // the exit transition before unmounting (mirrors FullScreenMenu).
    useEffect(() => {
        if (isOpen) {
            clearTimeout(closeTimer.current);
            setMounted(true);
            setPhase('enter');
            const raf = requestAnimationFrame(() =>
                requestAnimationFrame(() => setPhase('open'))
            );
            return () => cancelAnimationFrame(raf);
        }
        if (mounted) {
            setPhase('closing');
            closeTimer.current = setTimeout(() => setMounted(false), CLOSE_DURATION_MS);
            return () => clearTimeout(closeTimer.current);
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escape, and clicking the sheet outside the panel, close the flyover
    // only — the fullscreen overlay's own Escape handler skips while this is
    // open (see SongSheetPage), so one press peels back one layer. The panel
    // never covers the sheet (the root is click-through), so the sheet stays
    // visible and scrollable while its layout is tuned.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) onClose();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
        };
    }, [isOpen, onClose]);

    if (!mounted) return null;

    const stateClass = phase === 'open' ? 'is-open' : phase === 'closing' ? 'is-closing' : '';

    // Export what's on screen: the song's saved view when it has one.
    const handlePrint = () => withSheetPrintNode(() => exportSongPdf(effective));
    const handleSaveImage = () =>
        withSheetPrintNode(node => exportSongImage(node, song.title, effective));

    const actionClass =
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[0.6875rem] font-medium rounded-md border border-[var(--mcb-border-subtle)] bg-mcb-input text-mcb-secondary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors';

    return createPortal(
        // Click-through root: the panel floats over the right edge while the
        // sheet behind stays fully visible and scrollable as the live preview.
        <div className="fixed inset-0 z-[960] pointer-events-none" data-sheet-flyover>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="false"
                aria-label="Sheet options"
                className={`mcb-fullmenu ${stateClass} overflow-hidden pointer-events-auto`}
                style={{ width: 'min(92vw, 22rem)' }}
            >
                {/* Top bar */}
                <div
                    className="mcb-fullmenu-item flex items-center justify-between px-5 py-4 border-b border-mcb-subtle"
                    style={{ '--stagger': '40ms' } as React.CSSProperties}
                >
                    <span className="mcb-label">Sheet options</span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-mcb-subtle text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] hover:border-mcb-primary transition-all duration-200"
                        title="Close (Esc)"
                        aria-label="Close sheet options"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
                    {/* Song picker */}
                    <div
                        className="mcb-fullmenu-item"
                        style={{ '--stagger': '110ms' } as React.CSSProperties}
                    >
                        <div className="mcb-label !text-[0.625rem] mb-2">Song</div>
                        <div className="mcb-inset rounded-md overflow-hidden max-h-56 overflow-y-auto divide-y divide-[var(--mcb-border-subtle)]">
                            {songs.length === 0 && (
                                <p className="px-3 py-3 text-xs text-mcb-tertiary">No songs yet.</p>
                            )}
                            {songs.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => selectSong(s.id)}
                                    className={classNames(
                                        'w-full px-3 py-2 flex items-center gap-2 text-left transition-colors',
                                        s.id === song.id
                                            ? 'bg-[var(--mcb-accent-primary)]/15 text-[var(--mcb-accent-text-primary)]'
                                            : 'text-mcb-secondary hover:bg-[var(--mcb-bg-hover)] hover:text-white'
                                    )}
                                >
                                    <span className="flex-1 min-w-0 flex flex-col items-start">
                                        <span className="text-xs font-medium truncate w-full">
                                            {s.title || 'Untitled'}
                                        </span>
                                        <span className="text-[0.625rem] text-mcb-tertiary">
                                            {new Date(s.updatedAt).toLocaleDateString()}
                                        </span>
                                    </span>
                                    {s.viewSettings && (
                                        <BookmarkIcon
                                            className="w-3.5 h-3.5 shrink-0 text-[var(--mcb-accent-text-primary)]"
                                            title="Has a saved view"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* On-screen reading layout (also drives print / image) */}
                    <div
                        className="mcb-fullmenu-item"
                        style={{ '--stagger': '160ms' } as React.CSSProperties}
                    >
                        <div className="flex items-center justify-between mb-2 gap-2">
                            <span className="mcb-label !text-[0.625rem] flex items-center gap-1.5">
                                Layout
                                {hasView && (
                                    <span className="normal-case tracking-normal text-[0.5625rem] font-medium text-[var(--mcb-accent-text-primary)]">
                                        · this song
                                    </span>
                                )}
                            </span>
                            {hasView ? (
                                <button
                                    onClick={() => useSongStore.getState().clearSongView(song.id)}
                                    className="inline-flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-mcb-tertiary hover:text-[var(--mcb-text-primary)] transition-colors"
                                    title="Drop this song's saved view and use the shared default"
                                >
                                    <BookmarkSlashIcon className="w-3 h-3" />
                                    Use default
                                </button>
                            ) : (
                                <button
                                    onClick={() => useSongStore.getState().saveSongView(song.id)}
                                    className="inline-flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-[var(--mcb-accent-text-primary)] hover:brightness-125 transition-all"
                                    title="Save the current layout to this song"
                                >
                                    <BookmarkIcon className="w-3 h-3" />
                                    Save to song
                                </button>
                            )}
                        </div>
                        <SheetExportControls
                            settings={effective}
                            onChange={applyLayout}
                            showOrientation={false}
                            showScreenWidth
                        />
                        <p className="mt-3 text-[0.625rem] text-mcb-tertiary leading-relaxed">
                            {hasView
                                ? 'This song opens with its own saved layout — changes here stay with it.'
                                : 'Adjusting the shared default. Save it to this song to keep this layout whenever you open it.'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div
                    className="mcb-fullmenu-item px-5 py-4 border-t border-mcb-subtle space-y-2"
                    style={{ '--stagger': '210ms' } as React.CSSProperties}
                >
                    <div className="flex items-center gap-1.5">
                        <button onClick={handlePrint} className={`${actionClass} flex-1 justify-center`} title="Print / save as PDF">
                            <PrinterIcon className="w-3.5 h-3.5 shrink-0" />
                            Print
                        </button>
                        <button onClick={handleSaveImage} className={`${actionClass} flex-1 justify-center`} title="Export as image (.png)">
                            <CameraIcon className="w-3.5 h-3.5 shrink-0" />
                            Image
                        </button>
                        <button
                            onClick={() => exportSongText(parsed, song.title)}
                            className={`${actionClass} flex-1 justify-center`}
                            title="Export as text (.txt)"
                        >
                            <DocumentTextIcon className="w-3.5 h-3.5 shrink-0" />
                            Text
                        </button>
                    </div>
                    <button
                        onClick={onExitFullscreen}
                        className={`${actionClass} w-full justify-center`}
                        title="Exit full screen (Esc)"
                    >
                        <ArrowsPointingInIcon className="w-3.5 h-3.5 shrink-0" />
                        Exit full screen
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SheetFullscreenMenu;
