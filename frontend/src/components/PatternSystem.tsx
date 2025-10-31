import React, { useState, useMemo, useEffect, memo, useCallback, useRef, lazy } from 'react';
import { PlayCircleIcon, PauseIcon, ArrowPathIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, MinusIcon } from '@heroicons/react/20/solid';
import { PATTERN_PRESETS, PATTERN_CATEGORIES } from '../util/Pattern';
import debounce from 'lodash/debounce';
import Dropdown from './Dropdown';
import PatternPresetSelector from './PatternPresetSelector';
import Slider from './Slider';
import { Button } from './Button';
import { useMusicStore } from '../stores/musicStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { usePatternStore } from '../stores/patternStore';
import MidiRecorder from './MidiRecorder';

// Lazy load heavy modal component
const PatternNotationHelpModal = lazy(() => import('./PatternNotationHelpModal'));

const SUBDIVISIONS = [
  { value: 0.125, symbol: '♬', name: '32nd notes' },
  { value: 0.25, symbol: '♪', name: '16th notes' },
  { value: 0.5, symbol: '♩', name: '8th notes' },
  { value: 1.0, symbol: '♪', name: 'Quarter notes' },
  { value: 2.0, symbol: '♪', name: 'Half notes' },
];

interface PatternSystemProps {
}

// Memoized Step Editor with updated styling and custom dropdown
const StepEditor = memo(({
  stepIndex,
  stepValue,
  maxNotes,
  onStepChange
}: {
  stepIndex: number;
  stepValue: string;
  maxNotes: number;
  onStepChange: (index: number, value: string) => void;
}) => {
  const options = useMemo(() => {
    const opts = ['—']; // Rest option
    for (let i = 1; i <= maxNotes; i++) {
      opts.push(String(i));
      opts.push(`${i}↑`);
    }
    return opts;
  }, [maxNotes]);

  // Check if the current step value exceeds available notes
  const getDisplayValue = () => {
    if (stepValue === 'x') return '—';

    const noteNum = parseInt(stepValue.replace('+', ''));
    if (!isNaN(noteNum) && noteNum > maxNotes) {
      return '—'; // Show as rest if note number exceeds available notes
    }

    return stepValue.replace('+', '↑');
  };

  const displayValue = getDisplayValue();

  // Check if we're showing a rest due to exceeding available notes
  const isExceedingNotes = stepValue !== 'x' && displayValue === '—';

  const handleChange = (value: string) => {
    let convertedValue = value;
    if (value === '—') {
      convertedValue = 'x';
    } else if (value.includes('↑')) {
      convertedValue = value.replace('↑', '+');
    }
    onStepChange(stepIndex, convertedValue);
  };

  return (
    <div className="relative">
      <Dropdown
        value={displayValue}
        onChange={handleChange}
        options={options}
        className="w-full"
        buttonClassName={`w-full h-10 text-xs pl-2.5 ${stepValue === 'x'
          ? 'bg-[#3d434f] border-gray-700 text-slate-400'
          : isExceedingNotes
            ? 'bg-[#3d434f] border-gray-700 text-orange-400' // Different color for exceeded notes
            : 'bg-[#3d434f] border-gray-600 text-slate-200 hover:bg-[#4a5262]'
          } border rounded transition-all duration-200`}
      />
    </div>
  );
});

StepEditor.displayName = 'StepEditor';

