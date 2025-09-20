import React from 'react';
import classNames from 'classnames';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'icon' | 'play-stop';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  active = false,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  type = 'button',
  title
}) => {
  // Base classes common to all button variants
  const baseClasses = `
    inline-flex justify-center items-center gap-x-2 rounded-sm
    font-medium border
    focus:outline-none
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
    relative overflow-hidden
  `;

  // Focus ring classes
  const focusClasses = `
    focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2a2f38]
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs h-8',
    md: 'px-4 py-2.5 text-sm h-10',
    lg: 'px-6 py-3 text-base h-12',
    icon: 'w-8 h-8 flex items-center justify-center p-0'
  };

  const variantClasses = {
    primary: `
      ${active 
        ? 'bg-[#525a6b] border-gray-500 text-slate-100' 
        : 'bg-[#3d434f] border-gray-600 text-slate-200 hover:bg-[#4a5262] hover:border-gray-500'
      }
      focus:ring-blue-500/50
    `,
    secondary: `
      ${active 
        ? 'bg-[#525a6b] border-gray-500 text-slate-100' 
        : 'bg-[#4a5262] border-gray-500 text-slate-200 hover:bg-[#525a6b] hover:border-gray-400'
      }
      focus:ring-gray-400/50
    `,
    success: `
      ${active 
        ? 'bg-green-600 border-green-500 text-green-100' 
        : 'bg-green-700 border-green-600 text-green-100 hover:bg-green-600 hover:border-green-500'
      }
      focus:ring-green-500/50
    `,
    danger: `
      ${active 
        ? 'bg-red-600 border-red-500 text-red-100' 
        : 'bg-red-700 border-red-600 text-red-100 hover:bg-red-600 hover:border-red-500'
      }
      focus:ring-red-500/50
    `,
    icon: `
      ${active 
        ? 'bg-[#525a6b] border-gray-500 text-slate-200' 
        : 'bg-[#3d434f] border-gray-600 text-slate-400 hover:bg-[#4a5262] hover:border-gray-500 hover:text-slate-200'
      }
      focus:ring-gray-500/50
    `,
    'play-stop': `
      ${active 
        ? 'bg-red-700 hover:bg-red-600 border-red-600 text-white' 
        : 'bg-green-600 hover:bg-green-500 border-green-500 text-white'
      }
      font-medium uppercase tracking-wide text-sm w-[7em] px-4 py-2
      focus:ring-green-500/50
    `
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      title={title}
      className={classNames(
        baseClasses,
        focusClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <span className={classNames(
        "flex items-center gap-x-2 tracking-wide",
        size === 'icon' ? 'relative' : 'relative'
      )}>
        {children}
      </span>
    </button>
  );
};

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