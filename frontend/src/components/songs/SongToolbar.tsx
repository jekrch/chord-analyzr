import React, { useEffect, useState } from 'react';
import {
    ArrowDownIcon,
    ArrowPathIcon,
    ArrowRightStartOnRectangleIcon,
    ArrowUpIcon,
    CameraIcon,
    DocumentTextIcon,
    PencilSquareIcon,
    PlayIcon,
    PrinterIcon,
    QueueListIcon,
} from '@heroicons/react/20/solid';
import { Button } from '../Button';
import Dropdown from '../Dropdown';
import { AVAILABLE_KEYS } from '../../hooks/useIntegratedAppLogic';
import { useHashRoute } from '../../hooks/useHashRoute';
import { useMusicStore } from '../../stores/musicStore';
import { Song, playSheetChord, useSongStore } from '../../stores/songStore';
import { noteNameToNumber } from '../../util/NoteUtil';
import { inferKeyAndMode } from '../../util/ProgressionParser';
import { ParsedSong } from '../../util/SongSheetParser';
import { exportSongImage, exportSongPdf, exportSongText } from '../../util/songExport';

interface SongToolbarProps {
    song: Song;
    parsed: ParsedSong;
}

/** Wait for the sheet view to be visible, then hand its node to `action`. */
function withSheetNode(action: (node: HTMLElement) => void) {
    useSongStore.getState().setViewMode('sheet');
    setTimeout(() => {
        const node = document.getElementById('song-sheet-print');
        if (node) action(node);
    }, 150);
}

