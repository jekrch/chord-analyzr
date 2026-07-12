import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    XMarkIcon,
    SwatchIcon,
    InformationCircleIcon,
    QuestionMarkCircleIcon,
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

const CLOSE_DURATION_MS = 340;

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
        { label: 'Chord Builder', target: 'main' as const },
        { label: 'Song Sheets', target: 'songs' as const },
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
                    <Logo size={300} />
                </div>

                {/* Top bar */}
                <div
                    className="mcb-fullmenu-item flex items-center justify-between px-6 py-4 border-b border-mcb-subtle"
                    style={{ '--stagger': '60ms' } as React.CSSProperties}
                >
                    <div className="flex items-center space-x-3">
                        <Logo size={30} />
                        <div className="flex items-baseline space-x-2">
                            <span className="text-base font-bold text-[var(--mcb-accent-primary)] tracking-tight leading-none">
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
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-mcb-subtle text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] hover:border-mcb-primary transition-all duration-200"
                        title="Close menu"
                        aria-label="Close menu"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <div className="relative flex-1 min-h-0 overflow-y-auto flex flex-col justify-start px-6 sm:px-8 py-10">
                    <div className="w-full">
                        <div
                            className="mcb-fullmenu-item mcb-label !text-[0.625rem] mb-4"
                            style={{ '--stagger': '120ms' } as React.CSSProperties}
                        >
                            navigate
                        </div>

                        <nav className="divide-y divide-[var(--mcb-border-subtle)]">
                            {primaryLinks.map((link, i) => (
                                <div
                                    key={link.target}
                                    className="mcb-fullmenu-item"
                                    style={{ '--stagger': `${170 + i * 70}ms` } as React.CSSProperties}
                                >
                                    <button
                                        onClick={() => go(() => navigate(link.target))}
                                        className={`mcb-fullmenu-link ${route === link.target ? 'is-current' : ''}`}
                                    >
                                        <span className="mcb-fullmenu-word">{link.label}</span>
                                    </button>
                                </div>
                            ))}
                        </nav>

                        <div
                            className="mcb-fullmenu-item mcb-label !text-[0.625rem] mt-12 mb-2"
                            style={{ '--stagger': '340ms' } as React.CSSProperties}
                        >
                            settings &amp; info
                        </div>

                        <div className="flex flex-col">
                            {utilityLinks.map((link, i) => (
                                <div
                                    key={link.label}
                                    className="mcb-fullmenu-item"
                                    style={{ '--stagger': `${390 + i * 50}ms` } as React.CSSProperties}
                                >
                                    <button onClick={() => go(link.action)} className="mcb-fullmenu-sublink">
                                        <link.Icon className="w-4 h-4 flex-shrink-0 transition-colors duration-200" />
                                        <span>{link.label}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer readout */}
                <div
                    className="mcb-fullmenu-item flex items-center justify-between px-6 py-4 border-t border-mcb-subtle"
                    style={{ '--stagger': '480ms' } as React.CSSProperties}
                >
                    <div className="flex items-center mcb-inset px-3 py-1 space-x-2 font-mono text-xs text-mcb-secondary">
                        <span className="mcb-label !text-[0.5625rem]">key</span>
                        <span className="text-[var(--mcb-accent-text-primary)]">{key}</span>
                        <div className="w-px h-3 bg-[var(--mcb-border-primary)]"></div>
                        <span className="text-mcb-secondary">{mode}</span>
                    </div>
                    <span className="mcb-label !text-[0.5625rem]">esc to close</span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FullScreenMenu;
