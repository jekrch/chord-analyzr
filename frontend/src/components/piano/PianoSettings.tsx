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
  volume: number;
  setVolume: (volume: number) => void;
  chorusLevel: number;
  setChorusLevel: (level: number) => void;
  delayLevel: number;
  setDelayLevel: (level: number) => void;
  distortionLevel: number;
  setDistortionLevel: (level: number) => void;
  bitcrusherLevel: number;
  setBitcrusherLevel: (level: number) => void;
  phaserLevel: number;
  setPhaserLevel: (level: number) => void;
  flangerLevel: number;
  setFlangerLevel: (level: number) => void;
  ringModLevel: number;
  setRingModLevel: (level: number) => void;
  autoFilterLevel: number;
  setAutoFilterLevel: (level: number) => void;
  tremoloLevel: number;
  setTremoloLevel: (level: number) => void;
  stereoWidthLevel: number;
  setStereoWidthLevel: (level: number) => void;
  compressorLevel: number;
  setCompressorLevel: (level: number) => void;
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
  volume,
  setVolume,
  chorusLevel,
  setChorusLevel,
  delayLevel,
  setDelayLevel,
  distortionLevel,
  setDistortionLevel,
  bitcrusherLevel,
  setBitcrusherLevel,
  phaserLevel,
  setPhaserLevel,
  flangerLevel,
  setFlangerLevel,
  ringModLevel,
  setRingModLevel,
  autoFilterLevel,
  setAutoFilterLevel,
  tremoloLevel,
  setTremoloLevel,
  stereoWidthLevel,
  setStereoWidthLevel,
  compressorLevel,
  setCompressorLevel,
}) => {
  const handleEqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEq({ ...eq, [name]: parseFloat(value) });
  };

  return (
    <div className={`transition-all duration-300 ease-in-out overflow-hidden px-2 ${
      isOpen ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0'
    }`}>
      <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden w-full max-w-7xl mx-auto">
        <div className="px-4 py-3 border-b border-gray-600">
          <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
            Piano Settings
          </h3>
        </div>

        <div className="p-6 bg-[#444b59]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">

            {/* Column 1: Basic Controls */}
            <div className="space-y-6">
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-4">Basic</div>
              
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Volume<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(volume * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

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
                  <span className="font-mono !text-xs text-slate-200 px-2">
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

              <div className="pt-4">
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-4">Equalizer</div>
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

            {/* Column 2: Classic Effects */}
            <div className="space-y-4 mt-6 lg:mt-0">
              <div className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-4">Classic Effects</div>

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
                  Chorus<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(chorusLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={chorusLevel} 
                    onChange={(e) => setChorusLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Delay<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(delayLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={delayLevel} 
                    onChange={(e) => setDelayLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Phaser<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(phaserLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={phaserLevel} 
                    onChange={(e) => setPhaserLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Flanger<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(flangerLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={flangerLevel} 
                    onChange={(e) => setFlangerLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Tremolo<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(tremoloLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={tremoloLevel} 
                    onChange={(e) => setTremoloLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>
            </div>

            {/* Column 3: EDM/Trippy Effects */}
            <div className="space-y-4 mt-6 lg:mt-0">
              <div className="text-xs font-bold text-pink-300 uppercase tracking-wider mb-4">EDM / Trippy</div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Distortion<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(distortionLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={distortionLevel} 
                    onChange={(e) => setDistortionLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Bitcrusher<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(bitcrusherLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={bitcrusherLevel} 
                    onChange={(e) => setBitcrusherLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Ring Mod<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(ringModLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={ringModLevel} 
                    onChange={(e) => setRingModLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Auto-Filter<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(autoFilterLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={autoFilterLevel} 
                    onChange={(e) => setAutoFilterLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Stereo Width<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(stereoWidthLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={stereoWidthLevel} 
                    onChange={(e) => setStereoWidthLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                  Compressor<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(compressorLevel * 100)}%)</span>
                </label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05" 
                    value={compressorLevel} 
                    onChange={(e) => setCompressorLevel(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                  />
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