const SongToolbar: React.FC<SongToolbarProps> = ({ song, parsed }) => {
    const viewMode = useSongStore(state => state.viewMode);
    const setViewMode = useSongStore(state => state.setViewMode);
    const stepIndex = useSongStore(state => state.stepIndex);
    const resetStep = useSongStore(state => state.resetStep);
    const inferredKeyMode = useSongStore(state => state.inferredKeyMode);
    const modes = useMusicStore(state => state.modes);
    const globalKey = useMusicStore(state => state.key);
    const globalMode = useMusicStore(state => state.mode);
    const [, navigate] = useHashRoute();
    const [isLoadingProgression, setIsLoadingProgression] = useState(false);

    const totalChords = parsed.chordSequence.length;

    // The key/mode the sheet plays in: the song's own choice, else the one
    // detected from its chords, else the app's global key/mode.
    const hasExplicitKey = !!(song.key && song.mode);
    const inferredForSong = inferredKeyMode?.songId === song.id ? inferredKeyMode : null;
    const sheetKey = song.key ?? inferredForSong?.key ?? globalKey;
    const sheetMode = song.mode ?? inferredForSong?.mode ?? globalMode;

    // Detect the key/mode from the song's chords whenever it has no explicit
    // choice; keyed by the chord sequence so edits re-run the detection.
    const chordSignature = parsed.chordSequence.map(c => c.name).join('|');
    useEffect(() => {
        if (hasExplicitKey || !totalChords || !modes.length) return;
        let cancelled = false;
        inferKeyAndMode(parsed.chordSequence.map(c => c.parsed), modes)
            .then(suggestion => {
                if (suggestion && !cancelled) {
                    useSongStore.getState().setInferredKeyMode(song.id, suggestion.key, suggestion.mode);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [song.id, hasExplicitKey, chordSignature, modes]);

    const handleStep = () => {
        const index = useSongStore.getState().stepNext(totalChords);
        if (index !== null) playSheetChord(parsed.chordSequence[index]);
    };

    const handleLoadProgression = async () => {
        if (isLoadingProgression || !totalChords) return;
        setIsLoadingProgression(true);
        try {
            const loaded = await useSongStore.getState().loadSongIntoProgression(parsed);
            if (loaded > 0) navigate('main');
        } finally {
            setIsLoadingProgression(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {/* Edit / Sheet toggle */}
            <Button
                onClick={() => setViewMode('edit')}
                variant="secondary"
                size="sm"
                active={viewMode === 'edit'}
                title="Edit the raw lyrics text"
            >
                <PencilSquareIcon className="w-3.5 h-3.5" />
                Edit
            </Button>
            <Button
                onClick={() => setViewMode('sheet')}
                variant="secondary"
                size="sm"
                active={viewMode === 'sheet'}
                title="Rendered sheet — click words to place chords"
            >
                <QueueListIcon className="w-3.5 h-3.5" />
                Sheet
            </Button>

            <div className="w-px h-5 bg-[var(--mcb-border-primary)] mx-1" />

            {/* Step through the song's chords, one click per chord */}
            <Button
                onClick={handleStep}
                variant="primary"
                size="sm"
                disabled={!totalChords}
                title="Play the next chord in the song"
            >
                <PlayIcon className="w-3.5 h-3.5" />
                Step
                <span className="font-mono text-[0.625rem] text-mcb-tertiary">
                    {stepIndex === null ? 0 : stepIndex + 1}/{totalChords}
                </span>
            </Button>
            <Button
                onClick={resetStep}
                variant="icon"
                size="icon"
                disabled={stepIndex === null}
                title="Reset to the start of the song"
                aria-label="Reset step position"
            >
                <ArrowPathIcon className="w-3.5 h-3.5" />
            </Button>

            <div className="w-px h-5 bg-[var(--mcb-border-primary)] mx-1" />

            {/* Key/mode the sheet plays in, plus semitone transposition.
                Picking a different key transposes the song's chords to it. */}
            <div
                className="flex items-center gap-1.5"
                title={hasExplicitKey
                    ? 'Key and mode for this song — picking a new key transposes the chords'
                    : 'Key and mode detected from the song\'s chords — picking a new key transposes the chords'}
            >
                <Dropdown
                    value={sheetKey}
                    onChange={(key: string) => {
                        const semitones =
                            ((noteNameToNumber(key) - noteNameToNumber(sheetKey)) % 12 + 12) % 12;
                        useSongStore.getState().transposeSong(song.id, semitones, key);
                    }}
                    options={AVAILABLE_KEYS}
                    className="w-[5.5rem]"
                    buttonClassName="px-2.5 py-1 font-medium text-xs h-7 flex items-center"
                    menuClassName="min-w-[5.5rem]"
                />
                <Dropdown
                    value={sheetMode}
                    onChange={mode => useSongStore.getState().setSongKeyMode(song.id, sheetKey, mode)}
                    options={modes}
                    showSearch
                    className="w-[7.5rem]"
                    buttonClassName="px-2 py-1 text-left font-medium text-xs h-7 flex items-center"
                    menuClassName="min-w-[7.5rem]"
                />
                {!hasExplicitKey && (
                    <span className="mcb-label !text-[0.5625rem] text-mcb-tertiary select-none">
                        auto
                    </span>
                )}
            </div>
            <Button
                onClick={() => useSongStore.getState().transposeSong(song.id, -1)}
                variant="icon"
                size="icon"
                disabled={!totalChords}
                title="Transpose down a semitone"
                aria-label="Transpose down a semitone"
            >
                <ArrowDownIcon className="w-3.5 h-3.5" />
            </Button>
            <Button
                onClick={() => useSongStore.getState().transposeSong(song.id, 1)}
                variant="icon"
                size="icon"
                disabled={!totalChords}
                title="Transpose up a semitone"
                aria-label="Transpose up a semitone"
            >
                <ArrowUpIcon className="w-3.5 h-3.5" />
            </Button>

            <div className="flex-1" />

            {/* Exports */}
            <Button
                onClick={() => exportSongText(parsed, song.title)}
                variant="icon"
                size="icon"
                title="Export as text (.txt)"
                aria-label="Export as text"
            >
                <DocumentTextIcon className="w-3.5 h-3.5" />
            </Button>
            <Button
                onClick={() => withSheetNode(() => exportSongPdf())}
                variant="icon"
                size="icon"
                title="Print / save as PDF"
                aria-label="Print or save as PDF"
            >
                <PrinterIcon className="w-3.5 h-3.5" />
            </Button>
            <Button
                onClick={() => withSheetNode(node => exportSongImage(node, song.title))}
                variant="icon"
                size="icon"
                title="Export as image (.png)"
                aria-label="Export as image"
            >
                <CameraIcon className="w-3.5 h-3.5" />
            </Button>

            <div className="w-px h-5 bg-[var(--mcb-border-primary)] mx-1" />

            <Button
                onClick={handleLoadProgression}
                variant="success"
                size="sm"
                disabled={!totalChords || isLoadingProgression}
                title="Load this song's chords into the main progression"
            >
                <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5" />
                {isLoadingProgression ? 'Loading…' : 'Use chords'}
            </Button>
        </div>
    );
};

export default SongToolbar;
