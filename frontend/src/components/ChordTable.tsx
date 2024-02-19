import React from 'react';
import { ModeScaleChordDto } from '../api';
import { PlayCircleIcon } from '@heroicons/react/20/solid';

interface ChordTableProps {
  chords: ModeScaleChordDto[] | undefined;
  onChordClick: (chordNoteNames: string) => void;
}

const ChordTable: React.FC<ChordTableProps> = ({ chords, onChordClick }) => {
  return (
    <div className="mt-4 relative">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#3d434f]">
          <tr>
            <th
              scope="col"
              className="sticky top-0 px-2 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
            >
            </th>
            <th
              scope="col"
              className="sticky top-0 pl-0 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
            >
              Name
            </th>
            <th
              scope="col"
              className="sticky top-0 pl-0 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
            >
              Notes
            </th>
          </tr>
        </thead>
      </table>
      <div className="divide-y divide-gray-200 overflow-auto" style={{ maxHeight: '10em' }}>
        <table className="min-w-full bg-[#444b59]">
          <tbody className="divide-y divide-gray-200">
            {chords?.map((chord: ModeScaleChordDto, index: number) => (
              <tr key={`chord-${index}`}>
                <td                      
                  className="px-2 py-4 whitespace-nowrap text-sm font-medium text-slate-200 text-left">
                  <span>
                    <PlayCircleIcon 
                      height={30} 
                      className="inline-block ml-2 hover:text-slate-400 active:text-slate-500 cursor-pointer" 
                      onClick={() => onChordClick(chord.chordNoteNames!)}
                    />
                  </span>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200 text-left">
                  {chord.chordName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-left">{chord.chordNoteNames}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChordTable;
