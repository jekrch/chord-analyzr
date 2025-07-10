import React, { useState, useMemo } from 'react';
import { PlayCircleIcon, PlusCircleIcon } from '@heroicons/react/20/solid';
import Dropdown from './Dropdown'; // Adjust import path as needed

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

const ChordTable: React.FC<ChordTableProps> = ({ chords, loading, onChordClick, addChordClick }) => {
  const [selectedRootNote, setSelectedRootNote] = useState<string>('All Notes');

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

  // Filter chords based on selected root note
  const filteredChords = useMemo(() => {
    if (!chords || selectedRootNote === 'All Notes') return chords;
    return chords.filter(chord => extractRootNote(chord.chordName) === selectedRootNote);
  }, [chords, selectedRootNote]);

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

  const dropdownOptions = ['All Notes', ...rootNotes];

  return (
    <div className="mt-4 flex gap-6 w-full max-w-[30em] mx-auto">
      {/* Left side - Root Note Filter */}
      <div className="flex-shrink-0 w-32">
        <div className="bg-[#3d434f] rounded-lg overflow-hidden h-80">
          <div className="px-3 py-3 border-b border-gray-600">
            <h3 className="text-xs font-medium text-slate-200 uppercase tracking-wider">
              Filter by Root
            </h3>
          </div>
          
          <div className="p-2">
            <Dropdown
              value={selectedRootNote}
              onChange={setSelectedRootNote}
              options={dropdownOptions}
              className="w-full mb-2"
              buttonClassName="w-full bg-[#444b59] text-slate-200 border-gray-600"
            />
          </div>

          {/* Root Notes List */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 100px)' }}>
            <div 
              className={`px-3 py-2 cursor-pointer transition-colors border-l-3 ${
                selectedRootNote === 'All Notes' 
                  ? 'bg-[#4a5262] border-l-blue-500 text-slate-100' 
                  : 'hover:bg-[#444b59] border-l-transparent text-slate-300'
              }`}
              onClick={() => setSelectedRootNote('All Notes')}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">All Notes</span>
                <span className="text-xs text-slate-400">
                  {chords?.length || 0}
                </span>
              </div>
            </div>

            {rootNotes.map(note => (
              <div 
                key={note}
                className={`px-3 py-2 cursor-pointer transition-colors border-l-3 ${
                  selectedRootNote === note 
                    ? 'bg-[#4a5262] border-l-blue-500 text-slate-100' 
                    : 'hover:bg-[#444b59] border-l-transparent text-slate-300'
                }`}
                onClick={() => setSelectedRootNote(note)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">{note}</span>
                  <span className="text-xs text-slate-400">
                    {chordCounts[note] || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Chords Table */}
      <div className="flex-1" style={{ minWidth: '328px', width: '100%' }}>
        <div className="bg-[#3d434f] rounded-lg overflow-hidden h-80" style={{ width: '100%' }}>
          {/* Table Header */}
          <div className="bg-[#3d434f] border-b border-gray-600">
            <div className="flex w-full" style={{ minWidth: '328px' }}>
              <div className="w-24 flex-shrink-0 px-4 py-3">
                <span className="text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Play/Add
                </span>
              </div>
              <div className="w-16 flex-shrink-0 px-4 py-3">
                <span className="text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Name
                </span>
              </div>
              <div className="flex-1 px-4 py-3" style={{ width: '168px' }}>
                <span className="text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Notes
                </span>
              </div>
            </div>
          </div>
          
          {/* Table Content */}
          <div className="bg-[#444b59] overflow-y-auto w-full" style={{ height: 'calc(100% - 57px)', minWidth: '328px' }}>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                />
              </div>
            ) : (
              <>
                {filteredChords?.length ? (
                  filteredChords.map((chord: ModeScaleChordDto, index: number) => (
                    <div key={`chord-${index}`} className="flex border-b border-gray-200 hover:bg-[#4a5262] transition-colors" style={{ minWidth: '328px' }}>
                      <div className="w-24 flex-shrink-0 px-4 py-4 flex items-center">
                        <PlayCircleIcon
                          height={24}
                          className="hover:text-slate-400 active:text-slate-500 cursor-pointer transition-colors text-slate-200"
                          onClick={() => onChordClick(chord.chordNoteNames!)}
                        />
                        <PlusCircleIcon
                          height={24}
                          className="ml-1 hover:text-slate-400 active:text-slate-500 cursor-pointer transition-colors text-slate-200"
                          onClick={() => addChordClick?.(chord.chordName!, chord.chordNoteNames!)}
                        />
                      </div>
                      <div className="w-40 flex-shrink-0 px-4 py-4 flex items-center">
                        <span className="text-sm font-medium text-slate-200 truncate">
                          {chord.chordName}
                        </span>
                      </div>
                      <div className="px-4 py-4 flex items-center overflow-hidden" style={{ width: '168px' }}>
                        <span className="text-sm text-slate-400 truncate w-full">
                          {chord.chordNoteNames}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-center items-center h-32" style={{ minWidth: '328px' }}>
                    <span className="text-sm text-slate-400">
                      {selectedRootNote === 'All Notes' ? 'No chords available' : `No chords found for root note "${selectedRootNote}"`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordTable;