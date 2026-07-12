import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayIcon, TrashIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { usePlaybackStore } from '../../stores/playbackStore';
import { getActiveSheetKeyMode, playChordNotes } from '../../stores/songStore';
import {
    ParsedChordToken,
    buildProgressionChord,
    parseChordToken,
    resolvedChordName,
} from '../../util/ProgressionParser';
import { SheetChord } from '../../util/SongSheetParser';

interface ChordPickerPopoverProps {
    anchorRect: DOMRect;
    /** Chord being edited, when the picker was opened on a placed chord. */
    editingChord: SheetChord | null;
    onSelect: (chordName: string) => void;
    onRemove: (() => void) | null;
    onClose: () => void;
}

const MENU_WIDTH = 288; // w-72
const MENU_MAX_HEIGHT = 360;

/**
 * Floating chord picker anchored to a word in the song sheet: offers the
 * chords already in the user's progression plus a free-typing input with the
 * same fuzzy matching the progression modal uses.
 */
const ChordPickerPopover: React.FC<ChordPickerPopoverProps> = ({
    anchorRect,
    editingChord,
    onSelect,
    onRemove,
    onClose,
}) => {
    const addedChords = usePlaybackStore(state => state.addedChords);
    const [typed, setTyped] = useState(editingChord ? editingChord.raw : '');
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // The user's current chord set, deduplicated by name
    const ownChords = useMemo(() => {
        const seen = new Set<string>();
        return addedChords.filter(c => (seen.has(c.name) ? false : (seen.add(c.name), true)));
    }, [addedChords]);

    const typedToken = useMemo(
        () => (typed.trim() ? parseChordToken(typed.trim()) : null),
        [typed]
    );
    const typedValid = typedToken !== null && typedToken.root !== null && typedToken.selectedType !== null;

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close on outside interaction, Escape, scroll and resize (the menu is
    // position:fixed, so scrolling would leave it floating away from its word)
    useEffect(() => {
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (menuRef.current?.contains(event.target as Node)) return;
            onClose();
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        const handleScroll = (event: Event) => {
            if (menuRef.current?.contains(event.target as Node)) return;
            onClose();
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('keydown', handleKey);
        document.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', onClose);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKey);
            document.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    const previewToken = async (token: ParsedChordToken, overrideType?: string) => {
        const { key, mode } = getActiveSheetKeyMode();
        const previewed = overrideType !== undefined ? { ...token, selectedType: overrideType } : token;
        const built = await buildProgressionChord(previewed, key, mode).catch(() => null);
        if (built) playChordNotes(built.notes);
    };

    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - MENU_WIDTH - 8));
    const openUp =
        anchorRect.bottom + MENU_MAX_HEIGHT + 8 > window.innerHeight &&
        anchorRect.top > MENU_MAX_HEIGHT + 8;
    const style: React.CSSProperties = openUp
        ? { left, bottom: window.innerHeight - anchorRect.top + 4 }
        : { left, top: anchorRect.bottom + 4 };

    return createPortal(
        <div ref={menuRef} style={style} data-chord-picker className="fixed w-72 mcb-panel !rounded-lg z-[1100] overflow-hidden text-left">
            <div className="mcb-panel-header !py-1.5 flex items-center justify-between">
                <span className="mcb-label">{editingChord ? `Change ${editingChord.name}` : 'Add chord'}</span>
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-[var(--mcb-danger-text)] hover:brightness-125 transition-all"
                        title="Remove this chord"
                    >
                        <TrashIcon className="w-3 h-3" />
                        Remove
                    </button>
                )}
            </div>

            <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
                {/* Free-typed chord */}
                <div>
                    <input
                        ref={inputRef}
                        value={typed}
                        onChange={e => setTyped(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && typedToken && typedValid) {
                                onSelect(resolvedChordName(typedToken));
                            }
                        }}
                        placeholder="Type a chord, e.g. F#m7"
                        spellCheck={false}
                        className="w-full px-2 py-1.5 bg-mcb-input border border-[var(--mcb-border-subtle)] rounded-md text-white placeholder-[var(--mcb-text-tertiary)] focus:border-[var(--mcb-accent-primary)] focus:outline-none !text-xs font-mono"
                    />
                    {typedToken && !typedValid && (
                        <p className="text-[0.625rem] text-[var(--mcb-danger-text)] mt-1">
                            Couldn't read that as a chord
                        </p>
                    )}
                    {typedToken && typedValid && typedToken.matchType !== 'nearest' && (
                        <button
                            onClick={() => onSelect(resolvedChordName(typedToken))}
                            className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded font-mono bg-[var(--mcb-accent-primary)]/10 border border-[var(--mcb-accent-primary)]/40 text-[var(--mcb-accent-text-primary)] hover:bg-[var(--mcb-accent-primary)]/20 transition-colors"
                        >
                            <PlayIcon
                                className="w-3 h-3 text-mcb-tertiary hover:text-[var(--mcb-accent-text-primary)]"
                                onClick={e => {
                                    e.stopPropagation();
                                    previewToken(typedToken);
                                }}
                            />
                            Use {resolvedChordName(typedToken)}
                        </button>
                    )}
                    {typedToken && typedValid && typedToken.matchType === 'nearest' && (
                        <div className="mt-1.5">
                            <div className="mcb-label !text-[0.5625rem] mb-1">Near matches</div>
                            <div className="flex flex-wrap gap-1">
                                {typedToken.candidates.slice(0, 4).map(candidate => {
                                    const name = `${typedToken.root}${candidate.chordType}${typedToken.slash ? `/${typedToken.slash}` : ''}`;
                                    return (
                                        <button
                                            key={candidate.chordType}
                                            onClick={() => onSelect(name)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-mono bg-[var(--mcb-warning-primary)] border border-[var(--mcb-warning-border)] text-[var(--mcb-warning-text)] hover:text-[var(--mcb-warning-text-alt)] transition-colors"
                                        >
                                            <PlayIcon
                                                className="w-3 h-3 opacity-60 hover:opacity-100"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    previewToken(typedToken, candidate.chordType);
                                                }}
                                            />
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chords already in the user's progression */}
                {ownChords.length > 0 && (
                    <div>
                        <div className="mcb-label !text-[0.5625rem] mb-1">Your chords</div>
                        <div className="flex flex-wrap gap-1">
                            {ownChords.map(chord => (
                                <button
                                    key={chord.name}
                                    onClick={() => onSelect(chord.name)}
                                    className={classNames(
                                        'inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-mono transition-colors',
                                        'bg-[var(--mcb-accent-primary)]/10 border border-[var(--mcb-accent-primary)]/40 text-[var(--mcb-accent-text-primary)] hover:bg-[var(--mcb-accent-primary)]/20 hover:border-[var(--mcb-accent-primary)]/60'
                                    )}
                                    title={chord.notes}
                                >
                                    <PlayIcon
                                        className="w-3 h-3 text-mcb-tertiary hover:text-[var(--mcb-accent-text-primary)]"
                                        onClick={e => {
                                            e.stopPropagation();
                                            playChordNotes(chord.notes);
                                        }}
                                    />
                                    {chord.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ChordPickerPopover;
