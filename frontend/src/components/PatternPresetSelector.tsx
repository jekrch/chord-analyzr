import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PATTERN_PRESETS, PATTERN_CATEGORIES } from '../util/Pattern';
import Dropdown from './Dropdown';
import { AddedChord } from '../stores/types';
import { usePlaybackStore } from '../stores/playbackStore';

export type PatternPreset =  {
    name: string;
    pattern: string[];
    desc: string;
    icon: string;
    category: "basic" | "custom" | "genre" | "advanced" | "rhythmic";
};

interface PatternPresetSelectorProps {
  chordNoteCount: number;
  maxAvailableNotes: number;
  hideFewerNotePatterns: boolean;
  currentPattern?: string[]; 
  onHideFewerNotePatternsChange: (value: boolean) => void;
  onApplyPreset: (preset: PatternPreset) => void;
  className?: string;
}

// Helper function to count distinct notes in a pattern
const countDistinctNotesInPattern = (pattern: string[]): number => {
  const distinctNotes = new Set(
    pattern
      .filter(step => step !== 'x') // Exclude rest steps
      .map(step => {
        const noteNum = parseInt(step.replace('+', ''));
        return isNaN(noteNum) ? null : noteNum;
      })
      .filter(noteNum => noteNum !== null)
  );
  return distinctNotes.size;
};

// Helper function to compare two patterns
const patternsMatch = (pattern1: string[], pattern2: string[]): boolean => {
  if (pattern1.length !== pattern2.length) return false;
  return pattern1.every((step, index) => step === pattern2[index]);
};

