import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowsUpDownIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';

interface KeyChangePopoverProps {
    fromKey: string;
    toKey: string;
    anchorRect: DOMRect;
    onTranspose: () => void;
    onSetKeyOnly: () => void;
    onClose: () => void;
}

const MENU_WIDTH = 240; // w-60

/**
 * Asks what picking a new key in the toolbar should do to the song: shift
 * every chord into the new key, or leave the chords sounding as they are and
 * only pin the key (which still respells accidentals — sharps vs flats — to
 * match the new key's signature).
 */
const KeyChangePopover: React.FC<KeyChangePopoverProps> = ({
    fromKey,
    toKey,
    anchorRect,
    onTranspose,
    onSetKeyOnly,
    onClose,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (menuRef.current?.contains(event.target as Node)) return;
            onClose();
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('resize', onClose);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - MENU_WIDTH - 8));

    const optionClass =
        'w-full flex items-start gap-2 px-2.5 py-2 text-left hover:bg-[var(--mcb-bg-hover)] transition-colors';

    return createPortal(
        <div
            ref={menuRef}
            style={{ left, top: anchorRect.bottom + 4 }}
            className="fixed w-60 mcb-panel !rounded-lg z-[1100] overflow-hidden text-left"
        >
            <div className="mcb-panel-header !py-1.5">
                <span className="mcb-label">
                    Key: {fromKey} &rarr; {toKey}
                </span>
            </div>
            <button onClick={onTranspose} className={optionClass}>
                <ArrowsUpDownIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--mcb-accent-text-primary)]" />
                <span>
                    <span className="block text-xs font-medium text-[var(--mcb-text-primary)]">
                        Transpose chords
                    </span>
                    <span className="block text-[0.6875rem] text-mcb-tertiary">
                        Shift every chord into {toKey}
                    </span>
                </span>
            </button>
            <button onClick={onSetKeyOnly} className={optionClass}>
                <MusicalNoteIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--mcb-accent-text-primary)]" />
                <span>
                    <span className="block text-xs font-medium text-[var(--mcb-text-primary)]">
                        Set key only
                    </span>
                    <span className="block text-[0.6875rem] text-mcb-tertiary">
                        Keep the chords as they sound; spell them for {toKey}
                    </span>
                </span>
            </button>
        </div>,
        document.body
    );
};

export default KeyChangePopover;
