import React, { useState, useRef, useEffect } from 'react';
import { InformationCircleIcon, QuestionMarkCircleIcon, EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import AboutModal from './AboutModal';
import HelpModal from './HelpModal';
import { useMusicStore } from '../stores/musicStore';
import Logo from './Logo';


const HeaderNav: React.FC = () => {
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const musicStore = useMusicStore();

    const { 
        key,
        mode
    } = musicStore;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                buttonRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuItemClick = (action: () => void) => {
        action();
        setIsDropdownOpen(false);
    };

    const handleOpenHelp = () => {
        setShowHelpModal(true);
    };

    return (
        <>
            <div className="bg-[#3d434f] border-b border-gray-600">
                <div className="relative">
                    <div className="flex items-center justify-between px-6 py-4">
                        {/* Left side - App Name with Geometric Logo */}
                        <div className="flex items-center space-x-4">
                            <Logo className="mt-2"/> 
                            
                            {/* App Name */}
                            <div className="flex items-center space-x-3">
                                <div className="flex flex-col items-start">
                                    <h1 className="text-xl font-bold text-blue-500 tracking-tight leading-none">
                                        modal
                                    </h1>
                                    <div className="flex items-center space-x-0.5">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">chord</span>
                                        <div className="w-1 h-1 mr-[0.2em] bg-slate-400"></div>
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">buildr</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Center/Right - Status and Key/Mode (Desktop) and Menu */}
                        <div className="flex items-center space-x-4">
                           
                            {/* Key/Mode Display - Hidden on small screens */}
                            <div className="hidden sm:flex items-center space-x-2 text-sm">
                                <div className="px-2 py-0.5 bg-[#444b59] border border-gray-600 rounded text-slate-300 font-mono">
                                    {key}
                                </div>
                                <div className="w-px h-4 bg-slate-600"></div>
                                <div className="px-2 py-1 bg-[#444b59] border border-gray-600 rounded text-slate-300 text-xs font-mono">
                                    {mode}
                                </div>
                            </div>

                            {/* Dropdown Menu */}
                            <div className="relative">
                                <button
                                    ref={buttonRef}
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#4a5262] rounded-lg transition-all duration-200 border border-transparent hover:border-gray-600"
                                    title="Menu"
                                >
                                    <EllipsisVerticalIcon className="w-5 h-5" />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div
                                        ref={dropdownRef}
                                        className="absolute right-0 mt-2 w-64 bg-[#3d434f] border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden"
                                    >

                                        {/* Menu Items */}
                                        <div className="py-2">
                                            <button
                                                onClick={() => handleMenuItemClick(() => setShowAboutModal(true))}
                                                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 text-slate-400 hover:text-slate-200 hover:bg-[#4a5262] transition-all duration-150"
                                            >
                                                <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-sm font-medium">About</span>
                                            </button>
                                            <button
                                                onClick={() => handleMenuItemClick(() => setShowHelpModal(true))}
                                                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 text-slate-400 hover:text-slate-200 hover:bg-[#4a5262] transition-all duration-150"
                                            >
                                                <QuestionMarkCircleIcon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-sm font-medium">Help</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AboutModal 
                isOpen={showAboutModal}
                onClose={() => setShowAboutModal(false)}
                onOpenHelp={handleOpenHelp}
            />
            <HelpModal 
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
            />
        </>
    );
};

export default HeaderNav;