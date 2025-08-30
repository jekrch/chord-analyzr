import React from 'react';
import Modal from './Modal';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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
                <div className="bg-[#2a2f38] rounded-lg border border-gray-600 overflow-hidden">
                    <div className="bg-[#444b59] px-4 py-3 border-b border-gray-600">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Overview
                        </h4>
                    </div>
                    <div className="p-4 text-sm leading-relaxed space-y-3 text-slate-300 text-left">
                        <p>
                            Modal Chord Buildr is a music theory app that allows you to explore and experiment with chords, modes, and scales in real-time. Build chord progressions, create rhythmic sequences, and hear how different musical elements work together.
                        </p>
                        <p>
                            The application features a virtual piano, pattern sequencer, chord explorer, and comprehensive controls for crafting musical sequences. Whether you're learning music theory, composing, or just experimenting with sounds, Modal Chord Buildr provides an intuitive interface for musical exploration.
                        </p>
                    </div>
                </div>

                {/* Key Features Section */}
                <div className="bg-[#2a2f38] rounded-lg border border-gray-600 overflow-hidden">
                    <div className="bg-[#444b59] px-4 py-3 border-b border-gray-600">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Key Features
                        </h4>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-[#3d434f]/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-300 text-left">Interactive piano with multiple instruments and audio effects</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-[#3d434f]/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-300 text-left">Pattern sequencer with customizable rhythmic patterns</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-[#3d434f]/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-300 text-left">Extensive chord explorer with mode-based chord generation</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-[#3d434f]/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-300 text-left">Real-time visualization of scale notes and chord relationships</span>
                            </div>
                            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-[#3d434f]/50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-300 text-left">Live mode for performance and improvisation</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Database Context Section */}
                {/* <div className="bg-[#2a2f38] rounded-lg border border-gray-600 overflow-hidden">
                    <div className="bg-[#444b59] px-4 py-3 border-b border-gray-600">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Music Theory Database
                        </h4>
                    </div>
                    <div className="p-4 text-sm leading-relaxed text-slate-300 text-left">
                        <p>
                            This application is powered by a comprehensive PostgreSQL database that maps and analyzes complex relationships between chords, modes, and scales. The database enables sophisticated music theory calculations and provides the harmonic foundation for the chord generation and analysis features.
                        </p>
                    </div>
                </div> */}

                {/* Links Section */}
                <div className="bg-[#2a2f38] rounded-lg border border-gray-600 overflow-hidden">
                    <div className="bg-[#444b59] px-4 py-3 border-b border-gray-600">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Links
                        </h4>
                    </div>
                    <div className="p-4 space-y-3">
                        <a
                            href="https://github.com/jekrch/chord-analyzr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 p-3 rounded-lg bg-[#3d434f]/50 hover:bg-[#4a5262]/70 transition-all duration-200 group"
                        >
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 group-hover:bg-gray-600 transition-colors">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">
                                    GitHub Repository
                                </div>
                                <div className="text-xs text-slate-400">
                                    View source code and documentation
                                </div>
                            </div>
                        </a>
                        <a
                            href="https://jacobkrch.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 p-3 rounded-lg bg-[#3d434f]/50 hover:bg-[#4a5262]/70 transition-all duration-200 group"
                        >
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 group-hover:bg-blue-500 transition-colors">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">
                                    jacobkrch.com
                                </div>

                            </div>
                        </a>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-4 border-t border-gray-600/50">
                    <p className="text-xs text-slate-400 text-left">
                        © 2025 Jacob Krch. All rights reserved.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default AboutModal;