import React, { useState, useMemo } from 'react';
import { PlayCircleIcon, PlusCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';

interface ModeScaleChordDto {
  chordName: string;
  chordNoteNames: string;
}

interface ChordTableProps {
  chords: ModeScaleChordDto[] | undefined;
  loading: boolean;
  onChordClick: (chordNoteNames: string) => void;
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

  // Extract root note from chord name
  const extractRootNote = (chordName: string): string => {
    // Handle flat and sharp notes first
    if (chordName.length >= 2 && (chordName[1] === 'b' || chordName[1] === '#')) {
      return chordName.substring(0, 2);
    }
    // Otherwise, just take the first character
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
    
    // Filter by root note
    if (selectedRootNote !== 'All') {
      filtered = filtered.filter(chord => extractRootNote(chord.chordName) === selectedRootNote);
    }
    
    // Filter by search query
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

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Available Chords</h2>
        <div className="text-sm text-gray-400">
          {filteredChords?.length || 0} of {chords?.length || 0} chords
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chords or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#3d434f] border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-4 h-96">
        {/* Left Sidebar - Root Note Filter */}
        <div className="flex-shrink-0 w-40">
          <div className="bg-[#3d434f] rounded-lg h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-600">
              <h3 className="text-sm font-medium text-gray-200 uppercase tracking-wide">
                Filter by Root
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* All option */}
              <button
                onClick={() => setSelectedRootNote('All')}
                className={`w-full px-4 py-3 text-left transition-colors border-l-4 ${
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

              {/* Individual root notes */}
              {rootNotes.map(note => (
                <button
                  key={note}
                  onClick={() => setSelectedRootNote(note)}
                  className={`w-full px-4 py-3 text-left transition-colors border-l-4 ${
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

        {/* Right Side - Chord Table */}
        <div className="flex-1">
          <div className="bg-[#3d434f] rounded-lg h-full flex flex-col">
            {/* Table Header */}
            <div className="px-4 py-3 border-b border-gray-600">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-200 uppercase tracking-wide">
                <div className="col-span-3">Actions</div>
                <div className="col-span-3">Chord</div>
                <div className="col-span-6">Notes</div>
              </div>
            </div>
            
            {/* Table Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-blue-500" />
                    <span className="text-sm text-gray-400">Loading chords...</span>
                  </div>
                </div>
              ) : filteredChords?.length ? (
                <div className="divide-y divide-gray-600">
                  {filteredChords.map((chord: ModeScaleChordDto, index: number) => (
                    <div
                      key={`chord-${index}`}
                      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-[#444b59] transition-colors group"
                    >
                      {/* Actions */}
                      <div className="col-span-3 flex items-center space-x-2">
                        <button
                          onClick={() => onChordClick(chord.chordNoteNames!)}
                          className="p-1.5 rounded-md hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                          title="Play chord"
                        >
                          <PlayCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => addChordClick?.(chord.chordName!, chord.chordNoteNames!)}
                          className="p-1.5 rounded-md hover:bg-green-600 text-gray-400 hover:text-white transition-colors"
                          title="Add to sequence"
                        >
                          <PlusCircleIcon className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Chord Name */}
                      <div className="col-span-3 flex items-center">
                        <span className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors truncate">
                          {chord.chordName}
                        </span>
                      </div>

                      {/* Notes */}
                      <div className="col-span-6 flex items-center">
                        <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors truncate">
                          {chord.chordNoteNames}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center space-y-2">
                    <div className="text-gray-500 text-4xl">🎵</div>
                    <span className="text-sm text-gray-400">
                      {searchQuery.trim() 
                        ? `No chords found matching "${searchQuery}"` 
                        : selectedRootNote === 'All' 
                          ? 'No chords available' 
                          : `No chords found for root note "${selectedRootNote}"`
                      }
                    </span>
                    {(searchQuery.trim() || selectedRootNote !== 'All') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedRootNote('All');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Table Footer */}
            {filteredChords?.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-600 bg-[#353944]">
                <div className="text-xs text-gray-400 flex justify-between items-center">
                  <span>
                    {filteredChords.length} chord{filteredChords.length !== 1 ? 's' : ''} displayed
                  </span>
                  <span className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <PlayCircleIcon className="h-3 w-3" />
                      <span>Play</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <PlusCircleIcon className="h-3 w-3" />
                      <span>Add</span>
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordTable;