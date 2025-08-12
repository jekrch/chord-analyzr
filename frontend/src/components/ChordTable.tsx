import React, { useState, useMemo } from 'react';
import { PlayCircleIcon, PlusCircleIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';

interface ModeScaleChordDto {
  chordName: string;
  chordNoteNames: string;
}

interface ChordTableProps {
  chords: ModeScaleChordDto[] | undefined;
  loading: boolean;
  onChordClick: (chordNoteNames: string, index?: number, chordName?: string) => void; // Updated to include chordName
  addChordClick?: (chordName: string, chordNotes: string) => void;
}

const ChordTable: React.FC<ChordTableProps> = ({ 
  chords, 
  loading, 
  onChordClick, 
  addChordClick 
}) => {
  const [selectedRootNote, setSelectedRootNote] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedChords, setExpandedChords] = useState<Set<number>>(new Set());

  // Extract root note from chord name
  const extractRootNote = (chordName: string): string => {
    if (chordName.length >= 2 && (chordName[1] === 'b' || chordName[1] === '#')) {
      return chordName.substring(0, 2);
    }
    return chordName[0];
  };

  // Get unique root notes from chords
  const rootNotes = useMemo(() => {
    if (!chords) return [];
    const notes = chords.map(chord => extractRootNote(chord.chordName));
    return [...new Set(notes)].sort();
  }, [chords]);

  // Filter chords based on selected root note and search query
  const filteredChords = useMemo(() => {
    if (!chords) return [];
    
    let filtered = chords;
    
    if (selectedRootNote !== 'All') {
      filtered = filtered.filter(chord => extractRootNote(chord.chordName) === selectedRootNote);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(chord => 
        chord.chordName.toLowerCase().includes(query) ||
        chord.chordNoteNames.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [chords, selectedRootNote, searchQuery]);

  // Count chords per root note
  const chordCounts = useMemo(() => {
    if (!chords) return {};
    const counts: { [key: string]: number } = {};
    chords.forEach(chord => {
      const root = extractRootNote(chord.chordName);
      counts[root] = (counts[root] || 0) + 1;
    });
    return counts;
  }, [chords]);

  const toggleChordExpansion = (index: number) => {
    const newExpanded = new Set(expandedChords);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChords(newExpanded);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
        <h2 className="text-lg font-bold text-white">Chord Explorer</h2>
        <div className="text-sm text-gray-400">
          {filteredChords?.length || 0} of {chords?.length || 0} chords
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chords or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-lg w-full pl-10 pr-4 py-3 bg-[#3d434f] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
        {/* Root Note Filter - Horizontal scroll on mobile, sidebar on desktop */}
        <div className="lg:w-48 flex-shrink-0">
          {/* Mobile: Horizontal scrollable */}
          <div className="lg:hidden mb-3">
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent px-1">
              <button
                onClick={() => setSelectedRootNote('All')}
                className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedRootNote === 'All' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-[#3d434f] text-gray-300 hover:bg-[#444b59] hover:text-white'
                }`}
              >
                All ({chords?.length || 0})
              </button>
              {rootNotes.map(note => (
                <button
                  key={note}
                  onClick={() => setSelectedRootNote(note)}
                  className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedRootNote === note 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-[#3d434f] text-gray-300 hover:bg-[#444b59] hover:text-white'
                  }`}
                >
                  {note} ({chordCounts[note] || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Desktop: Sidebar */}
          <div className="hidden lg:block">
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
                      {chords?.length || 0}
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
        </div>

        {/* Chord Cards */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center space-y-3">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-blue-500" />
                <span className="text-sm text-gray-400">Loading chords...</span>
              </div>
            </div>
          ) : filteredChords?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
              {filteredChords.map((chord: ModeScaleChordDto, index: number) => {
                const isExpanded = expandedChords.has(index);
                return (
                  <div
                    key={`chord-${index}`}
                    className="bg-[#3d434f] rounded-lg border border-gray-600 hover:border-blue-500 hover:bg-[#444b59] transition-all duration-200 overflow-hidden cursor-pointer group"
                    onClick={() => onChordClick(chord.chordNoteNames!, undefined, chord.chordName!)}
                  >
                    {/* Main content */}
                    <div className="p-3 sm:p-4">
                      {/* Chord name and buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <PlayCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-200 transition-colors truncate">
                            {chord.chordName}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addChordClick?.(chord.chordName!, chord.chordNoteNames!);
                            }}
                            className="p-1.5 sm:p-2 rounded-md hover:bg-green-600 text-gray-400 hover:text-white transition-colors"
                            title="Add to sequence"
                          >
                            <PlusCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleChordExpansion(index);
                            }}
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
              })}
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
                        ? 'No chords available' 
                        : `No chords found for root note "${selectedRootNote}"`
                    }
                  </div>
                  {(searchQuery.trim() || selectedRootNote !== 'All') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRootNote('All');
                      }}
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
          {filteredChords?.length > 0 && (
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-400">
                Tap any chord to play • 
                <span className="text-gray-300 mx-1">+</span> to add to sequence • 
                <ChevronDownIcon className="inline h-3 w-3 mx-1" /> to show notes
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChordTable;