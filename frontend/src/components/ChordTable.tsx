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
    <div className="mt-4 flex gap-6">
      {/* Left side - Root Note Filter */}
      <div className="flex-shrink-0 w-48">
        <div className="bg-[#3d434f] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-600">
            <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
              Filter by Root
            </h3>
          </div>
          
          <div className="p-3">
            <Dropdown
              value={selectedRootNote}
              onChange={setSelectedRootNote}
              options={dropdownOptions}
              className="w-full mb-3"
              buttonClassName="w-full bg-[#444b59] text-slate-200 border-gray-600"
            />
          </div>

          {/* Root Notes List */}
          <div className="max-h-64 overflow-y-auto">
            <div 
              className={`px-4 py-2 cursor-pointer transition-colors border-l-3 ${
                selectedRootNote === 'All Notes' 
                  ? 'bg-[#4a5262] border-l-blue-500 text-slate-100' 
                  : 'hover:bg-[#444b59] border-l-transparent text-slate-300'
              }`}
              onClick={() => setSelectedRootNote('All Notes')}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">All Notes</span>
                <span className="text-xs text-slate-400">
                  {chords?.length || 0}
                </span>
              </div>
            </div>

            {rootNotes.map(note => (
              <div 
                key={note}
                className={`px-4 py-2 cursor-pointer transition-colors border-l-3 ${
                  selectedRootNote === note 
                    ? 'bg-[#4a5262] border-l-blue-500 text-slate-100' 
                    : 'hover:bg-[#444b59] border-l-transparent text-slate-300'
                }`}
                onClick={() => setSelectedRootNote(note)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{note}</span>
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
      <div className="flex-1 relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#3d434f]">
            <tr>
              <th
                scope="col"
                className="sticky top-0 w-[10em] mr-2 pl-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
              >
                Play/Add
              </th>
              <th
                scope="col"
                className="w-[13em] sticky top-0 pl-0 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
              >
                Name
              </th>
              <th
                scope="col"
                className="sticky top-0 pl-0 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
              >
                Notes
              </th>
              <th
                scope="col"
                className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
              >
              </th>
            </tr>
          </thead>
        </table>
        
        <div className="divide-y divide-gray-200 overflow-auto min-h-[10em] max-h-[10em]">
          {loading ? (
            <div className="">
              <div
                className="mt-[2em] z-100 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              />
            </div>
          ) : (
            <table className="min-h-[10em] min-w-full bg-[#444b59]">
              <tbody className="divide-y divide-gray-200">
                {filteredChords?.length ? (
                  filteredChords.map((chord: ModeScaleChordDto, index: number) => (
                    <tr key={`chord-${index}`} className="hover:bg-[#4a5262] transition-colors">
                      <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-slate-200 text-left">
                        <span>
                          <PlayCircleIcon
                            height={30}
                            className="inline-block ml-2 hover:text-slate-400 active:text-slate-500 cursor-pointer transition-colors"
                            onClick={() => onChordClick(chord.chordNoteNames!)}
                          />
                          <PlusCircleIcon
                            height={30}
                            className="inline-block ml-2 hover:text-slate-400 active:text-slate-500 cursor-pointer transition-colors"
                            onClick={() => addChordClick?.(chord.chordName!, chord.chordNoteNames!)}
                          />
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200 text-left">
                        {chord.chordName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-left">
                        {chord.chordNoteNames}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-400">
                      {selectedRootNote === 'All Notes' ? 'No chords available' : `No chords found for root note "${selectedRootNote}"`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChordTable;