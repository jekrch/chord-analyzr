import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/20/solid';
import { SheetChord } from '../../util/SongSheetParser';

interface ChordContextMenuProps {
    chord: SheetChord;
    x: number;
    y: number;
    onChange: () => void;
    onDelete: () => void;
    onClose: () => void;
}

const MENU_WIDTH = 160;

/**
 * Compact floating menu opened by right-click (desktop) or a long press
 * (touch) on a placed chord: swap it for a different chord (via the same
 * picker used to add one) or delete it.
 */
const ChordContextMenu: React.FC<ChordContextMenuProps> = ({ chord, x, y, onChange, onDelete, onClose }) => {
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
        document.addEventListener('scroll', onClose, true);
        window.addEventListener('resize', onClose);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKey);
            document.removeEventListener('scroll', onClose, true);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    const left = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - 84));

    return createPortal(
        <div
            ref={menuRef}
            style={{ left, top }}
            data-chord-context-menu
            className="fixed w-40 mcb-panel !rounded-lg z-[1100] overflow-hidden text-left"
        >
            <div className="mcb-panel-header !py-1.5">
                <span className="mcb-label">{chord.name}</span>
            </div>
            <button
                onClick={onChange}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-mcb-secondary hover:bg-[var(--mcb-bg-hover)] hover:text-white transition-colors"
            >
                <PencilSquareIcon className="w-3.5 h-3.5" />
                Change chord
            </button>
            <button
                onClick={onDelete}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--mcb-danger-text)] hover:bg-[var(--mcb-danger-primary)]/15 transition-colors"
            >
                <TrashIcon className="w-3.5 h-3.5" />
                Delete chord
            </button>
        </div>,
        document.body
    );
};

export default ChordContextMenu;
