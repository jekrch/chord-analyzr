import React from 'react';
import { XCircleIcon, CogIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { CHORD_NAVIGATION_CONFIG } from '../../constants/chordNavigationConfig';

// Helper function to detect mobile devices
const isMobile = () => {
    return CHORD_NAVIGATION_CONFIG.MOBILE_USER_AGENTS.test(navigator.userAgent) ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
};

// Chord-specific button component that matches the ChordNavigation styling
interface ChordButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  style?: React.CSSProperties;
  
  // Chord-specific props (optional - when provided, renders chord-specific content)
  chord?: any;
  index?: number;
  isLiveMode?: boolean;
  isDeleteMode?: boolean;
  isEditMode?: boolean;
  isHighlighted?: boolean;
  isDragging?: boolean;
  sizeConfig?: any;
}

export const ChordButton: React.FC<ChordButtonProps> = ({
  children,
  onClick,
  onTouchStart,
  onTouchEnd,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  active = false,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  type = 'button',
  title,
  style,
  // Chord-specific props
  chord,
  index,
  isLiveMode,
  isDeleteMode,
  isEditMode,
  isHighlighted,
  isDragging,
  sizeConfig
}) => {
  const baseClasses = `
    font-medium transition-all duration-200
    focus:outline-none focus:ring-2
    focus:ring-[color-mix(in_srgb,var(--mcb-accent-primary)_50%,transparent)]
    focus:ring-offset-2 focus:ring-offset-[var(--mcb-bg-primary)]
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-1
  `;

  const sizeClasses = {
    sm: 'py-1 px-3 text-xs',
    md: 'py-2 px-4 text-sm',
    lg: 'py-3 px-6 text-base'
  };

  // Pads: raised hardware look, lit in the semantic color of the current mode
  const variantClasses = {
    primary: classNames('mcb-pad text-mcb-primary', { 'mcb-pad--lit': active }),
    secondary: 'mcb-pad mcb-pad--edit text-mcb-primary',
    danger: 'mcb-pad mcb-pad--danger text-mcb-primary',
    success: 'mcb-pad text-mcb-primary border-[color-mix(in_srgb,var(--mcb-success-primary)_60%,transparent)]'
  };

  // Enhanced classes for chord-specific functionality
  const enhancedClasses = chord ? classNames(
    baseClasses,
    // Use sizeConfig if provided for chord mode, otherwise use size classes
    sizeConfig ? '' : sizeClasses[size],
    variantClasses[variant],
    {
      'transform': isHighlighted,
      'cursor-grab active:cursor-grabbing': isEditMode && !isMobile(),
      'opacity-80 shadow-2xl scale-105': isDragging,
      'select-none': isEditMode,
    },
    className
  ) : classNames(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  // If chord-specific props are provided, render chord content
  if (chord && typeof index === 'number') {
    return (
      <button
        type={type}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        title={title}
        style={style}
        className={enhancedClasses}
      >
        {/* Delete mode indicator */}
        {isDeleteMode && (
          <XCircleIcon
            className={`absolute top-1 right-1 text-white bg-[var(--mcb-danger-primary)] rounded-full shadow-sm ${
              isLiveMode ? 'h-6 w-6' : 'h-4 w-4'
            }`} 
          />
        )}

        {/* Edit mode indicator */}
        {isEditMode && (
          <>
          <CogIcon 
            className={`absolute top-1 right-1 text-white bg-[var(--mcb-accent-primary)] rounded-full shadow-sm p-0.5 ${
              isLiveMode ? 'h-6 w-6' : 'h-4 w-4'
            }`} 
          />
          {/* DO NOT REMOVE: this opacity-0 icon enables the button to be grabbed. Without it drag and drop will not work properly. */}
           <CogIcon 
              className={`absolute rounded-md  right-0 h-full w-full opacity-0`} 
          />
          </>
        )}

        {/* Enhanced drag handle for mobile - make it more prominent */}
        {isEditMode && isMobile() && (
          <div className="absolute inset-0 w-full bg-[var(--mcb-accent-primary)]/5 border-2 border-[var(--mcb-accent-primary)]/20 rounded-lg pointer-events-none" />
        )}
        
        {/* Chord number */}
        <div className={`text-[var(--mcb-accent-text-light)] font-bold ${sizeConfig?.number || 'text-xl mb-2'}`}>
          {index + 1}
        </div>

        {/* Chord name */}
        <div className={`leading-tight ${sizeConfig?.name || 'text-base text-center text-white'}`}>
          {chord.name}
        </div>

        {/* Live mode additional info */}
        {isLiveMode && (
          <>
            <div className="mt-4 text-xs text-center text-mcb-secondary">
              {chord.notes.replace(/,/g, ' • ')}
            </div>
            <div className="mt-1 font-mono text-xs text-center text-mcb-secondary">
              {chord.pattern.join('-')}
            </div>
          </>
        )}
      </button>
    );
  }

  // Default button render (when not chord-specific)
  return (
    <button
      type={type}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      title={title}
      style={style}
      className={enhancedClasses}
    >
      {children}
    </button>
  );
};