const PatternSystem: React.FC<PatternSystemProps> = () => {
  // Optimized store subscriptions with individual selectors
  const addedChords = usePlaybackStore((state: any) => state.addedChords);
  const activeChordIndex = usePlaybackStore((state: any) => state.activeChordIndex);
  const updateChordPattern = usePlaybackStore((state: any) => state.updateChordPattern);

  const currentlyActivePattern = usePatternStore((state: any) => state.currentlyActivePattern);
  const globalPatternState = usePatternStore((state: any) => state.globalPatternState);
  const setGlobalPatternState = usePatternStore((state: any) => state.setGlobalPatternState);
  const updatePattern = usePatternStore((state: any) => state.updatePattern);

  // ========== LOCAL STATE ==========
  const [isSequencerExpanded, setIsSequencerExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
  const [customPattern, setCustomPattern] = useState<string>('1,2,3,4');
  const [hideFewerNotePatterns, setHideFewerNotePatterns] = useState(false);

  // Refs for stable callbacks
  const activeChordIndexRef = useRef(activeChordIndex);
  const updateChordPatternRef = useRef(updateChordPattern);
  const setGlobalPatternStateRef = useRef(setGlobalPatternState);

  useEffect(() => {
    activeChordIndexRef.current = activeChordIndex;
  }, [activeChordIndex]);

  useEffect(() => {
    updateChordPatternRef.current = updateChordPattern;
  }, [updateChordPattern]);

  useEffect(() => {
    setGlobalPatternStateRef.current = setGlobalPatternState;
  }, [setGlobalPatternState]);

  // ========== PATTERN MANAGEMENT ==========

  // Get current chord data
  const currentChord = useMemo(() => 
    activeChordIndex !== null ? addedChords[activeChordIndex] : null,
    [activeChordIndex, addedChords]
  );

  const currentPattern = currentChord?.pattern ?? globalPatternState.currentPattern;

  const editingContext = useMemo(() => {
    if (currentChord) {
      return {
        type: 'chord' as const,
        title: `Pattern for "${currentChord.name}"`,
        description: `Editing pattern for this specific chord`,
        chordName: currentChord.name
      };
    }
    return {
      type: 'current' as const,
      title: 'Global Pattern',
      description: 'Base pattern - becomes active when no chord is selected',
      chordName: null
    };
  }, [currentChord]);

  // Calculate chord note count (number of distinct notes in the chord)
  const chordNoteCount = useMemo(() => {
    if (currentChord) {
      // Parse the chord notes and count DISTINCT notes (ignoring octave)
      const notes = currentChord.notes.split(',').map((note: any) => note.trim()).filter((note: any) => note);
      const distinctNotes = new Set(notes.map((note: any) => {
        // Remove octave numbers to get just the note name (C4 -> C, Bb3 -> Bb)
        return note.replace(/\d+$/, '');
      }));
      return distinctNotes.size;
    }
    // For global pattern, use a reasonable default
    return 4;
  }, [currentChord]);

  // Calculate maximum notes based on chord definition
  const maxAvailableNotes = useMemo(() => {
    // Always allow access up to the chord's note count
    // But maintain a minimum of 4 for usability, unless the chord has fewer notes
    const minNotes = Math.min(4, chordNoteCount);
    return Math.max(minNotes, chordNoteCount);
  }, [chordNoteCount]);

  // Update custom pattern input when current pattern changes
  useEffect(() => {
    if (currentPattern) {
      setCustomPattern(currentPattern.join(','));
    }
  }, [currentPattern]);

  // ========== CONTROL FUNCTIONS ==========

  const togglePlayback = useCallback(() => {
    const newIsPlaying = !globalPatternState.isPlaying;
    setGlobalPatternStateRef.current({ isPlaying: newIsPlaying });
  }, [globalPatternState.isPlaying]);

  const resetPattern = useCallback(() => {
    setGlobalPatternStateRef.current({
      isPlaying: false,
      currentStep: 0
    });
  }, []);

  // Stable callback using refs
  const updateCurrentPattern = useCallback((newPattern: string[]) => {
    const idx = activeChordIndexRef.current;
    if (idx !== null) {
      updateChordPatternRef.current(idx, newPattern);
    } else {
      setGlobalPatternStateRef.current({ currentPattern: newPattern });
    }
  }, []);

  const handleStepChange = useCallback((stepIndex: number, value: string) => {
    const newPattern = [...currentPattern];
    newPattern[stepIndex] = value;
    updateCurrentPattern(newPattern);
  }, [currentPattern, updateCurrentPattern]);

  const addStep = useCallback(() => {
    if (currentPattern.length < 16) {
      const newPattern = [...currentPattern, 'x'];
      updateCurrentPattern(newPattern);
    }
  }, [currentPattern, updateCurrentPattern]);

  const removeStep = useCallback(() => {
    if (currentPattern.length > 1) {
      const newPattern = currentPattern.slice(0, -1);
      updateCurrentPattern(newPattern);
    }
  }, [currentPattern, updateCurrentPattern]);

  const applyCustomPattern = useCallback(() => {
    try {
      const pattern = customPattern.split(',').map(s => s.trim()).filter(s => s);
      if (pattern.length > 0) {
        updateCurrentPattern(pattern);
      }
    } catch (error) {
      console.error('Invalid pattern format');
    }
  }, [customPattern, updateCurrentPattern]);

  const applyPreset = useCallback((preset: typeof PATTERN_PRESETS[0]) => {
    updateCurrentPattern(preset.pattern);
  }, [updateCurrentPattern]);

  // Debounced handler for pattern changes
  const debouncedPatternChange = useMemo(
    () => debounce((newPatternState: Partial<any>) => {
      updatePattern(newPatternState);
    }, 50),
    [updatePattern]
  );

  // Calculate which step is currently playing
  const currentStepIndex = useMemo(() => {
    if (!globalPatternState.isPlaying) return -1;
    return globalPatternState.currentStep % currentPattern.length;
  }, [globalPatternState.isPlaying, globalPatternState.currentStep, currentPattern.length]);

  // Subdivision options for dropdown
  const subdivisionOptions = SUBDIVISIONS.map(sub => `${sub.symbol} ${sub.name}`);

  // Get current subdivision display - ensure it matches the actual value
  const currentSubdivision = SUBDIVISIONS.find(sub => sub.value === globalPatternState.subdivision);
  const currentSubdivisionDisplay = currentSubdivision ? `${currentSubdivision.symbol} ${currentSubdivision.name}` : `${SUBDIVISIONS[1].symbol} ${SUBDIVISIONS[1].name}`;

  // Memoize step grid rows
  const stepGridConfig = useMemo(() => {
    // You might want to use a proper media query hook here
    const cols = window.innerWidth >= 768 ? 8 : 4;
    const rows = Array.from(
      { length: Math.ceil(currentPattern.length / cols) },
      (_, rowIndex) => {
        const startIndex = rowIndex * cols;
        const endIndex = Math.min(startIndex + cols, currentPattern.length);
        return {
          startIndex,
          endIndex,
          steps: currentPattern.slice(startIndex, endIndex)
        };
      }
    );
    return { cols, rows };
  }, [currentPattern]);

  // ========== RENDER ==========

  return (
    <div className="w-full max-w-7xl mx-auto px-2 mt-4">
      {/* Main Header - Clean and Simple */}
      <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden">
        
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sequencer</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSequencerExpanded(!isSequencerExpanded)}
                className="w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200"
              >
                {isSequencerExpanded ? (
                  <>
                    <ChevronUpIcon className="w-3 h-3" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="w-3 h-3" />
                    <span>Show</span>
                  </>
                )}
              </button>
              <Button
                onClick={togglePlayback}
                variant="play-stop"
                size="sm"
                active={globalPatternState.isPlaying}
                className="shadow-lg"
              >
                {globalPatternState.isPlaying ? (
                  <>
                    <PauseIcon className="w-6 h-6" />
                    <span className="hidden sm:inline">Stop</span>
                  </>
                ) : (
                  <>
                    <PlayCircleIcon className="w-6 h-6" />
                    <span className="hidden sm:inline">Play</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* MIDI Recorder Row - Always visible */}
          <div className="mt-3 pt-3 border-t border-gray-600">
            <MidiRecorder />
          </div>
        </div>

        {/* Expandable Sequencer Content */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isSequencerExpanded ? ' opacity-100' : 'max-h-0 opacity-0'
        }`}>
          {/* Pattern Editor Section */}
          <div className="border-t border-gray-600 bg-[#444b59]">
            {/* Pattern Controls Bar */}
            <div className="px-4 py-3 border-b border-gray-600 bg-[#3d434f]">
              {/* Mobile Layout: Single row with step controls left, chord label right */}
              <div className="flex items-center justify-between sm:hidden">
                {/* Left: Step controls */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={removeStep}
                    disabled={currentPattern.length <= 1}
                    className="flex items-center justify-center w-7 h-7 bg-[#4a5262] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-all duration-200 text-slate-200 hover:text-white disabled:hover:bg-[#4a5262] disabled:hover:text-slate-200"
                    title="Remove step"
                  >
                    <MinusIcon className="w-3 h-3" />
                  </button>
                  <div className="text-xs text-slate-300 font-mono w-8 text-center">
                    {currentPattern.length}
                  </div>
                  <button
                    onClick={addStep}
                    disabled={currentPattern.length >= 16}
                    className="flex items-center justify-center w-7 h-7 bg-[#4a5262] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-all duration-200 text-slate-200 hover:text-white disabled:hover:bg-[#4a5262] disabled:hover:text-slate-200"
                    title="Add step"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Right: Chord label */}
                <div>
                  {editingContext.chordName ? (
                    <div className="text-xs font-medium text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-700/50">
                      {editingContext.chordName}
                    </div>
                  ) : (
                    <div className="text-xs text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded border border-cyan-700/50">
                      Global Pattern
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Layout: Original multi-section layout */}
              <div className="hidden sm:flex sm:items-center sm:justify-between">
                {/* Left side: Pattern info and chord name */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400 font-medium">Pattern:</span>
                    <div className="text-xs text-slate-300 font-mono bg-[#4a5262] px-2 py-1 rounded">
                      {currentPattern.length} steps
                    </div>
                  </div>
                  {editingContext.chordName && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">for</span>
                      <div className="text-xs font-medium text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-700/50">
                        {editingContext.chordName}
                      </div>
                    </div>
                  )}
                  {!editingContext.chordName && (
                    <div className="text-xs text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded border border-cyan-700/50">
                      Global Pattern
                    </div>
                  )}
                </div>
                
                {/* Right side: Step controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Steps:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={removeStep}
                      disabled={currentPattern.length <= 1}
                      className="flex items-center justify-center w-7 h-7 bg-[#4a5262] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-all duration-200 text-slate-200 hover:text-white disabled:hover:bg-[#4a5262] disabled:hover:text-slate-200"
                      title="Remove step"
                    >
                      <MinusIcon className="w-3 h-3" />
                    </button>
                    <div className="text-xs text-slate-300 font-mono w-8 text-center">
                      {currentPattern.length}
                    </div>
                    <button
                      onClick={addStep}
                      disabled={currentPattern.length >= 16}
                      className="flex items-center justify-center w-7 h-7 bg-[#4a5262] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-all duration-200 text-slate-200 hover:text-white disabled:hover:bg-[#4a5262] disabled:hover:text-slate-200"
                      title="Add step"
                    >
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step Grid */}
            <div className="p-6 px-3 sm:px-4">
              {/* Mobile Layout: 4 columns */}
              <div className="block md:hidden">
                {stepGridConfig.rows.map((row, rowIndex) => (
                  <div key={`mobile-row-${rowIndex}`} className="mb-4 last:mb-0">
                    <div className="grid grid-cols-4 gap-2">
                      {row.steps.map((step: any, stepIndex: any) => {
                        const globalIndex = row.startIndex + stepIndex;
                        return (
                          <StepEditor
                            key={globalIndex}
                            stepIndex={globalIndex}
                            stepValue={step}
                            maxNotes={maxAvailableNotes}
                            onStepChange={handleStepChange}
                          />
                        );
                      })}
                      {Array.from({ length: 4 - row.steps.length }, (_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {row.steps.map((_: any, stepIndex: any) => {
                        const globalIndex = row.startIndex + stepIndex;
                        return (
                          <div key={`indicator-${globalIndex}`} className="flex justify-center">
                            <div className={`transition-all duration-200 ${currentStepIndex === globalIndex
                              ? 'w-full h-1 bg-blue-400 rounded-full'
                              : 'w-full h-1 bg-gray-600 rounded-full'
                              }`}></div>
                          </div>
                        );
                      })}
                      {Array.from({ length: 4 - row.steps.length }, (_, i) => (
                        <div key={`empty-indicator-${i}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Layout: 8 columns */}
              <div className="hidden md:block">
                {stepGridConfig.rows.map((row, rowIndex) => (
                  <div key={`desktop-row-${rowIndex}`} className="mb-4 last:mb-0">
                    <div className="grid grid-cols-8 gap-2">
                      {row.steps.map((step: any, stepIndex: any) => {
                        const globalIndex = row.startIndex + stepIndex;
                        return (
                          <StepEditor
                            key={globalIndex}
                            stepIndex={globalIndex}
                            stepValue={step}
                            maxNotes={maxAvailableNotes}
                            onStepChange={handleStepChange}
                          />
                        );
                      })}
                      {Array.from({ length: 8 - row.steps.length }, (_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                    </div>

                    <div className="grid grid-cols-8 gap-2 mt-2">
                      {row.steps.map((_: any, stepIndex: any) => {
                        const globalIndex = row.startIndex + stepIndex;
                        return (
                          <div key={`indicator-${globalIndex}`} className="flex justify-center">
                            <div className={`transition-all duration-200 ${currentStepIndex === globalIndex
                              ? 'w-full h-1 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50'
                              : 'w-full h-1 bg-gray-600 rounded-full'
                              }`}></div>
                          </div>
                        );
                      })}
                      {Array.from({ length: 8 - row.steps.length }, (_, i) => (
                        <div key={`empty-indicator-${i}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Settings Section - Now completely inside the expandable area */}
          <div className="bg-[#3d434f] border-t border-gray-600">
            <div className="px-4 py-3 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
                  Settings
                </h3>
                <button
                  onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                  className="w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200"
                >
                  {isSettingsExpanded ? (
                    <>
                      <ChevronUpIcon className="w-3 h-3" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-3 h-3" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Settings Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isSettingsExpanded ? ' opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-6 bg-[#444b59]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">

                  {/* Timing Controls */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Timing</label>
                    </div>

                    <Slider
                      label="BPM"
                      value={globalPatternState.bpm}
                      min={60}
                      max={200}
                      step={1}
                      onChange={(value) => debouncedPatternChange({ bpm: Math.round(value) })}
                      showMinMax={true}
                      minLabel="60"
                      maxLabel="200"
                    />

                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Subdivision</label>
                      <Dropdown
                        value={currentSubdivisionDisplay}
                        onChange={(value) => {
                          const subdivision = SUBDIVISIONS.find(sub => `${sub.symbol} ${sub.name}` === value);
                          if (subdivision) {
                            debouncedPatternChange({ subdivision: subdivision.value });
                          }
                        }}
                        options={subdivisionOptions}
                        className="w-full"
                        buttonClassName="w-full p-3 bg-[#3d434f] border border-gray-600 rounded text-slate-200 text-xs focus:border-blue-500 transition-colors hover:bg-[#4a5262]"
                      />
                    </div>

                    <Slider
                      label="Swing"
                      value={globalPatternState.swing}
                      min={0}
                      max={50}
                      step={1}
                      suffix="%"
                      onChange={(value) => debouncedPatternChange({ swing: Math.round(value) })}
                      showMinMax={true}
                      minLabel="0%"
                      maxLabel="50%"
                    />
                  </div>

                  {/* Pattern Presets - Now using the extracted component */}
                  <PatternPresetSelector
                    chordNoteCount={chordNoteCount}
                    maxAvailableNotes={maxAvailableNotes}
                    hideFewerNotePatterns={hideFewerNotePatterns}
                    onHideFewerNotePatternsChange={setHideFewerNotePatterns}
                    onApplyPreset={applyPreset}
                    currentPattern={currentlyActivePattern}
                  />

                  {/* Custom Pattern Input - Compact */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <label className="block text-xs font-medium text-slate-200 uppercase tracking-wide">Custom</label>
                      <React.Suspense fallback={<div className="w-4 h-4" />}>
                        <PatternNotationHelpModal />
                      </React.Suspense>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={customPattern}
                        onChange={(e) => setCustomPattern(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && applyCustomPattern()}
                        placeholder="1,x,3,2+"
                        className="w-full p-2 bg-[#3d434f] border border-gray-600 rounded text-slate-200 text-xs focus:border-blue-500 transition-colors placeholder-slate-500"
                      />
                      <button
                        onClick={applyCustomPattern}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors uppercase tracking-wide"
                      >
                        Apply Pattern
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternSystem;