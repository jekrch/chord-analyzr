import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, PlayIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import Modal from './Modal';
import { Button } from './Button';
import { useMusicStore } from '../stores/musicStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { usePatternStore } from '../stores/patternStore';
import {
    parseProgression,
    resolvedChordName,
    progressionToString,
    inferKeyAndMode,
    buildProgressionChord,
    ParsedChordToken,
    KeyModeSuggestion,
} from '../util/ProgressionParser';

interface ChordProgressionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlayNotes?: (notes: string) => void;
}

const ChordProgressionModal: React.FC<ChordProgressionModalProps> = ({
    isOpen,
    onClose,
    onPlayNotes,
}) => {
    const currentKey = useMusicStore((state) => state.key);
    const currentMode = useMusicStore((state) => state.mode);
    const modes = useMusicStore((state) => state.modes);

    const [text, setText] = useState('');
    // Chord-type picks the user made from a near-match dropdown, keyed by
    // `${tokenIndex}|${tokenText}` so they survive edits elsewhere in the text
    const [overrides, setOverrides] = useState<Record<string, string>>({});
    const [autoDetect, setAutoDetect] = useState(true);
    const [suggestion, setSuggestion] = useState<KeyModeSuggestion | null>(null);
    const [inferring, setInferring] = useState(false);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    // Viewport rect of the chip the near-match menu is anchored to; the menu
    // renders position:fixed in a portal so it can overflow the modal bounds
    const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuAnchorEl = useRef<HTMLElement | null>(null);
    const inferSeqRef = useRef(0);

    // Prefill with the loaded progression so it can be edited in place
    useEffect(() => {
        if (isOpen) {
            const addedChords = usePlaybackStore.getState().addedChords;
            setText(progressionToString(addedChords.map(c => c.name)));
            setOverrides({});
            setSuggestion(null);
            setOpenDropdownIndex(null);
        }
    }, [isOpen]);

    const tokens = useMemo(() => {
        const parsed = parseProgression(text);
        return parsed.map((token, index) => {
            const override = overrides[`${index}|${token.token}`];
            if (override !== undefined && token.matchType === 'nearest') {
                return { ...token, selectedType: override };
            }
            return token;
        });
    }, [text, overrides]);

    const validTokens = useMemo(
        () => tokens.filter(t => t.root && t.selectedType !== null),
        [tokens]
    );
    const invalidCount = tokens.length - validTokens.length;

    // Signature of the musical content, so key inference only reruns when
    // the chords themselves change (not e.g. while typing whitespace)
    const progressionSignature = useMemo(
        () => validTokens.map(t => `${t.root}${t.selectedType}${t.slash ?? ''}`).join(' '),
        [validTokens]
    );

    // Infer key/mode (debounced) whenever the parsed chords change
    useEffect(() => {
        if (!isOpen || !autoDetect || !validTokens.length) {
            setSuggestion(null);
            setInferring(false);
            return;
        }
        const seq = ++inferSeqRef.current;
        setInferring(true);
        const timeout = setTimeout(() => {
            inferKeyAndMode(validTokens, modes)
                .then(result => {
                    if (inferSeqRef.current === seq) {
                        setSuggestion(result);
                        setInferring(false);
                    }
                })
                .catch(() => {
                    if (inferSeqRef.current === seq) {
                        setSuggestion(null);
                        setInferring(false);
                    }
                });
        }, 350);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, autoDetect, progressionSignature, modes]);

    const closeMenu = useCallback(() => {
        setOpenDropdownIndex(null);
        menuAnchorEl.current = null;
    }, []);

    // Close the near-match menu on outside interaction, and on scroll/resize
    // since the fixed-position menu would drift away from its chip
    useEffect(() => {
        if (openDropdownIndex === null) return;
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target)) return;
            if (menuAnchorEl.current?.contains(target)) return;
            closeMenu();
        };
        const handleScroll = (event: Event) => {
            if (menuRef.current?.contains(event.target as Node)) return;
            closeMenu();
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', closeMenu);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', closeMenu);
        };
    }, [openDropdownIndex, closeMenu]);

    // Edits to the text invalidate the anchored chip; drop the menu
    useEffect(() => {
        closeMenu();
    }, [text, closeMenu]);

    const targetKey = autoDetect && suggestion ? suggestion.key : currentKey;
    const targetMode = autoDetect && suggestion ? suggestion.mode : currentMode;

    const handlePreview = useCallback(async (token: ParsedChordToken, overrideType?: string) => {
        if (!onPlayNotes) return;
        const previewToken = overrideType !== undefined
            ? { ...token, selectedType: overrideType }
            : token;
        const built = await buildProgressionChord(previewToken, targetKey, targetMode);
        if (built) onPlayNotes(built.notes);
    }, [onPlayNotes, targetKey, targetMode]);

    const handleSelectCandidate = useCallback((tokenIndex: number, token: ParsedChordToken, chordType: string) => {
        setOverrides(prev => ({ ...prev, [`${tokenIndex}|${token.token}`]: chordType }));
        closeMenu();
    }, [closeMenu]);

    const handleLoad = useCallback(async () => {
        if (!validTokens.length || isApplying) return;
        setIsApplying(true);
        try {
            const built: { name: string; notes: string }[] = [];
            for (const token of validTokens) {
                const chord = await buildProgressionChord(token, targetKey, targetMode);
                if (chord) built.push(chord);
            }
            if (!built.length) return;

            const { clearAllChords, addChord } = usePlaybackStore.getState();
            const pattern = usePatternStore.getState().currentlyActivePattern;

            clearAllChords();
            if (targetKey !== currentKey || targetMode !== currentMode) {
                useMusicStore.getState().setKeyAndMode(targetKey, targetMode);
            }
            built.forEach(chord => addChord(chord.name, chord.notes, pattern, targetKey, targetMode));
            onClose();
        } finally {
            setIsApplying(false);
        }
    }, [validTokens, isApplying, targetKey, targetMode, currentKey, currentMode, onClose]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Chord Progression"
            className="max-w-2xl"
            fixedHeader
        >
            <div className="p-4 space-y-4 text-left">
                {/* Input */}
                <div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="e.g.  Am F C G   or   Dm7, G7, Cmaj7"
                        spellCheck={false}
                        className="w-full px-3 py-2 bg-mcb-input border border-[var(--mcb-border-subtle)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] rounded-md text-white placeholder-[var(--mcb-text-tertiary)] focus:border-[var(--mcb-accent-primary)] focus:outline-none transition-colors !text-sm font-mono resize-none"
                    />
                    <p className="text-xs text-mcb-tertiary mt-1">
                        Separate chords with spaces or commas. Unrecognized chords get the closest match — click them to pick another.
                    </p>
                </div>

                {/* Parsed chord chips */}
                {tokens.length > 0 && (
                    <div>
                        <div className="mcb-label mb-1.5">
                            Chords <span className="text-mcb-tertiary normal-case">({validTokens.length} recognized{invalidCount > 0 ? `, ${invalidCount} skipped` : ''})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {tokens.map((token, index) => {
                                if (!token.root || token.selectedType === null) {
                                    return (
                                        <span
                                            key={`${index}-${token.token}`}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-mono bg-[var(--mcb-danger-secondary)]/20 border border-[var(--mcb-danger-border)] text-[var(--mcb-danger-text)] line-through"
                                            title="Couldn't read this chord — it will be skipped"
                                        >
                                            {token.token}
                                        </span>
                                    );
                                }

                                const isNear = token.matchType === 'nearest';
                                const name = resolvedChordName(token);

                                if (!isNear) {
                                    return (
                                        <button
                                            key={`${index}-${token.token}`}
                                            onClick={() => handlePreview(token)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-mono bg-[var(--mcb-accent-primary)]/10 border border-[var(--mcb-accent-primary)]/40 text-[var(--mcb-accent-text-primary)] hover:bg-[var(--mcb-accent-primary)]/20 hover:border-[var(--mcb-accent-primary)]/60 transition-colors"
                                            title="Preview chord"
                                        >
                                            {name}
                                        </button>
                                    );
                                }

                                return (
                                    <button
                                        key={`${index}-${token.token}`}
                                        onClick={(e) => {
                                            if (openDropdownIndex === index) {
                                                closeMenu();
                                                return;
                                            }
                                            menuAnchorEl.current = e.currentTarget;
                                            setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
                                            setOpenDropdownIndex(index);
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-mono bg-[var(--mcb-warning-primary)] border border-[var(--mcb-warning-border)] text-[var(--mcb-warning-text)] hover:text-[var(--mcb-warning-text-alt)] transition-colors"
                                        title={`"${token.token}" not found — using nearest match. Click to see other matches.`}
                                    >
                                        <ExclamationTriangleIcon className="w-3 h-3" />
                                        <span>{name}</span>
                                        <span className="opacity-60 line-through">{token.token}</span>
                                        <ChevronDownIcon className="w-3 h-3" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Near-match menu: portaled and position:fixed so it overlays
                    past the modal edge instead of stretching its scroll area */}
                {openDropdownIndex !== null && menuAnchorRect && tokens[openDropdownIndex]?.matchType === 'nearest' && createPortal(
                    (() => {
                        const token = tokens[openDropdownIndex];
                        const MENU_WIDTH = 224; // w-56
                        const MENU_MAX_HEIGHT = 260; // header + max-h-48 list
                        const left = Math.max(8, Math.min(menuAnchorRect.left, window.innerWidth - MENU_WIDTH - 8));
                        const openUp = menuAnchorRect.bottom + MENU_MAX_HEIGHT + 8 > window.innerHeight
                            && menuAnchorRect.top > MENU_MAX_HEIGHT + 8;
                        const style: React.CSSProperties = openUp
                            ? { left, bottom: window.innerHeight - menuAnchorRect.top + 4 }
                            : { left, top: menuAnchorRect.bottom + 4 };
                        return (
                            <div ref={menuRef} style={style} className="fixed w-56 mcb-panel !rounded-lg z-[1100] overflow-hidden">
                                <div className="mcb-panel-header !py-1.5">
                                    <span className="mcb-label">Near matches</span>
                                </div>
                                <div className="py-1 max-h-48 overflow-y-auto">
                                    {token.candidates.map(candidate => {
                                        const isSelected = candidate.chordType === token.selectedType;
                                        return (
                                            <div
                                                key={candidate.chordType}
                                                className={classNames(
                                                    "w-full px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors",
                                                    isSelected
                                                        ? "bg-[var(--mcb-accent-primary)]/15 text-[var(--mcb-accent-text-primary)]"
                                                        : "text-mcb-secondary hover:bg-[var(--mcb-bg-hover)] hover:text-white"
                                                )}
                                                onClick={() => handleSelectCandidate(openDropdownIndex, token, candidate.chordType)}
                                            >
                                                {onPlayNotes && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePreview(token, candidate.chordType);
                                                        }}
                                                        className="p-0.5 rounded text-mcb-tertiary hover:text-[var(--mcb-accent-text-primary)] transition-colors flex-shrink-0"
                                                        title="Preview"
                                                    >
                                                        <PlayIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <span className="text-xs font-mono truncate">
                                                    {token.root}{candidate.chordType}{token.slash ? `/${token.slash}` : ''}
                                                </span>
                                                <span className="ml-auto text-[0.625rem] text-mcb-tertiary flex-shrink-0">
                                                    {Math.round(candidate.score * 100)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })(),
                    document.body
                )}

                {/* Auto-detect key & mode */}
                <div className="flex items-center justify-between p-3 mcb-inset">
                    <div className="flex flex-col text-left">
                        <span className="mcb-label text-left">Auto-detect key &amp; mode</span>
                        <span className="text-xs text-[var(--mcb-text-tertiary)]">
                            {autoDetect
                                ? (inferring
                                    ? 'Analyzing progression...'
                                    : suggestion
                                        ? <>Best fit: <span className="text-[var(--mcb-accent-text-primary)]">{suggestion.key} {suggestion.mode}</span> ({Math.round(suggestion.coverage * 100)}% of notes in scale)</>
                                        : 'Enter chords to detect the key')
                                : <>Keeping current key: <span className="text-[var(--mcb-accent-text-primary)]">{currentKey} {currentMode}</span></>
                            }
                        </span>
                    </div>
                    <button
                        onClick={() => setAutoDetect(!autoDetect)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--mcb-accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--mcb-bg-primary)] ${autoDetect ? 'bg-[var(--mcb-accent-secondary)]' : 'bg-[var(--mcb-border-secondary)]'}`}
                        role="switch"
                        aria-checked={autoDetect}
                        aria-label="Auto-detect key and mode from the entered chords"
                    >
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoDetect ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                    </button>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-mcb-tertiary">
                        {validTokens.length > 0
                            ? <>Loads {validTokens.length} chord{validTokens.length === 1 ? '' : 's'} in <span className="text-[var(--mcb-accent-text-primary)]">{targetKey} {targetMode}</span>, replacing the current progression</>
                            : 'Enter chords above to load a progression'
                        }
                    </span>
                    <div className="flex items-center justify-end gap-2 flex-shrink-0">
                        <Button onClick={onClose} variant="secondary" size="sm">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLoad}
                            variant="success"
                            size="sm"
                            className="whitespace-nowrap"
                            disabled={!validTokens.length || isApplying || (autoDetect && inferring)}
                        >
                            {isApplying ? 'Loading...' : 'Load Progression'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ChordProgressionModal;
