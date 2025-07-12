import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { PlayCircleIcon, TrashIcon, XCircleIcon } from '@heroicons/react/20/solid';
import { MidiNumbers } from 'react-piano';
import classNames from 'classnames';
import { ModeScaleChordDto, ScaleControllerService, ScaleNoteDto } from './api';
import { ChordControllerService } from './api/services/ChordControllerService';
import { useModes } from './hooks/useModes';
import { getMidiNotes } from './util/ChordUtil';
import { normalizeNoteName } from './util/NoteUtil';
import ChordTable from './components/ChordTable';
import Dropdown from './components/Dropdown';
import PianoControl from './components/piano/PianoControl';
import TextInput from './components/TextInput';
import PatternSystem from './components/PatternSystem';
import './App.css';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

interface AddedChord {
    name: string;
    notes: string;
}

export interface ActiveNoteInfo {
    note: string;
    octave: number;
}

interface GlobalPatternState {
    pattern: number[];
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
}

function App() {
    const [chords, setChords] = useState<ModeScaleChordDto[]>();
    const [mode, setMode] = useState<string>('Ionian');
    const { modes } = useModes();
    const [key, setKey] = useState<string>('C');
    const [loadingChords, setLoadingChords] = useState<boolean>(false);
    const [activeNotes, setActiveNotes] = useState<ActiveNoteInfo[]>([]);
    const [scaleNotes, setScaleNotes] = useState<ScaleNoteDto[]>([]);
    const [addedChords, setAddedChords] = useState<AddedChord[]>([]);
    const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
    const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);

    const [globalPatternState, setGlobalPatternState] = useState<GlobalPatternState>({
        pattern: [1, 2, 3, 4],
        isPlaying: false,
        bpm: 120,
        subdivision: 1,
        swing: 0,
        currentStep: 0,
        repeat: true,
        lastChordChangeTime: 0,
    });

    const [showPatternSystem, setShowPatternSystem] = useState(false);

    const normalizedScaleNotes: string[] = useMemo(() => {
        if (!scaleNotes) return [];
        return scaleNotes
            .map(scaleNote => scaleNote.noteName ? normalizeNoteName(scaleNote.noteName) : null)
            .filter(Boolean) as string[];
    }, [scaleNotes]);

    const addChordClick = (chordName: string, chordNotes: string) => {
        setAddedChords(current => [...current, { name: chordName, notes: chordNotes }]);
    };

    const removeChord = (indexToRemove: number) => {
        setAddedChords(current => current.filter((_, index) => index !== indexToRemove));
    };

    const playNotes = useCallback((notes: ActiveNoteInfo[]) => {
        setActiveNotes([]);
        setTimeout(() => setActiveNotes(notes), 1);
    }, []);

    const handleChordClick = useCallback((chordNoteNames: string, chordIndex?: number) => {
        if (isDeleteMode && chordIndex !== undefined) {
            removeChord(chordIndex);
            return;
        }

        const notesWithOctaves = getMidiNotes(
            START_OCTAVE, END_OCTAVE, chordNoteNames
        );

        if (globalPatternState.isPlaying) {
            setGlobalPatternState(prev => ({
                ...prev,
                lastChordChangeTime: Date.now(),
            }));
        }

        setActiveChordIndex(chordIndex ?? null);
        playNotes(notesWithOctaves as ActiveNoteInfo[]);

        // Only highlight if it's a button from the added chords list
        if (chordIndex !== undefined) {
           setTimeout(() => setActiveChordIndex(null), 150);
        }
    }, [playNotes, globalPatternState.isPlaying, isDeleteMode]);

    const playScaleNotes = () => {
        if (!scaleNotes?.length || !scaleNotes[0]?.noteName) {
            return;
        }

        const wasPlaying = globalPatternState.isPlaying;
        if (wasPlaying) {
            setGlobalPatternState(prev => ({ ...prev, isPlaying: false }));
        }

        const noteDuration = 300;
        let cumulativeDelay = 0;
        let currentOctave = 4;
        let lastMidiNumber = 0;

        const scaleNotesWithTonic = [...scaleNotes, { noteName: scaleNotes[0].noteName }];

        scaleNotesWithTonic.forEach((scaleNote) => {
            if (!scaleNote.noteName) return;

            setTimeout(() => {
                let noteName = normalizeNoteName(scaleNote.noteName);
                let midiNumber = MidiNumbers.fromNote(noteName! + currentOctave);

                if (midiNumber < lastMidiNumber) {
                    currentOctave++;
                    midiNumber += 12;
                }

                lastMidiNumber = midiNumber;
                const noteDetails = MidiNumbers.getAttributes(midiNumber);
                const note = noteDetails.note.slice(0, -1);
                const octave = parseInt(noteDetails.note.slice(-1), 10);

                playNotes([{ note, octave }]);
            }, cumulativeDelay);

            cumulativeDelay += noteDuration;
        });

        setTimeout(() => {
            setActiveNotes([]);
            if (wasPlaying) {
                setGlobalPatternState(prev => ({ ...prev, isPlaying: true }));
            }
        }, cumulativeDelay + noteDuration);
    };

    const handleKeyPress = useCallback((event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement) return;

        if (event.key.toLowerCase() === 'p') {
            setShowPatternSystem(prev => !prev);
            return;
        }

        if (event.key === ' ') {
            event.preventDefault();
            setGlobalPatternState(prev => ({
                ...prev,
                isPlaying: !prev.isPlaying,
                lastChordChangeTime: Date.now(),
            }));
            return;
        }

        const keyMapIndex = event.key === '0' ? 9 : parseInt(event.key, 10) - 1;
        if (!isNaN(keyMapIndex) && keyMapIndex >= 0 && keyMapIndex < addedChords.length) {
            const chordToPlay = addedChords[keyMapIndex];
            if (chordToPlay) {
                handleChordClick(chordToPlay.notes, keyMapIndex);
            }
        }
    }, [addedChords, handleChordClick]);
    
    const handlePatternChange = useCallback((newPatternState: Partial<GlobalPatternState>) => {
        setGlobalPatternState(prev => ({
            ...prev,
            ...newPatternState,
            lastChordChangeTime: newPatternState.lastChordChangeTime || prev.lastChordChangeTime,
        }));
    }, []);

    useEffect(() => {
        if (!key) return;
        setLoadingChords(true);
        setChords([]);

        ChordControllerService.getModeKeyChords(key, mode)
            .then(setChords)
            .catch(err => console.error('Error fetching chords:', err))
            .finally(() => setLoadingChords(false));

        ScaleControllerService.getScaleNotes(key, mode)
            .then(setScaleNotes)
            .catch(err => console.error('Error fetching scale notes:', err));
    }, [key, mode]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    return (
        <div className="text-center">
            <div className="bg-[#282c34] min-h-screen flex flex-col items-center justify-center text-[calc(10px+2vmin)] text-white p-10">
                <div className="mb-4 flex items-center space-x-4">
                    <div className="flex items-center">
                        <TextInput
                            label="Key"
                            value={key}
                            onChange={setKey}
                        />
                        <PlayCircleIcon
                            onClick={playScaleNotes}
                            height={30}
                            className="inline-block ml-2 hover:text-slate-400 active:text-slate-500 cursor-pointer"
                        />
                    </div>

                    {modes && (
                        <Dropdown
                            value={mode}
                            className='w-auto min-w-[10em]'
                            menuClassName='min-w-[10em]'
                            onChange={setMode}
                            showSearch={true}
                            options={modes}
                        />
                    )}
                </div>
                
                <div className="mb-6 flex items-center justify-center space-x-6">
                    <button
                        onClick={() => setShowPatternSystem(!showPatternSystem)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                            showPatternSystem
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                        }`}
                    >
                        {showPatternSystem ? 'Hide' : 'Show'} Pattern System
                    </button>
                    
                    <div className="text-xs text-gray-400 text-center">
                        <div>Press 'P' to toggle | Space to play/pause</div>
                        <div>1-9 for chords | Fixed clock timing</div>
                    </div>
                </div>

                <div className="mb-6">
                    <PianoControl
                        activeNotes={activeNotes}
                        normalizedScaleNotes={normalizedScaleNotes}
                        globalPatternState={globalPatternState as any}
                        onPatternStateChange={handlePatternChange}
                    />
                </div>

                {showPatternSystem && (
                    <div className="mb-6 w-full max-w-6xl">
                        <PatternSystem
                            activeNotes={activeNotes}
                            normalizedScaleNotes={normalizedScaleNotes}
                            onPatternChange={handlePatternChange}
                            globalPatternState={globalPatternState as any}
                        />
                    </div>
                )}

                <div className={classNames('mb-6', { 'hidden': addedChords.length === 0 })}>
                    <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
                        {addedChords.map((chord, index) => (
                            <button
                                key={index}
                                className={classNames('py-2 px-4 rounded-lg font-medium text-sm transition-all duration-150 relative group', {
                                    'bg-cyan-500 shadow-md text-white': index === activeChordIndex && !isDeleteMode,
                                    'bg-cyan-700 hover:bg-cyan-600 text-white': index !== activeChordIndex && !isDeleteMode,
                                    'bg-red-700 hover:bg-red-600 text-white shadow-md': isDeleteMode,
                                })}
                                onClick={() => handleChordClick(chord.notes, index)}
                            >
                                {isDeleteMode && (
                                    <XCircleIcon className="absolute -top-1 -right-1 h-5 w-5 text-white bg-red-500 rounded-full" />
                                )}
                                <span className="text-xs text-cyan-200 mr-1 font-bold">{index + 1}</span>
                                {chord.name}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-center items-center gap-4">
                        <button
                            className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                            onClick={() => setAddedChords([])}
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => setIsDeleteMode(!isDeleteMode)}
                            className={classNames('flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg transition-colors', {
                                'bg-red-600 hover:bg-red-700 text-white': isDeleteMode,
                                'bg-gray-600 hover:bg-gray-700 text-white': !isDeleteMode
                            })}
                        >
                            <TrashIcon className="h-4 w-4" />
                            {isDeleteMode ? 'Finish Deleting' : 'Delete Chords'}
                        </button>
                    </div>
                </div>
                
                {globalPatternState.isPlaying && (
                    <div className="mb-6 px-4 py-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
                        <div className="text-sm text-green-300 flex items-center justify-center space-x-4">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                <span className="font-medium">Pattern Playing</span>
                            </div>
                            <div className="text-xs opacity-80">
                                {globalPatternState.pattern.join('-')} | 
                                {globalPatternState.bpm} BPM | 
                                Step {(globalPatternState.currentStep % globalPatternState.pattern.length) + 1}/{globalPatternState.pattern.length}
                            </div>
                        </div>
                    </div>
                )}
                
                <ChordTable
                    chords={chords?.filter(c => !!c.chordName && !!c.chordNoteNames) as any}
                    loading={loadingChords}
                    onChordClick={handleChordClick}
                    addChordClick={addChordClick}
                />
            </div>
        </div>
    );
}

export default App;