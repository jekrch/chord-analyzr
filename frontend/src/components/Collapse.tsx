import React, { useEffect, useRef } from 'react';
import { useExitTransition } from '../hooks/useExitTransition';

// Keep in sync with the closing duration of .mcb-collapse in themes.css
const COLLAPSE_EXIT_MS = 220;

interface CollapseProps {
    open: boolean;
    children: React.ReactNode;
    className?: string;
    /** Mount children only while open (and during the close animation) */
    lazy?: boolean;
}

/**
 * Animates its content's height between 0 and auto. Closed content is
 * made inert so hidden controls can't take keyboard focus.
 */
const Collapse: React.FC<CollapseProps> = ({ open, children, className = '', lazy = false }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { isRendered } = useExitTransition(open, COLLAPSE_EXIT_MS);

    useEffect(() => {
        ref.current?.toggleAttribute('inert', !open);
    }, [open]);

    return (
        <div ref={ref} className={`mcb-collapse ${open ? 'is-open' : ''} ${className}`} aria-hidden={!open}>
            <div className="mcb-collapse-inner">
                {lazy && !isRendered ? null : children}
            </div>
        </div>
    );
};

export default Collapse;