const PatternPresetSelector: React.FC<PatternPresetSelectorProps> = ({
  chordNoteCount,
  maxAvailableNotes,
  hideFewerNotePatterns,
  currentPattern,
  onHideFewerNotePatternsChange,
  onApplyPreset,
  className = ''
}) => {
  // Get added chords from the store to extract custom patterns
  const addedChords = usePlaybackStore((state: any) => state.addedChords);

  // Local filter states
  const [selectedStepCount, setSelectedStepCount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Refs for scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const presetRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

  // Extract custom patterns from added chords
  const customPatterns = useMemo(() => {
    const patterns: PatternPreset[] = [];
    const seenPatternStrings = new Set<string>();

    // Add all preset patterns to the seen set
    PATTERN_PRESETS.forEach(preset => {
      seenPatternStrings.add(preset.pattern.join('|'));
    });

    // Extract unique custom patterns from added chords
    addedChords.forEach((chord: AddedChord, chordIndex: number) => {
      const patternString = chord.pattern.join('|');
      
      if (!seenPatternStrings.has(patternString) && patternString.trim() !== '') {
        seenPatternStrings.add(patternString);
        
        const distinctNotes = countDistinctNotesInPattern(chord.pattern);
        patterns.push({
          name: `Custom ${patterns.length + 1}`,
          pattern: [...chord.pattern],
          desc: `Custom pattern from "${chord.name}"`,
          icon: '🎨',
          category: PATTERN_CATEGORIES.CUSTOM
        });
      }
    });

    return patterns;
  }, [addedChords]);

  // Combine preset patterns with custom patterns
  const allPatterns = useMemo(() => {
    return [...PATTERN_PRESETS, ...customPatterns];
  }, [customPatterns]);

  // Get unique step counts for filter options (including custom patterns)
  const availableStepCounts = useMemo(() => {
    const stepCounts = new Set(allPatterns.map(preset => preset.pattern.length));
    return Array.from(stepCounts).sort((a, b) => a - b);
  }, [allPatterns]);

  // Filter pattern presets based on all constraints
  const filteredPresets = useMemo(() => {
    return allPatterns.filter(preset => {
      const distinctNotesInPattern = countDistinctNotesInPattern(preset.pattern);

      // Always exclude patterns that use more distinct notes than the chord has
      if (distinctNotesInPattern > chordNoteCount) {
        return false;
      }

      // If checkbox is checked, also exclude patterns with fewer distinct notes
      if (hideFewerNotePatterns && distinctNotesInPattern < chordNoteCount) {
        return false;
      }

      // Also check that the maximum note number doesn't exceed available notes
      const maxNoteInPattern = Math.max(
        ...preset.pattern
          .filter(step => step !== 'x') // Exclude rest steps
          .map(step => {
            const noteNum = parseInt(step.replace('+', ''));
            return isNaN(noteNum) ? 0 : noteNum;
          })
      );

      if (maxNoteInPattern > maxAvailableNotes) {
        return false;
      }

      // Filter by step count
      if (selectedStepCount !== 'all' && preset.pattern.length !== parseInt(selectedStepCount)) {
        return false;
      }

      // Filter by category
      if (selectedCategory !== 'all' && preset.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [allPatterns, chordNoteCount, hideFewerNotePatterns, maxAvailableNotes, selectedStepCount, selectedCategory]);

  // Find the index of the currently selected pattern in filtered presets
  const selectedPatternIndex = useMemo(() => {
    if (!currentPattern) return -1;
    return filteredPresets.findIndex(preset => 
      patternsMatch(preset.pattern, currentPattern)
    );
  }, [currentPattern, filteredPresets]);

  // Scroll to the selected pattern on first load
useEffect(() => {
    if (selectedPatternIndex >= 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const selectedElement = presetRefs.current[selectedPatternIndex];
      
      if (selectedElement) {
        // Calculate positions relative to the container
        const containerRect = container.getBoundingClientRect();
        const elementRect = selectedElement.getBoundingClientRect();
        
        // Calculate the element's position within the container
        const elementTop = elementRect.top - containerRect.top + container.scrollTop;
        const elementBottom = elementTop + elementRect.height;
        
        // Get container dimensions
        const containerHeight = container.clientHeight;
        const containerScrollTop = container.scrollTop;
        const containerScrollBottom = containerScrollTop + containerHeight;
        
        // Check if element is outside the visible area
        if (elementTop < containerScrollTop || elementBottom > containerScrollBottom) {
          // Center the element in the container
          const targetScrollTop = elementTop - (containerHeight / 2) + (elementRect.height / 2);
          
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'instant'
          });
        }
      }
    }
  }, [selectedPatternIndex, filteredPresets]);

  // Filter options
  const stepCountOptions = ['All Steps', ...availableStepCounts.map(count => `${count} Steps`)];
  const categoryOptions = ['All Categories', 'Basic', 'Rhythmic', 'Advanced', 'Genre', 'Custom'];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pattern Constraints Checkbox */}
      <div>
        <label className="block text-xs font-medium text-mcb-primary mb-2 uppercase tracking-wide">Pattern Presets</label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hideFewerNotePatterns}
            onChange={(e) => onHideFewerNotePatternsChange(e.target.checked)}
            className="w-3 h-3 rounded border-mcb-primary bg-mcb-secondary text-blue-600 focus:ring-[var(--mcb-accent-primary)] focus:ring-1"
          />
          <span className="text-xs text-mcb-primary">Hide patterns with fewer notes</span>
        </label>
      </div>

      {/* Compact Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Dropdown
          value={stepCountOptions[selectedStepCount === 'all' ? 0 : stepCountOptions.findIndex(opt => opt === `${selectedStepCount} Steps`)]}
          onChange={(value) => {
            if (value === 'All Steps') {
              setSelectedStepCount('all');
            } else {
              const stepCount = value.replace(' Steps', '');
              setSelectedStepCount(stepCount);
            }
          }}
          options={stepCountOptions}
          className="flex-1"
          buttonClassName="w-full p-2 bg-mcb-secondary border border-mcb-primary rounded text-mcb-primary text-xs transition-colors hover:bg-mcb-hover"
        />
        <Dropdown
          value={categoryOptions[selectedCategory === 'all' ? 0 : categoryOptions.findIndex(opt => opt.toLowerCase() === selectedCategory)]}
          onChange={(value) => {
            if (value === 'All Categories') {
              setSelectedCategory('all');
            } else {
              setSelectedCategory(value.toLowerCase());
            }
          }}
          options={categoryOptions}
          className="flex-1"
          buttonClassName="w-full p-2 bg-mcb-secondary border border-mcb-primary rounded text-mcb-primary text-xs transition-colors hover:bg-mcb-hover"
        />
      </div>

      {/* Preset List */}
      <div 
        ref={scrollContainerRef}
        className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar"
      >
        {filteredPresets.length > 0 ? (
          filteredPresets.map((preset, index) => {
            const distinctNotes = countDistinctNotesInPattern(preset.pattern);
            const isSelected = index === selectedPatternIndex;
            
            return (
              <button
                key={index}
                ref={(el) => {
                  presetRefs.current[index] = el;
                }}
                onClick={() => onApplyPreset(preset)}
                className={`p-2 rounded text-xs transition-colors text-left border ${
                  isSelected 
                    ? 'bg-[var(--mcb-accent-secondary)]/20 text-[var(--mcb-text-primary)] border-[var(--mcb-accent-primary)] ring-1 ring-[var(--mcb-accent-primary)]/50' 
                    : 'bg-mcb-secondary text-mcb-secondary hover:bg-mcb-hover hover:text-mcb-primary border-mcb-primary hover:border-mcb-secondary'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium uppercase tracking-wide">{preset.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${isSelected ? 'text-mcb-secondary' : 'text-mcb-disabled'}`}>
                      {distinctNotes}n • {preset.pattern.length}s
                    </span>
                    <span>{preset.icon}</span>
                  </div>
                </div>
                <div className={`text-xs opacity-60 ${isSelected ? 'text-mcb-tertiary' : 'text-mcb-disabled'}`}>
                  {preset.pattern.join('-')}
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-3 text-xs text-mcb-tertiary text-center">
            No patterns found matching current filters
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternPresetSelector;