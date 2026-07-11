import React, { useState } from 'react';
import {
    ArrowPathIcon,
    ArrowRightStartOnRectangleIcon,
    CameraIcon,
    DocumentTextIcon,
    PencilSquareIcon,
    PlayIcon,
    PrinterIcon,
    QueueListIcon,
} from '@heroicons/react/20/solid';
import { Button } from '../Button';
import { useHashRoute } from '../../hooks/useHashRoute';
import { Song, playSheetChord, useSongStore } from '../../stores/songStore';
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
    const [, navigate] = useHashRoute();
    const [isLoadingProgression, setIsLoadingProgression] = useState(false);

    const totalChords = parsed.chordSequence.length;

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
