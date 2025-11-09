import React from 'react';
import Modal from './Modal';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenHelp: () => void; // New prop for opening help modal
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onOpenHelp }) => {
    const handleHelpClick = () => {
        onClose(); // Close about modal first
        onOpenHelp(); // Then open help modal
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="About"
            className="max-w-2xl max-h-[85vh]"
            fixedHeader={true}
        >
            <div className="p-6 space-y-6">
                {/* Overview Section */}
                <div className="bg-mcb-primary rounded-lg border border-mcb-primary overflow-hidden">
                    <div className="p-4 text-sm leading-relaxed space-y-3 text-mcb-secondary text-left">
                        <p>
                            Modal Chord Buildr is a music learning, composition, and performance tool built with React. The app provides an intuitive interface for exploring musical scales and building chord progressions, while also offering basic synth and sequencer functionality.
                        </p>
                        <p>
                            For more details on how to use this app, please refer to the{' '}
                            <button 
                                onClick={handleHelpClick}
                                className="font-semibold text-[var(--mcb-accent-text-primary)] hover:text-[var(--mcb-accent-text-secondary)] underline underline-offset-2 transition-colors cursor-pointer"
                            >
                                Help & Guide
                            </button>{' '}
                            documentation.
                        </p>
                    </div>
                </div>

                {/* Key Features Section */}
                <div className="bg-mcb-primary rounded-lg border border-mcb-primary overflow-hidden">
                    <div className="bg-mcb-tertiary px-4 py-3 border-b border-mcb-primary">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Key Features
                        </h4>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-mcb-secondary/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-mcb-secondary text-left">Interactive piano with multiple instruments and audio effects</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-mcb-secondary/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-mcb-secondary text-left">Pattern sequencer with customizable rhythmic patterns</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-mcb-secondary/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-mcb-secondary text-left">Extensive chord explorer with mode-based chord generation</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-mcb-secondary/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-mcb-secondary text-left">Real-time visualization of scale notes and chord relationships</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-mcb-secondary/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-mcb-secondary text-left">Live mode for performance and improvisation</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Database Context Section */}
                {/* <div className="bg-mcb-primary rounded-lg border border-mcb-primary overflow-hidden">
                    <div className="bg-mcb-tertiary px-4 py-3 border-b border-mcb-primary">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Music Theory Database
                        </h4>
                    </div>
                    <div className="p-4 text-sm leading-relaxed text-mcb-secondary text-left">
                        <p>
                            This application is powered by a comprehensive PostgreSQL database that maps and analyzes complex relationships between chords, modes, and scales. The database enables sophisticated music theory calculations and provides the harmonic foundation for the chord generation and analysis features.
                        </p>
                    </div>
                </div> */}

                {/* Links Section */}
                <div className="bg-mcb-primary rounded-lg border border-mcb-primary overflow-hidden">
                    <div className="bg-mcb-tertiary px-4 py-3 border-b border-mcb-primary">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Links
                        </h4>
                    </div>
                    <div className="p-4 space-y-3">
                        <a
                            href="https://github.com/jekrch/chord-analyzr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 p-3 rounded-lg bg-mcb-secondary/50 hover:bg-mcb-hover/70 transition-all duration-200 group"
                        >
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 group-hover:bg-gray-600 transition-colors">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-white group-hover:text-[var(--mcb-accent-text-light)] transition-colors">
                                    GitHub Repository
                                </div>
                                <div className="text-xs text-mcb-tertiary">
                                    View source code and documentation
                                </div>
                            </div>
                        </a>
                        <a
                            href="https://jacobkrch.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 p-3 rounded-lg bg-mcb-secondary/50 hover:bg-mcb-hover/70 transition-all duration-200 group"
                        >
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--mcb-accent-secondary)] group-hover:bg-[var(--mcb-accent-primary)] transition-colors">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-white group-hover:text-[var(--mcb-accent-text-light)] transition-colors">
                                    jacobkrch.com
                                </div>

                            </div>
                        </a>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-4 border-t border-mcb-primary/50">
                    <p className="text-xs text-mcb-tertiary text-left">
                        © 2025 Jacob Krch. All rights reserved.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default AboutModal;