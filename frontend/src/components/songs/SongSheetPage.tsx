import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowsPointingInIcon, Bars3Icon, PlusIcon } from '@heroicons/react/20/solid';
import { Button } from '../Button';
import { useSongStore } from '../../stores/songStore';
import {
    detectFormat,
    normalizeToChordPro,
    parseSong,
    songToText,
} from '../../util/SongSheetParser';
import SheetFullscreenMenu from './SheetFullscreenMenu';
import SongLibraryPanel from './SongLibraryPanel';
import SongSheetView from './SongSheetView';
import SongSourceEditor from './SongSourceEditor';
import SongToolbar from './SongToolbar';
import './songSheetPrint.css';

/**
 * The song sheets page (#/songs): a library of lyric sheets with chord-aware
 * editing, playback and export. Rendered inside the app shell so the shared
 * piano keeps providing audio.
 */
const SongSheetPage: React.FC = () => {
    const songs = useSongStore(state => state.songs);
    const currentSongId = useSongStore(state => state.currentSongId);
    const viewMode = useSongStore(state => state.viewMode);
    const sheetFullscreen = useSongStore(state => state.sheetFullscreen);
    const setSheetFullscreen = useSongStore(state => state.setSheetFullscreen);
    const createSong = useSongStore(state => state.createSong);
    const renameSong = useSongStore(state => state.renameSong);
    const exportSettings = useSongStore(state => state.sheetExportSettings);

    // The full-screen sheet's flyover — song switcher + layout settings.
    const [menuOpen, setMenuOpen] = useState(false);

    // Keep the overlay mounted through its collapse animation: expand plays
    // on enter, collapse plays before unmount (mirrors the fullscreen menu).
    const [overlayMounted, setOverlayMounted] = useState(false);
    const [overlayPhase, setOverlayPhase] = useState<'enter' | 'open' | 'closing'>('enter');
    const overlayCloseTimer = useRef<ReturnType<typeof setTimeout>>();

    const currentSong = songs.find(s => s.id === currentSongId) ?? null;

    // The layout the full-screen sheet reads with: the song's own saved view
    // if it has one, else the shared default.
    const fullscreenSettings = currentSong?.viewSettings ?? exportSettings;

    // Parse against the inline form regardless of how the document stores its
    // chords: sources kept in the chords-above format are normalized first
    // (a no-op for inline/plain sources), so sheet view, Step and exports
    // always see the chords.
    const rawSource = currentSong?.source ?? '';
    const inlineSource = useMemo(() => normalizeToChordPro(rawSource), [rawSource]);
    const parsed = useMemo(() => parseSong(inlineSource), [inlineSource]);

    // Escape leaves full screen (unless a chord picker is open — its own
    // Escape handling wins); lock body scroll while the overlay is up.
    useEffect(() => {
        if (!sheetFullscreen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            // A chord picker or the flyover handles its own Escape first, so
            // one press peels back one layer instead of dropping full screen.
            if (document.querySelector('[data-chord-picker]')) return;
            if (document.querySelector('[data-sheet-flyover]')) return;
            setSheetFullscreen(false);
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [sheetFullscreen, setSheetFullscreen]);

    // Leaving full screen dismisses the flyover with it.
    useEffect(() => {
        if (!sheetFullscreen) setMenuOpen(false);
    }, [sheetFullscreen]);

    // Drive the expand / collapse animation: mount and flip to `open` next
    // frame so the transition runs; on exit, play `closing` before unmount.
    useEffect(() => {
        if (sheetFullscreen) {
            clearTimeout(overlayCloseTimer.current);
            setOverlayMounted(true);
            setOverlayPhase('enter');
            const raf = requestAnimationFrame(() =>
                requestAnimationFrame(() => setOverlayPhase('open'))
            );
            return () => cancelAnimationFrame(raf);
        }
        if (overlayMounted) {
            setOverlayPhase('closing');
            overlayCloseTimer.current = setTimeout(() => setOverlayMounted(false), 320);
            return () => clearTimeout(overlayCloseTimer.current);
        }
    }, [sheetFullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sheet-view edits splice the inline source; write them back in the
    // document's own format so a chords-above document stays chords-above.
    const handleSheetSourceChange = (nextInline: string) => {
        if (!currentSong) return;
        const keepAbove = detectFormat(currentSong.source) === 'chords-over-lyrics';
        useSongStore.getState().updateSongSource(
            currentSong.id,
            keepAbove ? songToText(parseSong(nextInline)) : nextInline
        );
    };

    return (
        <div className="flex flex-col items-center px-3 pt-3 pb-24 text-sm text-left">
            <div className="w-full max-w-7xl flex flex-col sm:flex-row gap-3 items-start">
                <SongLibraryPanel />

                <div className="flex-1 min-w-0 w-full flex flex-col gap-2.5">
                    {currentSong ? (
                        <>
                            <input
                                value={currentSong.title}
                                onChange={e => renameSong(currentSong.id, e.target.value)}
                                placeholder="Song title"
                                spellCheck={false}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-[var(--mcb-border-subtle)] focus:border-[var(--mcb-accent-primary)] focus:bg-mcb-input rounded-md text-mcb-primary font-semibold placeholder-[var(--mcb-text-tertiary)] focus:outline-none transition-colors select-text"
                            />
                            <SongToolbar song={currentSong} parsed={parsed} />
                            {viewMode === 'edit' ? (
                                <SongSourceEditor song={currentSong} />
                            ) : !sheetFullscreen && (
                                // While full screen the sheet renders only in
                                // the overlay, so its print/export id stays
                                // unique in the document.
                                <SongSheetView
                                    song={currentSong}
                                    parsed={parsed}
                                    source={inlineSource}
                                    onSourceChange={handleSheetSourceChange}
                                />
                            )}
                        </>
                    ) : (
                        <div className="mcb-inset p-8 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm text-mcb-secondary">
                                Turn lyrics into chord-aware song sheets: paste text with or
                                without chords, click words to place chords, and hear them play.
                            </p>
                            <Button onClick={() => createSong()} variant="success" size="sm">
                                <PlusIcon className="w-4 h-4" />
                                New song
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {overlayMounted && currentSong && createPortal(
                <div
                    className={`mcb-sheet-overlay ${
                        overlayPhase === 'open' ? 'is-open' : overlayPhase === 'closing' ? 'is-closing' : ''
                    } fixed inset-0 z-[900] bg-mcb-app overflow-y-auto`}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Song sheet full screen"
                >
                    <div className="mcb-sheet-overlay-controls fixed top-4 right-4 z-10 flex items-center gap-2">
                        <button
                            onClick={() => setMenuOpen(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-full border border-mcb-subtle bg-mcb-app text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] hover:border-mcb-primary transition-all duration-200"
                            title="Songs & sheet options"
                            aria-label="Open sheet options"
                            aria-expanded={menuOpen}
                        >
                            <Bars3Icon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setSheetFullscreen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-full border border-mcb-subtle bg-mcb-app text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] hover:border-mcb-primary transition-all duration-200"
                            title="Exit full screen (Esc)"
                            aria-label="Exit full screen"
                        >
                            <ArrowsPointingInIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {/* The sheet sizes itself to its columns (see the
                        display-mode width in SongSheetView) and centers here. */}
                    <div className="mcb-sheet-overlay-content mx-auto px-4 sm:px-8 py-8 text-left text-sm">
                        <SongSheetView
                            song={currentSong}
                            parsed={parsed}
                            source={inlineSource}
                            onSourceChange={handleSheetSourceChange}
                            displayMode
                            settingsOverride={fullscreenSettings}
                        />
                    </div>

                    <SheetFullscreenMenu
                        song={currentSong}
                        parsed={parsed}
                        isOpen={menuOpen}
                        onClose={() => setMenuOpen(false)}
                        onExitFullscreen={() => setSheetFullscreen(false)}
                    />
                </div>,
                document.body
            )}
        </div>
    );
};

export default SongSheetPage;
