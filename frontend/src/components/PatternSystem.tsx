import React, { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { PlayCircleIcon, PauseIcon, ArrowPathIcon, Cog6ToothIcon } from '@heroicons/react/20/solid';
import { PATTERN_PRESETS, SUBDIVISIONS } from '../util/Pattern';
import Dropdown from './Dropdown'; // Import the custom dropdown

interface ChordPattern {
  pattern: string[];
  enabled: boolean;
}

interface PatternSystemProps {
  activeNotes: { note: string; octave?: number }[];
  normalizedScaleNotes: string[];
  addedChords: { name: string; notes: string; creationPattern: string[] }[];
  activeChordIndex: number | null;
  getCurrentPattern: () => string[];
  onPatternChange?: (newPatternState: Partial<{
    defaultPattern: string[];
    chordPatterns: { [chordIndex: number]: ChordPattern };
    bpm: number;
    subdivision: number;
    isPlaying: boolean;
    currentStep: number;
    swing: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
  }>) => void;
  globalPatternState: {
    defaultPattern: string[];
    chordPatterns: { [chordIndex: number]: ChordPattern };
    bpm: number;
    subdivision: number;
    isPlaying: boolean;
    currentStep: number;
    swing: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
  };
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
    for (let i = 1; i <= Math.min(maxNotes, 8); i++) {
      opts.push(String(i));
      opts.push(`${i}↑`);
    }
    return opts;
  }, [maxNotes]);

  const displayValue = stepValue === 'x' ? '—' : stepValue.replace('+', '↑');

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
        buttonClassName={`w-full h-8 text-xs ${
          stepValue === 'x' 
            ? 'bg-[#3d434f] border-gray-700 text-slate-400'
            : 'bg-[#3d434f] border-gray-600 text-slate-200 hover:bg-[#4a5262]'
        } border rounded transition-all duration-200`}
      />
    </div>
  );
});

StepEditor.displayName = 'StepEditor';

