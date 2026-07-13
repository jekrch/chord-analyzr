import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CameraIcon, PrinterIcon } from '@heroicons/react/20/solid';
import { useSongStore } from '../../stores/songStore';
import SheetExportControls from './SheetExportControls';

interface SheetExportOptionsPopoverProps {
    anchorRect: DOMRect;
    onClose: () => void;
    onPrint: () => void;
    onSaveImage: () => void;
}

const MENU_WIDTH = 288; // w-72

/**
 * Layout options for printing / image export of the song sheet: page
 * orientation, margins, line spacing, lyric and chord font sizes, and how
 * many columns the lyrics flow into. The options only affect the printed /
 * exported output, never the on-screen sheet.
 */
const SheetExportOptionsPopover: React.FC<SheetExportOptionsPopoverProps> = ({
    anchorRect,
    onClose,
    onPrint,
    onSaveImage,
}) => {
    const settings = useSongStore(state => state.sheetExportSettings);
    const setSettings = useSongStore(state => state.setSheetExportSettings);
    const menuRef = useRef<HTMLDivElement>(null);

    // While the popover is open the sheet itself becomes a live print
    // preview (see SongSheetView), so every adjustment is visible as it's
    // made; entering preview also switches to sheet view.
    useEffect(() => {
        useSongStore.getState().setSheetExportPreview(true);
        return () => useSongStore.getState().setSheetExportPreview(false);
    }, []);

    // Close on outside interaction and Escape (same pattern as the chord
    // picker; the popover is position:fixed, anchored to the toolbar button)
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

    // Right-align to the anchor button, clamped to the viewport
    const left = Math.max(8, Math.min(anchorRect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));

    return createPortal(
        <div
            ref={menuRef}
            style={{ left, top: anchorRect.bottom + 4 }}
            className="fixed w-72 mcb-panel !rounded-lg z-[1100] overflow-hidden text-left"
        >
            <div className="mcb-panel-header !py-1.5 flex items-center justify-between">
                <span className="mcb-label">Print &amp; image options</span>
                <button
                    onClick={() => useSongStore.getState().resetSheetExportSettings()}
                    className="text-[0.625rem] uppercase tracking-wide text-mcb-tertiary hover:text-[var(--mcb-text-primary)] transition-colors"
                    title="Restore the default layout"
                >
                    Reset
                </button>
            </div>

            <div className="p-3">
                <SheetExportControls settings={settings} onChange={setSettings} />
            </div>

            {/* Act on the freshly tuned layout without leaving the popover */}
            <div className="px-3 py-2 border-t border-mcb-subtle flex items-center justify-end gap-1.5">
                <button
                    onClick={onPrint}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.6875rem] font-medium rounded-md border border-[var(--mcb-border-subtle)] bg-mcb-input text-mcb-secondary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors"
                    title="Print / save as PDF with these options"
                >
                    <PrinterIcon className="w-3 h-3 shrink-0" />
                    Print / PDF
                </button>
                <button
                    onClick={onSaveImage}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.6875rem] font-medium rounded-md border border-[var(--mcb-border-subtle)] bg-mcb-input text-mcb-secondary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors"
                    title="Export as image (.png) with these options"
                >
                    <CameraIcon className="w-3 h-3 shrink-0" />
                    Image
                </button>
            </div>
        </div>,
        document.body
    );
};

export default SheetExportOptionsPopover;
