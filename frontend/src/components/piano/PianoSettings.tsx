import React from 'react';

interface EqSettings {
  bass: number;
  mid: number;
  treble: number;
}

interface PianoSettingsProps {
  isOpen: boolean;
  cutOffPreviousNotes: boolean;
  setCutOffPreviousNotes: (value: boolean) => void;
  eq: EqSettings;
  setEq: (eq: EqSettings) => void;
  octaveOffset: number;
  setOctaveOffset: (offset: number) => void;
  reverbLevel: number;
  setReverbLevel: (level: number) => void;
  noteDuration: number;
  setNoteDuration: (duration: number) => void;
}

const PianoSettings: React.FC<PianoSettingsProps> = ({
  isOpen,
  cutOffPreviousNotes,
  setCutOffPreviousNotes,
  eq,
  setEq,
  octaveOffset,
  setOctaveOffset,
  reverbLevel,
  setReverbLevel,
  noteDuration,
  setNoteDuration,
}) => {
  const handleEqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEq({ ...eq, [name]: parseFloat(value) });
  };

  return (
    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
      isOpen ? 'max-h-[600px] opacity-100 mt-6' : 'max-h-0 opacity-0'
    }`}>
      <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden w-full max-w-6xl mx-auto">
        <div className="px-4 py-3 border-b border-gray-600">
          <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
            Piano Settings
          </h3>
        </div>

        <div className="p-6 bg-[#444b59]">
          <div className="grid grid-cols-2 gap-x-8">

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Octave Shift</label>
                <div className="flex items-center justify-between bg-[#3d434f] border border-gray-600 rounded-md p-1.5">
                  <button 
                    onClick={() => setOctaveOffset(Math.max(-3, octaveOffset - 1))} 
                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-200 hover:bg-[#4a5262] rounded transition-colors" 
                    disabled={octaveOffset <= -3}
                  >
                    −
                  </button>
                  <span className="font-mono text-xs text-slate-200 px-2">
                    {octaveOffset === 0 ? 'Normal' : `${octaveOffset > 0 ? '+' : ''}${octaveOffset} octave${Math.abs(octaveOffset) > 1 ? 's' : ''}`}
                  </span>
                  <button 
                    onClick={() => setOctaveOffset(Math.min(3, octaveOffset + 1))} 
                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-200 hover:bg-[#4a5262] rounded transition-colors" 
                    disabled={octaveOffset >= 3}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Reverb<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(reverbLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={reverbLevel} 
                    onChange={(e) => setReverbLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Note Duration<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(noteDuration * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05" 
                    value={noteDuration} 
                    onChange={(e) => setNoteDuration(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-3.5 h-3.5 text-blue-600 bg-[#3d434f] border-gray-600 rounded focus:ring-blue-500 focus:ring-1" 
                    checked={cutOffPreviousNotes} 
                    onChange={(e) => setCutOffPreviousNotes(e.target.checked)} 
                  />
                  <span className="ml-2 text-xs text-slate-300 uppercase tracking-wide">Cut off previous notes</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Equalizer</label>
                <div className="space-y-3">
                  {[
                    { label: 'Bass', key: 'bass' as keyof EqSettings },
                    { label: 'Mid', key: 'mid' as keyof EqSettings },
                    { label: 'Treble', key: 'treble' as keyof EqSettings }
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
                        <span className="text-xs text-slate-400 font-mono">{eq[key] > 0 ? '+' : ''}{eq[key].toFixed(1)}dB</span>
                      </div>
                      <input 
                        type="range" 
                        name={key} 
                        min="-24" 
                        max="24" 
                        step="0.5" 
                        value={eq[key]} 
                        onChange={handleEqChange} 
                        className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PianoSettings;