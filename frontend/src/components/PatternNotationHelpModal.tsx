import React, { useState } from 'react';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';

interface PatternNotationHelpModalProps {
  className?: string;
}

const PatternNotationHelpModal: React.FC<PatternNotationHelpModalProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={openModal}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white transition-colors ${className}`}
        title="Pattern notation help"
      >
        <QuestionMarkCircleIcon className="w-3 h-3" />
      </button>

      {/* Modal Backdrop & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          
          {/* Modal Content */}
          <div className="relative bg-[#3d434f] border border-gray-600 rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                Pattern Notation Guide
              </h3>
              <button
                onClick={closeModal}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <code className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs font-mono min-w-[2rem] text-center">
                    x
                  </code>
                  <span className="text-xs text-slate-300">Rest (silence)</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <code className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs font-mono min-w-[2rem] text-center">
                    1-8
                  </code>
                  <span className="text-xs text-slate-300">Note index (1st, 2nd, 3rd note, etc.)</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <code className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs font-mono min-w-[2rem] text-center">
                    1+
                  </code>
                  <span className="text-xs text-slate-300">Note with octave up</span>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-4">
                <div className="text-xs text-slate-400 mb-2">
                  <strong className="text-slate-300">Example:</strong>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <code className="text-xs font-mono text-slate-200">1,x,3,2+</code>
                  <div className="text-xs text-slate-400 mt-1">
                    Plays: 1st note → rest → 3rd note → 2nd note (octave up)
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Separate values with commas. Use any combination to create your pattern.
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-600">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors uppercase tracking-wide"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatternNotationHelpModal;