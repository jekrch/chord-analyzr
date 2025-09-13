import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { PlayCircleIcon, PlusCircleIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import { ModeScaleChordDto } from '../api';
import { useMusicStore } from '../stores/musicStore';

interface ChordTableProps {
  onChordClick: (chordNoteNames: string, index?: number, chordName?: string) => void;
  addChordClick?: (chordName: string, chordNotes: string, key: string, mode: string) => void;
}

// Memoized chord card component to prevent unnecessary re-renders
const ChordCard = memo<{
  chord: ModeScaleChordDto;
  index: number;
  isExpanded: boolean;
  isPlaying: boolean;
  isAdding: boolean;
  onChordPlay: (chordNoteNames: string, index: number, chordName: string) => void;
  onChordAdd: (index: number, chordName: string, chordNotes: string, key: string, modeId: number) => void;
  onToggleExpansion: (index: number) => void;
}>(({ 
  chord, 
  index, 
  isExpanded, 
  isPlaying, 
  isAdding, 
  onChordPlay, 
  onChordAdd, 
  onToggleExpansion 
}) => {
  const handleCardClick = useCallback(() => {
    onChordPlay(chord.chordNoteNames!, index, chord.chordName!);
  }, [onChordPlay, chord.chordNoteNames, chord.chordName, index]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChordAdd(index, chord.chordName!, chord.chordNoteNames!, chord.keyName!, chord.modeId!);
  }, [onChordAdd, index, chord.chordName, chord.chordNoteNames, chord.keyName, chord.modeId]);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpansion(index);
  }, [onToggleExpansion, index]);

  return (
    <div
      className={`bg-[#3d434f] rounded-lg border border-gray-600 hover:border-blue-500 hover:bg-[#444b59] transition-all duration-200 overflow-hidden cursor-pointer group relative ${
        isPlaying ? 'chord-playing z-50' : ''
      } ${isAdding ? 'chord-adding z-40' : ''}`}
      onClick={handleCardClick}
    >
      {/* Main content */}
      <div className="p-3 sm:p-4">
        {/* Chord name and buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <PlayCircleIcon className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors flex-shrink-0 ${
              isPlaying ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-300'
            }`} />
            <h3 className={`text-base sm:text-lg font-bold transition-colors truncate ${
              isPlaying ? 'text-blue-200' : 'text-white group-hover:text-blue-200'
            }`}>
              {chord.chordName}
            </h3>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
            <button
              onClick={handleAddClick}
              className={`p-1 sm:p-2 rounded-md transition-colors ${
                isAdding 
                  ? 'bg-green-600 text-white' 
                  : 'hover:bg-green-600 text-gray-400 hover:text-white'
              }`}
              title="Add to sequence"
            >
              <PlusCircleIcon className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={handleToggleClick}
              className="p-1.5 sm:p-2 rounded-md hover:bg-[#555] text-gray-400 hover:text-white transition-colors"
              title={isExpanded ? "Hide notes" : "Show notes"}
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable notes section */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
          <div className="bg-[#2d3142] rounded-md p-2 sm:p-3 border-t border-gray-600">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              Notes
            </div>
            <div className="text-sm text-gray-200 font-mono">
              {chord.chordNoteNames}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ChordCard.displayName = 'ChordCard';

const ChordTable: React.FC<ChordTableProps> = ({  
  onChordClick, 
  addChordClick 
}) => {
  const [selectedRootNote, setSelectedRootNote] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedChords, setExpandedChords] = useState<Set<number>>(new Set());
  const [playingChords, setPlayingChords] = useState<Set<number>>(new Set());
  const [addingChords, setAddingChords] = useState<Set<number>>(new Set());
  const [currentColumns, setCurrentColumns] = useState<number>(1);

  const musicStore = useMusicStore();

  const {
    chords,
    loadingChords,
    allDistinctChords,
    loadingAllChords,
    showAllChords,
    toggleShowAllChords,
    key,
    mode
  } = musicStore;

  // Determine which chord set to use
  const currentChords = showAllChords ? allDistinctChords : chords;
  const currentLoading = showAllChords ? loadingAllChords : loadingChords;
  
  // Track screen size to determine number of columns - memoized
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1280) { // xl breakpoint
        setCurrentColumns(3);
      } else if (width >= 640) { // sm breakpoint
        setCurrentColumns(2);
      } else {
        setCurrentColumns(1);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Extract root note from chord name - memoized function
  const extractRootNote = useCallback((chordName: string | undefined): string => {
    if (!chordName) return '';
    if (chordName.length >= 2 && (chordName[1] === 'b' || chordName[1] === '#')) {
      return chordName.substring(0, 2);
    }
    return chordName[0] || '';
  }, []);

  // Pre-filter valid chords once to avoid repeated filtering
  const validChords = useMemo(() => {
    if (!currentChords) return [];
    return currentChords.filter(chord => 
      chord.chordName && 
      chord.chordNoteNames &&
      chord.chordName.trim() !== '' &&
      chord.chordNoteNames.trim() !== ''
    );
  }, [currentChords]);

  // Get unique root notes from chords - optimized
  const rootNotes = useMemo(() => {
    const noteSet = new Set<string>();
    validChords.forEach(chord => {
      const root = extractRootNote(chord.chordName);
      if (root) noteSet.add(root);
    });
    return Array.from(noteSet).sort();
  }, [validChords, extractRootNote]);

  // Count chords per root note - optimized
  const chordCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    validChords.forEach(chord => {
      const root = extractRootNote(chord.chordName!);
      if (root) {
        counts[root] = (counts[root] || 0) + 1;
      }
    });
    return counts;
  }, [validChords, extractRootNote]);

  // Filter and sort chords - with alphabetical ordering
  const filteredChords = useMemo(() => {
    let filtered = validChords;
    
    // Filter by root note
    if (selectedRootNote !== 'All') {
      filtered = filtered.filter(chord => 
        extractRootNote(chord.chordName) === selectedRootNote
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(chord => 
        chord.chordName?.toLowerCase().includes(query) ||
        chord.chordNoteNames?.toLowerCase().includes(query)
      );
    }
    
    // Sort alphabetically by chord name
    return filtered.sort((a, b) => {
      const nameA = a.chordName?.toLowerCase() || '';
      const nameB = b.chordName?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [validChords, selectedRootNote, searchQuery, extractRootNote]);

  // Optimized event handlers with useCallback
  const handleChordPlay = useCallback((chordNoteNames: string, index: number, chordName: string) => {
    // Trigger play animation
    setPlayingChords(prev => new Set(prev).add(index));
    
    // Call the original function
    onChordClick(chordNoteNames, undefined, chordName);
    
    // Remove animation after duration
    const timeoutId = setTimeout(() => {
      setPlayingChords(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [onChordClick]);

  const handleChordAdd = useCallback((index: number, chordName: string, chordNotes: string, key: string, modeId: number) => {
    // Trigger add animation
    setAddingChords(prev => new Set(prev).add(index));
    
    const mode = musicStore.modes[modeId - 1];

    // Call the original function
    addChordClick?.(chordName, chordNotes, key, mode);
    
    // Remove animation after duration
    const timeoutId = setTimeout(() => {
      setAddingChords(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [addChordClick, musicStore.modes]);

  // Simplified expansion toggle
  const handleToggleExpansion = useCallback((index: number) => {
    setExpandedChords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleToggleAllChords = useCallback(() => {
    toggleShowAllChords();
    // Reset filters when switching modes
    setSelectedRootNote('All');
    setSearchQuery('');
    setExpandedChords(new Set());
  }, [toggleShowAllChords]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedRootNote('All');
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoized filter buttons
  const mobileFilterButtons = useMemo(() => (
    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent px-1">
      <button
        onClick={() => setSelectedRootNote('All')}
        className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
          selectedRootNote === 'All' 
            ? 'bg-blue-600 text-white' 
            : 'bg-[#444b59] text-gray-300 hover:bg-[#525a6b] hover:text-white'
        }`}
      >
        All ({validChords.length})
      </button>
      {rootNotes.map(note => (
        <button
          key={note}
          onClick={() => setSelectedRootNote(note)}
          className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedRootNote === note 
              ? 'bg-blue-600 text-white' 
              : 'bg-[#444b59] text-gray-300 hover:bg-[#525a6b] hover:text-white'
          }`}
        >
          {note} ({chordCounts[note] || 0})
        </button>
      ))}
    </div>
  ), [selectedRootNote, validChords.length, rootNotes, chordCounts]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2">
      {/* Header Section */}
      <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden mb-4">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Chord Explorer</h2>
            <div className="text-sm text-gray-400">
              {filteredChords.length} of {validChords.length} chords
            </div>
          </div>

          {/* Toggle and Search Section */}
          <div className="space-y-4">
            {/* Show All Chords Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#444b59] rounded-lg border border-gray-600">
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium text-gray-300 text-left">
                  Show All Chords
                </span>
                <span className="text-xs text-gray-400">
                  {showAllChords 
                    ? (allDistinctChords ? `${allDistinctChords?.length} chords` : 'Loading...')
                    : `Showing chords in ${key} ${mode}`
                  }
                </span>
              </div>
              <button
                onClick={handleToggleAllChords}
                disabled={currentLoading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  showAllChords ? 'bg-blue-600' : 'bg-gray-600'
                } ${currentLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={showAllChords}
                aria-label="Toggle between current mode chords and all distinct chords"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showAllChords ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chords or notes..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 bg-[#444b59] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors !text-sm"
              />
            </div>
          </div>

          {/* Mobile Root Note Filter */}
          <div className="lg:hidden mt-4">
            {mobileFilterButtons}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
        {/* Desktop Sidebar Filter */}
        <div className="hidden lg:block lg:w-48 flex-shrink-0">
          <div className="bg-[#3d434f] rounded-lg h-fit">
            <div className="px-4 py-3 border-b border-gray-600">
              <h3 className="text-sm font-medium text-gray-200 uppercase tracking-wide">
                Filter by Root
              </h3>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => setSelectedRootNote('All')}
                className={`w-full px-3 py-2 text-left transition-colors rounded-md border-l-4 ${
                  selectedRootNote === 'All' 
                    ? 'bg-[#4a5262] border-l-blue-500 text-white' 
                    : 'hover:bg-[#444b59] border-l-transparent text-gray-300 hover:text-white'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">All Notes</span>
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {validChords.length}
                  </span>
                </div>
              </button>

              {rootNotes.map(note => (
                <button
                  key={note}
                  onClick={() => setSelectedRootNote(note)}
                  className={`w-full px-3 py-2 text-left transition-colors rounded-md border-l-4 mt-1 ${
                    selectedRootNote === note 
                      ? 'bg-[#4a5262] border-l-blue-500 text-white' 
                      : 'hover:bg-[#444b59] border-l-transparent text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{note}</span>
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                      {chordCounts[note] || 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chord Cards */}
        <div className="flex-1">
          {currentLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center space-y-3">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-blue-500" />
                <span className="text-sm text-gray-400">
                  {showAllChords ? 'Loading all distinct chords...' : 'Loading chords...'}
                </span>
              </div>
            </div>
          ) : filteredChords.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
              {filteredChords.map((chord: ModeScaleChordDto, index: number) => (
                <ChordCard
                  key={`chord-${chord.chordName}-${index}`}
                  chord={chord}
                  index={index}
                  isExpanded={expandedChords.has(index)}
                  isPlaying={playingChords.has(index)}
                  isAdding={addingChords.has(index)}
                  onChordPlay={handleChordPlay}
                  onChordAdd={handleChordAdd}
                  onToggleExpansion={handleToggleExpansion}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-64 bg-[#3d434f] rounded-lg">
              <div className="text-center space-y-3">
                <div className="text-gray-500 text-4xl">🎵</div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    {searchQuery.trim() 
                      ? `No chords found matching "${searchQuery}"` 
                      : selectedRootNote === 'All' 
                        ? showAllChords 
                          ? 'No distinct chords available'
                          : 'No chords available' 
                        : `No chords found for root note "${selectedRootNote}"`
                    }
                  </div>
                  {(searchQuery.trim() || selectedRootNote !== 'All') && (
                    <button
                      onClick={handleClearFilters}
                      className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer info */}
          {filteredChords.length > 0 && (
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-400">
                Tap any chord to play • 
                <span className="text-gray-300 mx-1">+</span> to add to sequence • 
                <ChevronDownIcon className="inline h-3 w-3 mx-1" /> to show notes
                {showAllChords && (
                  <span className="block mt-1 text-blue-400">
                    Currently showing all distinct chords across all modes and keys (sorted alphabetically)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChordTable;