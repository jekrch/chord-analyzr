import React from 'react';
import classNames from 'classnames';
import { SheetExportSettings } from '../../stores/songStore';
import Slider from '../Slider';

/** A row of small segmented choices (orientation, column count). */
export function SegmentedRow<T extends string | number>({
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

interface SheetExportControlsProps {
    settings: SheetExportSettings;
    onChange: (patch: Partial<SheetExportSettings>) => void;
    /** Show the page orientation toggle — off for the on-screen reading view,
     * which has no page to orient (see the full-screen flyover). */
    showOrientation?: boolean;
    /** Show the screen-fill width slider — on only for the on-screen reading
     * view; print / image have a fixed page width. */
    showScreenWidth?: boolean;
}

/**
 * The sheet layout controls: columns, margin, line spacing, lyric / chord
 * font sizes, and (print only) page orientation / (screen only) fill width.
 * Presentational — the caller owns the settings, so the toolbar popover drives
 * the shared print/export layout and the full-screen flyover drives whichever
 * layout the current song reads with.
 */
const SheetExportControls: React.FC<SheetExportControlsProps> = ({
    settings,
    onChange: setSettings,
    showOrientation = true,
    showScreenWidth = false,
}) => {
    return (
        <div className="space-y-3">
            {showOrientation && (
                <SegmentedRow
                    label="Page"
                    value={settings.orientation}
                    options={[
                        { value: 'portrait', label: 'Portrait' },
                        { value: 'landscape', label: 'Landscape' },
                    ]}
                    onChange={orientation => setSettings({ orientation })}
                />
            )}
            {showScreenWidth && (
                <Slider
                    variant="split"
                    label="Screen width"
                    value={settings.screenWidth}
                    min={40}
                    max={100}
                    step={5}
                    onChange={screenWidth => setSettings({ screenWidth })}
                    formatValue={v => (v >= 100 ? 'Full' : `${v}%`)}
                />
            )}
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
    );
};

export default SheetExportControls;
