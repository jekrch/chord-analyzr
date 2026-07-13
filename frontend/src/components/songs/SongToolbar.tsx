import React, { useEffect, useRef, useState } from 'react';
import {
    AdjustmentsHorizontalIcon,
    ArrowDownIcon,
    ArrowPathIcon,
    ArrowRightStartOnRectangleIcon,
    ArrowUpIcon,
    ArrowsPointingOutIcon,
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
import { Song, playSheetChord, syncGlobalKeyMode, useSongStore } from '../../stores/songStore';
import { noteNameToNumber } from '../../util/NoteUtil';
import { inferKeyAndMode } from '../../util/ProgressionParser';
import { ParsedSong } from '../../util/SongSheetParser';
import { exportSongImage, exportSongPdf, exportSongText, withSheetPrintNode } from '../../util/songExport';
import KeyChangePopover from './KeyChangePopover';
import SheetExportOptionsPopover from './SheetExportOptionsPopover';

interface SongToolbarProps {
    song: Song;
    parsed: ParsedSong;
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
    const [exportOptionsAnchor, setExportOptionsAnchor] = useState<DOMRect | null>(null);
    const exportOptionsButtonRef = useRef<HTMLSpanElement>(null);
    // A key picked in the dropdown but not yet applied — the popover asks
    // whether to transpose the chords into it or just pin it as the key.
    const [pendingKeyChange, setPendingKeyChange] = useState<{ key: string; anchor: DOMRect } | null>(null);
    const keyDropdownRef = useRef<HTMLSpanElement>(null);

    const handlePrint = () =>
        withSheetPrintNode(() => exportSongPdf(useSongStore.getState().sheetExportSettings));
    const handleSaveImage = () =>
        withSheetPrintNode(node =>
            exportSongImage(node, song.title, useSongStore.getState().sheetExportSettings)
        );

    const totalChords = parsed.chordSequence.length;

    // The key/mode the sheet plays in: the song's own choice, else the one
    // detected from its chords, else the app's global key/mode.
    const hasExplicitKey = !!(song.key && song.mode);
    const inferredForSong = inferredKeyMode?.songId === song.id ? inferredKeyMode : null;
    const sheetKey = song.key ?? inferredForSong?.key ?? globalKey;
    const sheetMode = song.mode ?? inferredForSong?.mode ?? globalMode;

    // The sheet on screen sets the app-wide key/mode — this covers the song
    // already open when the page mounts, which never goes through selectSong.
    useEffect(() => {
        if (hasExplicitKey) syncGlobalKeyMode(song.key!, song.mode!);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [song.id, hasExplicitKey]);

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

    // Apply a key picked in the dropdown: either shift every chord into the
    // new key, or keep the chords sounding as they are and just pin the key.
    // Both paths respell accidentals (sharps vs flats) to match the new key.
    const applyKeyChange = (key: string, transpose: boolean) => {
        setPendingKeyChange(null);
        if (transpose) {
            const semitones =
                ((noteNameToNumber(key) - noteNameToNumber(sheetKey)) % 12 + 12) % 12;
            useSongStore.getState().transposeSong(song.id, semitones, key);
        } else {
            // 0-semitone transpose: pins the key and only respells accidentals
            useSongStore.getState().transposeSong(song.id, 0, key);
        }
    };

    const handleKeyPick = (key: string) => {
        if (key === sheetKey) return;
        // Nothing to transpose or respell — just pin the key directly
        if (!totalChords) {
            useSongStore.getState().setSongKeyMode(song.id, key, sheetMode);
            return;
        }
        const anchor = keyDropdownRef.current?.getBoundingClientRect();
        if (anchor) setPendingKeyChange({ key, anchor });
    };

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
            <Button
                onClick={() => useSongStore.getState().setSheetFullscreen(true)}
                variant="icon"
                size="icon"
                title="Show the sheet full screen"
                aria-label="Show the sheet full screen"
            >
                <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
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
                Picking a different key asks whether to transpose the chords
                into it or just pin it as the key. */}
            <div
                className="flex items-center gap-1.5"
                title={hasExplicitKey
                    ? 'Key and mode for this song — picking a new key asks whether to transpose the chords or just set the key'
                    : 'Key and mode detected from the song\'s chords — picking a new key asks whether to transpose the chords or just set the key'}
            >
                <span ref={keyDropdownRef} className="inline-flex">
                    <Dropdown
                        value={sheetKey}
                        onChange={handleKeyPick}
                        options={AVAILABLE_KEYS}
                        className="w-[5.5rem]"
                        buttonClassName="px-2.5 py-1 font-medium text-xs h-7 flex items-center"
                        menuClassName="min-w-[5.5rem]"
                    />
                </span>
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
            {pendingKeyChange && (
                <KeyChangePopover
                    fromKey={sheetKey}
                    toKey={pendingKeyChange.key}
                    anchorRect={pendingKeyChange.anchor}
                    onTranspose={() => applyKeyChange(pendingKeyChange.key, true)}
                    onSetKeyOnly={() => applyKeyChange(pendingKeyChange.key, false)}
                    onClose={() => setPendingKeyChange(null)}
                />
            )}
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
                onClick={handlePrint}
                variant="icon"
                size="icon"
                title="Print / save as PDF"
                aria-label="Print or save as PDF"
            >
                <PrinterIcon className="w-3.5 h-3.5" />
            </Button>
            <Button
                onClick={handleSaveImage}
                variant="icon"
                size="icon"
                title="Export as image (.png)"
                aria-label="Export as image"
            >
                <CameraIcon className="w-3.5 h-3.5" />
            </Button>
            {/* Layout options for print / image export. The wrapper eats
                mousedown/touchstart so the popover's outside-click closer
                doesn't fire first and turn the toggle into a reopen. */}
            <span
                ref={exportOptionsButtonRef}
                className="inline-flex"
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
            >
                <Button
                    onClick={() =>
                        setExportOptionsAnchor(anchor =>
                            anchor
                                ? null
                                : exportOptionsButtonRef.current?.getBoundingClientRect() ?? null
                        )
                    }
                    variant="icon"
                    size="icon"
                    active={!!exportOptionsAnchor}
                    title="Print & image options"
                    aria-label="Print and image options"
                    aria-expanded={!!exportOptionsAnchor}
                >
                    <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                </Button>
            </span>
            {exportOptionsAnchor && (
                <SheetExportOptionsPopover
                    anchorRect={exportOptionsAnchor}
                    onClose={() => setExportOptionsAnchor(null)}
                    onPrint={handlePrint}
                    onSaveImage={handleSaveImage}
                />
            )}

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
