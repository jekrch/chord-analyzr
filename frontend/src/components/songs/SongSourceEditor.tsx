import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Button } from '../Button';
import { Song, playSheetChord, useSongStore } from '../../stores/songStore';
import {
    chordAtOffset,
    chordSpansInSource,
    detectFormat,
    normalizeToChordPro,
    parseSong,
    songToText,
} from '../../util/SongSheetParser';

// The textarea and its highlight overlay must render text identically for the
// colored chords to sit exactly under the (invisible) editable characters.
const EDITOR_TEXT_CLASSES = 'px-3 py-2 !text-sm font-mono leading-relaxed text-left';

interface SongSourceEditorProps {
    song: Song;
}

/**
 * Raw text editor for a song. Accepts plain lyrics, inline [Am] markers, or
 * chords-over-lyrics sheets, and can convert the text between the inline and
 * chords-above representations at any time. A pasted chord sheet keeps its
 * chords-above layout; it's only inlined when dropped into a document that is
 * already inline, so the two formats never mix in one source.
 */
const SongSourceEditor: React.FC<SongSourceEditorProps> = ({ song }) => {
    const updateSongSource = useSongStore(state => state.updateSongSource);
    const format = detectFormat(song.source);
    const highlightRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // The textarea's scrollbars shrink its content area, but an inset-0
    // overlay keeps the full box — lines near the wrap boundary then wrap at
    // different points in the two layers, and the visible overlay text
    // drifts a line away from the real (invisible) text, so selections seem
    // to happen in a phantom copy of the line. Keep the overlay's edges
    // flush with the textarea's actual content area instead. Content-box
    // observation fires both when a scrollbar (dis)appears and when the
    // user drags the resize handle.
    useLayoutEffect(() => {
        const el = textareaRef.current;
        const overlay = highlightRef.current;
        if (!el || !overlay) return;
        const syncInsets = () => {
            overlay.style.right = `${el.offsetWidth - el.clientWidth}px`;
            overlay.style.bottom = `${el.offsetHeight - el.clientHeight}px`;
        };
        syncInsets();
        const observer = new ResizeObserver(syncInsets);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Column-aligned sources must never soft-wrap: a chord line and the lyric
    // line under it would wrap independently and scramble the pairs, so they
    // scroll horizontally instead. Inline sources wrap freely — each [Am]
    // marker travels with the word that follows it.
    const columnAligned = format === 'chords-over-lyrics';
    const wrapClasses = columnAligned ? 'whitespace-pre' : 'whitespace-pre-wrap break-words';

    // The source text split into plain and chord-colored segments for the
    // highlight overlay. A trailing zero-width space keeps a trailing empty
    // line from collapsing, so overlay and textarea heights stay in step.
    const highlighted = useMemo(() => {
        const spans = chordSpansInSource(song.source);
        const parts: React.ReactNode[] = [];
        let pos = 0;
        for (const [i, span] of spans.entries()) {
            if (span.start > pos) parts.push(song.source.slice(pos, span.start));
            parts.push(
                <span key={i} className="text-[var(--mcb-accent-text-primary)]">
                    {song.source.slice(span.start, span.end)}
                </span>
            );
            pos = span.end;
        }
        parts.push(song.source.slice(pos), '\u200b');
        return parts;
    }, [song.source]);

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pasted = e.clipboardData.getData('text/plain');
        if (!pasted || detectFormat(pasted) !== 'chords-over-lyrics') return;
        // Keep a pasted chords-above sheet in its own format — the default
        // browser paste drops it in verbatim. Only inline it when the
        // surrounding document is already inline, so the two never mix.
        if (format !== 'chordpro') return;
        e.preventDefault();
        const el = e.currentTarget;
        const converted = normalizeToChordPro(pasted);
        updateSongSource(
            song.id,
            el.value.slice(0, el.selectionStart) + converted + el.value.slice(el.selectionEnd)
        );
    };

    // Clicking a chord in the text plays it (the caret still lands there for
    // editing). Drag selections and double-click word selections don't play.
    const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
        const el = e.currentTarget;
        if (el.selectionStart !== el.selectionEnd) return;
        const chord = chordAtOffset(song.source, el.selectionStart);
        if (chord) playSheetChord(chord);
    };

    const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (highlightRef.current) {
            highlightRef.current.scrollTop = e.currentTarget.scrollTop;
            highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="relative w-full bg-mcb-input border border-[var(--mcb-border-subtle)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] rounded-md focus-within:border-[var(--mcb-accent-primary)] transition-colors overflow-hidden">
                <textarea
                    ref={textareaRef}
                    value={song.source}
                    onChange={e => updateSongSource(song.id, e.target.value)}
                    onPaste={handlePaste}
                    onClick={handleClick}
                    onScroll={syncScroll}
                    wrap={columnAligned ? 'off' : 'soft'}
                    rows={18}
                    placeholder={
                        'Paste or type lyrics here.\n\n' +
                        'Chords can be inline in brackets:  Hello [Am]darkness my old [F]friend\n' +
                        'or on their own line above the lyrics — switch between the two ' +
                        'with the Chords buttons below.'
                    }
                    spellCheck={false}
                    className={`block w-full bg-transparent text-transparent caret-white placeholder-[var(--mcb-text-tertiary)] focus:outline-none resize-y select-text ${wrapClasses} ${EDITOR_TEXT_CLASSES}`}
                />
                {/* Highlight overlay: same text, chords colored; the textarea
                    above it stays fully interactive with an invisible font. */}
                <div
                    ref={highlightRef}
                    aria-hidden
                    className={`absolute inset-0 overflow-hidden text-white pointer-events-none ${wrapClasses} ${EDITOR_TEXT_CLASSES}`}
                >
                    {highlighted}
                </div>
            </div>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-mcb-tertiary text-left">
                    Click a chord to hear it. Switch to Sheet to place chords by clicking words.
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="mcb-label !text-[0.5625rem]">Chords</span>
                    <Button
                        onClick={() => updateSongSource(song.id, normalizeToChordPro(song.source))}
                        variant="secondary"
                        size="sm"
                        active={format === 'chordpro'}
                        title="Chords inline in brackets: Hello [Am]darkness"
                    >
                        Inline
                    </Button>
                    <Button
                        onClick={() => updateSongSource(song.id, songToText(parseSong(song.source)))}
                        variant="secondary"
                        size="sm"
                        active={format === 'chords-over-lyrics'}
                        title="Chords on their own line above the lyrics"
                    >
                        Above
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SongSourceEditor;
