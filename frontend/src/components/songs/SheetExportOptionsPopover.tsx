import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CameraIcon, PrinterIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { useSongStore } from '../../stores/songStore';
import Slider from '../Slider';

interface SheetExportOptionsPopoverProps {
    anchorRect: DOMRect;
    onClose: () => void;
    onPrint: () => void;
    onSaveImage: () => void;
}

const MENU_WIDTH = 288; // w-72

/** A row of small segmented choices (orientation, column count). */
function SegmentedRow<T extends string | number>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-mcb-tertiary uppercase tracking-wide">{label}</span>
            <div className="flex rounded-md border border-[var(--mcb-border-subtle)] overflow-hidden">
                {options.map(option => (
                    <button
                        key={String(option.value)}
                        onClick={() => onChange(option.value)}
                        className={classNames(
                            'px-2.5 py-1 text-[0.6875rem] font-medium transition-colors',
                            option.value === value
                                ? 'bg-[var(--mcb-accent-primary)]/20 text-[var(--mcb-accent-text-primary)]'
                                : 'bg-mcb-input text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)]'
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

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

            <div className="p-3 space-y-3">
                <SegmentedRow
                    label="Page"
                    value={settings.orientation}
                    options={[
                        { value: 'portrait', label: 'Portrait' },
                        { value: 'landscape', label: 'Landscape' },
                    ]}
                    onChange={orientation => setSettings({ orientation })}
                />
                <SegmentedRow
                    label="Columns"
                    value={settings.columns}
                    options={[
                        { value: 1, label: '1' },
                        { value: 2, label: '2' },
                        { value: 3, label: '3' },
                    ]}
                    onChange={columns => setSettings({ columns })}
                />
                <Slider
                    variant="split"
                    label="Margin"
                    value={settings.margin}
                    min={0.25}
                    max={1.25}
                    step={0.05}
                    onChange={margin => setSettings({ margin })}
                    formatValue={v => `${v.toFixed(2)} in`}
                />
                <Slider
                    variant="split"
                    label="Line spacing"
                    value={settings.lineSpacing}
                    min={1}
                    max={2.5}
                    step={0.05}
                    onChange={lineSpacing => setSettings({ lineSpacing })}
                    formatValue={v => `${v.toFixed(2)}×`}
                />
                <Slider
                    variant="split"
                    label="Lyric size"
                    value={settings.lyricSize}
                    min={8}
                    max={16}
                    step={0.5}
                    onChange={lyricSize => setSettings({ lyricSize })}
                    formatValue={v => `${v} pt`}
                />
                <Slider
                    variant="split"
                    label="Chord size"
                    value={settings.chordSize}
                    min={8}
                    max={16}
                    step={0.5}
                    onChange={chordSize => setSettings({ chordSize })}
                    formatValue={v => `${v} pt`}
                />
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
