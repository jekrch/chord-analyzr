import React from 'react';
import classNames from 'classnames';

// Chord-specific button component that matches the ChordNavigation styling
interface ChordButtonProps {
  children: React.ReactNode;
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
  style
}) => {
  const baseClasses = `
    font-medium transition-all duration-200 rounded-md border
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2a2f38]
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-1
  `;

  const sizeClasses = {
    sm: 'py-1 px-3 text-xs',
    md: 'py-2 px-4 text-sm',
    lg: 'py-3 px-6 text-base'
  };

  const variantClasses = {
    primary: active 
      ? 'bg-blue-600 border-blue-500 text-white focus:ring-blue-500'
      : 'bg-blue-700 border-blue-600 hover:bg-blue-600 hover:border-blue-500 text-white focus:ring-blue-500',
    secondary: active
      ? 'bg-[#525a6b] border-gray-500 text-white focus:ring-gray-500'
      : 'bg-[#4a5262] border-gray-600 hover:bg-[#525a6b] hover:border-gray-500 text-white focus:ring-gray-500',
    danger: active
      ? 'bg-red-600 border-red-500 text-white focus:ring-red-500'
      : 'bg-red-700 border-red-600 hover:bg-red-600 hover:border-red-500 text-white focus:ring-red-500',
    success: active
      ? 'bg-green-600 border-green-500 text-white focus:ring-green-500'
      : 'bg-green-700 border-green-600 hover:bg-green-600 hover:border-green-500 text-white focus:ring-green-500'
  };

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
      className={classNames(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </button>
  );
};