import React, { useMemo } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button } from '../Button';
import { useSongStore } from '../../stores/songStore';
import {
    detectFormat,
    normalizeToChordPro,
    parseSong,
    songToText,
} from '../../util/SongSheetParser';
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
    const createSong = useSongStore(state => state.createSong);
    const renameSong = useSongStore(state => state.renameSong);

    const currentSong = songs.find(s => s.id === currentSongId) ?? null;

    // Parse against the inline form regardless of how the document stores its
    // chords: sources kept in the chords-above format are normalized first
    // (a no-op for inline/plain sources), so sheet view, Step and exports
    // always see the chords.
    const rawSource = currentSong?.source ?? '';
    const inlineSource = useMemo(() => normalizeToChordPro(rawSource), [rawSource]);
    const parsed = useMemo(() => parseSong(inlineSource), [inlineSource]);

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
                            ) : (
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
        </div>
    );
};

export default SongSheetPage;