const PatternSystem: React.FC<PatternSystemProps> = ({
  activeNotes,
  addedChords,
  activeChordIndex,
  onPatternChange,
  globalPatternState
}) => {
  // ========== LOCAL STATE ==========
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPattern, setCustomPattern] = useState<string>('1,2,3,4');

  // ========== PATTERN MANAGEMENT ==========
  
  // Determine which pattern to show and edit with clear isolation
  const { currentPattern, editingContext } = useMemo(() => {
    if (activeChordIndex !== null && addedChords[activeChordIndex]) {
      const chord = addedChords[activeChordIndex];
      const hasCustomOverride = globalPatternState.chordPatterns[activeChordIndex]?.enabled;
      
      if (hasCustomOverride) {
        return {
          currentPattern: globalPatternState.chordPatterns[activeChordIndex].pattern,
          editingContext: {
            type: 'custom' as const,
            title: `Custom Pattern: "${chord.name}"`,
            description: `Overriding creation pattern (${chord.creationPattern.join('-')})`,
            chordName: chord.name,
            canReset: true
          }
        };
      } else {
        return {
          currentPattern: chord.creationPattern,
          editingContext: {
            type: 'creation' as const,
            title: `Creation Pattern for "${chord.name}"`,
            description: `Pattern from when this chord was added`,
            chordName: chord.name,
            canReset: false
          }
        };
      }
    } else {
      return {
        currentPattern: globalPatternState.defaultPattern,
        editingContext: {
          type: 'default' as const,
          title: 'Default Pattern',
          description: '',
          chordName: null,
          canReset: false
        }
      };
    }
  }, [activeChordIndex, addedChords, globalPatternState.chordPatterns, globalPatternState.defaultPattern]);

  // Update custom pattern input when current pattern changes
  useEffect(() => {
    if (currentPattern) {
      setCustomPattern(currentPattern.join(','));
    }
  }, [currentPattern]);

  // ========== CONTROL FUNCTIONS ==========
  
  const togglePlayback = useCallback(() => {
    const newIsPlaying = !globalPatternState.isPlaying;
    onPatternChange?.({ 
      isPlaying: newIsPlaying
    });
  }, [globalPatternState.isPlaying, onPatternChange]);

  const resetPattern = useCallback(() => {
    onPatternChange?.({ 
      isPlaying: false,
      currentStep: 0
    });
  }, [onPatternChange]);

  const updateCurrentPattern = useCallback((newPattern: string[]) => {
    if (editingContext.type === 'default') {
      onPatternChange?.({ defaultPattern: newPattern });
    } else if (editingContext.type === 'creation') {
      const newChordPatterns = { ...globalPatternState.chordPatterns };
      newChordPatterns[activeChordIndex!] = { 
        pattern: newPattern, 
        enabled: true 
      };
      onPatternChange?.({ chordPatterns: newChordPatterns });
    } else if (editingContext.type === 'custom') {
      const newChordPatterns = { ...globalPatternState.chordPatterns };
      newChordPatterns[activeChordIndex!] = { 
        pattern: newPattern, 
        enabled: true 
      };
      onPatternChange?.({ chordPatterns: newChordPatterns });
    }
  }, [editingContext.type, activeChordIndex, globalPatternState.chordPatterns, onPatternChange]);

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

  const resetToCreationPattern = useCallback(() => {
    if (activeChordIndex !== null && addedChords[activeChordIndex]) {
      const newChordPatterns = { ...globalPatternState.chordPatterns };
      delete newChordPatterns[activeChordIndex];
      onPatternChange?.({ chordPatterns: newChordPatterns });
    }
  }, [activeChordIndex, addedChords, globalPatternState.chordPatterns, onPatternChange]);

  // Calculate which step is currently playing
  const currentStepIndex = useMemo(() => {
    if (!globalPatternState.isPlaying) return -1;
    return globalPatternState.currentStep % currentPattern.length;
  }, [globalPatternState.isPlaying, globalPatternState.currentStep, currentPattern.length]);

  // Subdivision options for dropdown
  const subdivisionOptions = SUBDIVISIONS.map(sub => `${sub.symbol} ${sub.name}`);
  const currentSubdivisionDisplay = SUBDIVISIONS.find(sub => sub.value === globalPatternState.subdivision)?.symbol + ' ' + SUBDIVISIONS.find(sub => sub.value === globalPatternState.subdivision)?.name || '';

  // ========== RENDER ==========

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold text-slate-200">Sequencer</h2>
          <div className="text-xs text-slate-400 hidden sm:block">
            {editingContext.description}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 ${
              showAdvanced 
                ? 'bg-[#4a5262] border-gray-600 text-slate-200' 
                : 'bg-[#3d434f] border-gray-600 text-slate-400 hover:bg-[#4a5262] hover:border-gray-500 hover:text-slate-200'
            }`}
          >
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlayback}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors text-sm uppercase tracking-wide ${
              globalPatternState.isPlaying
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {globalPatternState.isPlaying ? (
              <><PauseIcon className="w-4 h-4 mr-2" />Stop</>
            ) : (
              <><PlayCircleIcon className="w-4 h-4 mr-2" />Play</> 
            )}
          </button>
          <button
            onClick={resetPattern}
            className="w-8 h-8 flex items-center justify-center bg-[#3d434f] hover:bg-[#4a5262] text-slate-400 hover:text-slate-200 border border-gray-600 hover:border-gray-500 rounded-lg transition-all duration-200"
            title="Reset pattern"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description for mobile */}
      <div className="text-xs text-slate-400 mb-4 sm:hidden">
        {editingContext.description}
      </div>

      {/* Main Pattern Display */}
      <div className="mb-4 bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-sm font-medium text-slate-200 uppercase tracking-wider">
                {editingContext.title}
              </div>
              {editingContext.canReset && (
                <button
                  onClick={resetToCreationPattern}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors uppercase tracking-wide"
                  title="Remove custom override and use original creation pattern"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Steps: {currentPattern.length}</div>
              <button 
                onClick={removeStep} 
                disabled={currentPattern.length <= 1}
                className="w-6 h-6 bg-[#4a5262] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-colors text-slate-200"
              >-</button>
              <button 
                onClick={addStep} 
                disabled={currentPattern.length >= 16}
                className="w-6 h-6 bg-[#4a5262] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-colors text-slate-200"
              >+</button>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-[#444b59]">
          {/* Step Grid - Responsive: 4 columns on mobile, 8 on larger screens */}
          {/* Mobile Layout: 4 columns */}
          <div className="block md:hidden">
            {Array.from({ length: Math.ceil(currentPattern.length / 4) }, (_, rowIndex) => {
              const startIndex = rowIndex * 4;
              const endIndex = Math.min(startIndex + 4, currentPattern.length);
              const rowSteps = currentPattern.slice(startIndex, endIndex);
              
              return (
                <div key={`mobile-row-${rowIndex}`} className="mb-3 last:mb-0">
                  <div className="grid grid-cols-4 gap-1">
                    {rowSteps.map((step, stepIndex) => {
                      const globalIndex = startIndex + stepIndex;
                      return (
                        <StepEditor
                          key={`pattern-${editingContext.type}-${activeChordIndex}-${globalIndex}`}
                          stepIndex={globalIndex}
                          stepValue={step}
                          maxNotes={Math.max(4, activeNotes.length)}
                          onStepChange={handleStepChange}
                        />
                      );
                    })}
                    {Array.from({ length: 4 - rowSteps.length }, (_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {rowSteps.map((_, stepIndex) => {
                      const globalIndex = startIndex + stepIndex;
                      return (
                        <div key={`indicator-${globalIndex}`} className="flex justify-center">
                          <div className={`transition-all duration-300 ${
                            currentStepIndex === globalIndex 
                              ? 'w-full h-1 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50' 
                              : 'w-full h-1 bg-gray-600 rounded-full'
                          }`}></div>
                        </div>
                      );
                    })}
                    {Array.from({ length: 4 - rowSteps.length }, (_, i) => (
                      <div key={`empty-indicator-${i}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Layout: 8 columns */}
          <div className="hidden md:block">
            {Array.from({ length: Math.ceil(currentPattern.length / 8) }, (_, rowIndex) => {
              const startIndex = rowIndex * 8;
              const endIndex = Math.min(startIndex + 8, currentPattern.length);
              const rowSteps = currentPattern.slice(startIndex, endIndex);
              
              return (
                <div key={`desktop-row-${rowIndex}`} className="mb-3 last:mb-0">
                  <div className="grid grid-cols-8 gap-1">
                    {rowSteps.map((step, stepIndex) => {
                      const globalIndex = startIndex + stepIndex;
                      return (
                        <StepEditor
                          key={`pattern-${editingContext.type}-${activeChordIndex}-${globalIndex}`}
                          stepIndex={globalIndex}
                          stepValue={step}
                          maxNotes={Math.max(4, activeNotes.length)}
                          onStepChange={handleStepChange}
                        />
                      );
                    })}
                    {Array.from({ length: 8 - rowSteps.length }, (_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-8 gap-1 mt-2">
                    {rowSteps.map((_, stepIndex) => {
                      const globalIndex = startIndex + stepIndex;
                      return (
                        <div key={`indicator-${globalIndex}`} className="flex justify-center">
                          <div className={`transition-all duration-300 ${
                            currentStepIndex === globalIndex 
                              ? 'w-full h-1 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50' 
                              : 'w-full h-1 bg-gray-600 rounded-full'
                          }`}></div>
                        </div>
                      );
                    })}
                    {Array.from({ length: 8 - rowSteps.length }, (_, i) => (
                      <div key={`empty-indicator-${i}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Context-Specific Info */}
      {editingContext.type === 'default' && (
        <div className="mb-4 px-4 py-3 bg-blue-900 bg-opacity-20 rounded-lg border border-blue-700">
          <div className="text-xs text-blue-300">
            💡 <strong>Default Pattern:</strong> Used for table chord clicks. When you add chords to the sequence, they capture this pattern as their creation pattern.
          </div>
        </div>
      )}


      {/* Advanced Controls with smooth animation */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showAdvanced ? ' opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-600">
            <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
              Sequencer Settings
            </h3>
          </div>

          <div className="p-6 bg-[#444b59]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
              
              {/* Timing Controls */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Timing</label>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                    BPM<span className="text-xs text-slate-400 ml-2 normal-case">({globalPatternState.bpm})</span>
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={globalPatternState.bpm}
                      onChange={(e) => onPatternChange?.({ bpm: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>60</span>
                    <span>200</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Subdivision</label>
                  <Dropdown
                    value={currentSubdivisionDisplay}
                    onChange={(value) => {
                      const subdivision = SUBDIVISIONS.find(sub => `${sub.symbol} ${sub.name}` === value);
                      if (subdivision) {
                        onPatternChange?.({ subdivision: subdivision.value });
                      }
                    }}
                    options={subdivisionOptions}
                    className="w-full"
                    buttonClassName="w-full p-3 bg-[#3d434f] border border-gray-600 rounded text-slate-200 text-xs focus:border-blue-500 transition-colors hover:bg-[#4a5262]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                    Swing<span className="text-xs text-slate-400 ml-2 normal-case">({globalPatternState.swing}%)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={globalPatternState.swing}
                      onChange={(e) => onPatternChange?.({ swing: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>

              {/* Pattern Presets */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Presets</label>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {PATTERN_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => applyPreset(preset)}
                      className="p-3 rounded text-xs font-medium transition-colors text-left bg-[#3d434f] text-slate-300 hover:bg-[#4a5262] hover:text-slate-200 border border-gray-600 hover:border-gray-500"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium uppercase tracking-wide">{preset.name}</span>
                        <span>{preset.icon}</span>
                      </div>
                      <div className="text-xs opacity-75 font-mono text-slate-400">
                        {preset.pattern.join('-')}
                      </div>
                      <div className="text-xs opacity-60 text-slate-500 mt-1">
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Pattern Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Custom</label>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Pattern (comma-separated)</label>
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
                    className="mt-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors uppercase tracking-wide"
                  >
                    Apply Pattern
                  </button>
                </div>

                <div className="text-xs text-slate-500 space-y-1 p-3 bg-[#3d434f] border border-gray-600 rounded">
                  <div className="font-medium text-slate-400 mb-2 uppercase tracking-wide">Notation:</div>
                  <div><strong>x</strong> = rest (silence)</div>
                  <div><strong>1+</strong> = octave up</div>
                  <div><strong>1-8</strong> = note index</div>
                  <div className="text-slate-600 mt-2">Example: 1,x,3,2+ plays note 1, rest, note 3, note 2 up an octave</div>
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