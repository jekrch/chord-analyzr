import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    XMarkIcon,
    SwatchIcon,
    InformationCircleIcon,
    QuestionMarkCircleIcon,
    MusicalNoteIcon,
    DocumentTextIcon,
} from '@heroicons/react/20/solid';
import Logo from './Logo';
import { useMusicStore } from '../stores/musicStore';
import { useHashRoute } from '../hooks/useHashRoute';

interface FullScreenMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenTheme: () => void;
    onOpenAbout: () => void;
    onOpenHelp: () => void;
}

const CLOSE_DURATION_MS = 200;

const FullScreenMenu: React.FC<FullScreenMenuProps> = ({
    isOpen,
    onClose,
    onOpenTheme,
    onOpenAbout,
    onOpenHelp,
}) => {
    const [mounted, setMounted] = useState(false);
    const [phase, setPhase] = useState<'enter' | 'open' | 'closing'>('enter');
    const closeTimer = useRef<ReturnType<typeof setTimeout>>();

    const { key, mode } = useMusicStore();
    const [route, navigate] = useHashRoute();

    // Mount, then flip to open on the next frame so transitions run;
    // on close, play the exit transition before unmounting.
    useEffect(() => {
        if (isOpen) {
            clearTimeout(closeTimer.current);
            setMounted(true);
            setPhase('enter');
            const raf = requestAnimationFrame(() =>
                requestAnimationFrame(() => setPhase('open'))
            );
            return () => cancelAnimationFrame(raf);
        }
        if (mounted) {
            setPhase('closing');
            closeTimer.current = setTimeout(() => setMounted(false), CLOSE_DURATION_MS);
            return () => clearTimeout(closeTimer.current);
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escape closes; lock body scroll while open
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, onClose]);

    if (!mounted) return null;

    const stateClass = phase === 'open' ? 'is-open' : phase === 'closing' ? 'is-closing' : '';

    const go = (action: () => void) => {
        onClose();
        action();
    };

    const primaryLinks = [
        { label: 'Chord Builder', target: 'main' as const, Icon: MusicalNoteIcon },
        { label: 'Song Sheets', target: 'songs' as const, Icon: DocumentTextIcon },
    ];

    const utilityLinks = [
        { label: 'Theme', Icon: SwatchIcon, action: onOpenTheme },
        { label: 'About', Icon: InformationCircleIcon, action: onOpenAbout },
        { label: 'Help', Icon: QuestionMarkCircleIcon, action: onOpenHelp },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[950]" role="dialog" aria-modal="true" aria-label="Main menu">
            <div className={`mcb-fullmenu-backdrop ${stateClass}`} onClick={onClose} />

            <div className={`mcb-fullmenu ${stateClass} overflow-hidden`}>
                <div className="mcb-fullmenu-watermark">
                    <Logo size={260} />
                </div>

                {/* Top bar */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-mcb-subtle shrink-0">
                    <div className="flex items-center space-x-2.5">
                        <Logo size={24} />
                        <div className="flex items-baseline space-x-2">
                            <span className="text-sm font-bold text-[var(--mcb-accent-primary)] tracking-tight leading-none">
                                modal
                            </span>
                            <div className="flex items-center space-x-1">
                                <span className="mcb-label">chord</span>
                                <div className="w-0.5 h-0.5 bg-[var(--mcb-text-tertiary)] rounded-full"></div>
                                <span className="mcb-label">buildr</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 -mr-1.5 flex items-center justify-center rounded-md text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors"
                        title="Close menu"
                        aria-label="Close menu"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <div className="relative flex-1 min-h-0 overflow-y-auto px-2.5 py-5">
                    <div className="mcb-label mcb-fullmenu-section">Navigate</div>
                    <nav className="flex flex-col gap-0.5">
                        {primaryLinks.map(link => {
                            const current = route === link.target;
                            return (
                                <button
                                    key={link.target}
                                    onClick={() => go(() => navigate(link.target))}
                                    className={`mcb-fullmenu-link ${current ? 'is-current' : ''}`}
                                    aria-current={current ? 'page' : undefined}
                                >
                                    <link.Icon />
                                    <span>{link.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mcb-label mcb-fullmenu-section mt-6">Settings &amp; info</div>
                    <div className="flex flex-col gap-0.5">
                        {utilityLinks.map(link => (
                            <button key={link.label} onClick={() => go(link.action)} className="mcb-fullmenu-link">
                                <link.Icon />
                                <span>{link.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer readout */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-mcb-subtle shrink-0">
                    <div className="flex items-center mcb-inset px-2.5 py-1 space-x-2 font-mono text-xs text-mcb-secondary">
                        <span className="mcb-label">key</span>
                        <span className="text-[var(--mcb-accent-text-primary)]">{key}</span>
                        <div className="w-px h-3 bg-[var(--mcb-border-primary)]"></div>
                        <span className="text-mcb-secondary">{mode}</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-[0.6875rem] text-mcb-tertiary">
                        <kbd className="mcb-kbd">Esc</kbd>
                        close
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FullScreenMenu;
