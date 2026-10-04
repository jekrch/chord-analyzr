import React from 'react';
import classNames from 'classnames';
import { PlayIcon, StopIcon } from '@heroicons/react/20/solid';

interface TransportButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  className?: string;
}

// Play/stop key shared by the sequencer header and the chord nav bar.
// The label is hidden on small screens; LED + icon carry the state there.
export const TransportButton: React.FC<TransportButtonProps> = ({ isPlaying, onClick, className }) => (
  <button
    onClick={onClick}
    className={classNames(
      'mcb-switch mcb-transport h-7 shrink-0 sm:min-w-22',
      { 'mcb-switch--success': isPlaying },
      className
    )}
    aria-pressed={isPlaying}
    title={isPlaying ? 'Stop' : 'Play'}
  >
    <span className={classNames('mcb-led shrink-0', isPlaying ? 'mcb-led--success' : 'mcb-led--off')} />
    {isPlaying ? (
      <StopIcon className="w-3.5 h-3.5 shrink-0" />
    ) : (
      <PlayIcon className="w-3.5 h-3.5 shrink-0" />
    )}
    <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Play'}</span>
  </button>
);
