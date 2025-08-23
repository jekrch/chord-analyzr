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
    inline-flex justify-center items-center gap-x-2 rounded-lg
    font-medium shadow-lg
    focus:outline-none
    transition-all duration-300 ease-out
    group backdrop-blur-sm relative overflow-hidden
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:shadow-lg
  `;

  // Ring classes are now separated and will not be applied to the 'play-stop' variant
  const ringClasses = `
    ring-1 ring-inset
    focus:ring-2 focus:ring-offset-2
    disabled:hover:ring-gray-600/50
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs h-8',
    md: 'px-4 py-2.5 text-sm h-10',
    lg: 'px-6 py-3 text-base h-12',
    icon: 'w-8 h-8 flex items-center justify-center p-0'
  };

  const variantClasses = {
    primary: `
      bg-gradient-to-b from-[#464d5a] to-[#3d434f]
      text-slate-200 ring-gray-600/50 focus:ring-offset-[#3d434f]
      ${active 
        ? 'ring-blue-500/50 shadow-blue-900/20' 
        : 'hover:from-[#4d5462] hover:to-[#434956] hover:ring-gray-500/50 hover:shadow-xl'
      }
      focus:ring-blue-500/50
    `,
    secondary: `
      bg-gradient-to-b from-[#5a5a5a] to-[#4f4f4f]
      text-slate-200 ring-gray-500/50 focus:ring-offset-[#4f4f4f]
      ${active 
        ? 'ring-gray-400/50 shadow-gray-900/20' 
        : 'hover:from-[#626262] hover:to-[#565656] hover:ring-gray-400/50 hover:shadow-xl'
      }
      focus:ring-gray-400/50
    `,
    success: `
      bg-gradient-to-b from-[#4a6741] to-[#3d5634]
      text-green-100 ring-green-600/50 focus:ring-offset-[#3d5634]
      ${active 
        ? 'ring-green-400/50 shadow-green-900/20' 
        : 'hover:from-[#52734a] hover:to-[#455d3c] hover:ring-green-500/50 hover:shadow-xl'
      }
      focus:ring-green-500/50
    `,
    danger: `
      bg-gradient-to-b from-[#6b4141] to-[#5a3434]
      text-red-100 ring-red-600/50 focus:ring-offset-[#5a3434]
      ${active 
        ? 'ring-red-400/50 shadow-red-900/20' 
        : 'hover:from-[#754a4a] hover:to-[#633c3c] hover:ring-red-500/50 hover:shadow-xl'
      }
      focus:ring-red-500/50
    `,
    icon: `
      ${active 
        ? 'bg-[#4a5262] border-gray-600 text-slate-200' 
        : 'bg-[#3d434f] border-gray-600 text-slate-400 hover:bg-[#4a5262] hover:border-gray-500 hover:text-slate-200'
      }
      border transition-all duration-200 focus:ring-gray-500/50
    `,
    // Removed ring override classes (!ring-0, !focus:ring-0) as they are no longer needed
    'play-stop': `
      ${active 
        ? 'bg-red-700 hover:bg-red-800 text-white' 
        : 'bg-green-600 hover:bg-green-700 text-white'
      }
      font-medium uppercase tracking-wide text-sm w-[7em] px-4 py-2
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
        variant !== 'play-stop' && ringClasses, // Conditionally apply ring styles
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {/* Subtle shimmer effect on hover - only for gradient variants */}
      {!['icon', 'play-stop'].includes(variant) && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
      )}
      
      <span className={classNames(
        "flex items-center gap-x-2 tracking-wide",
        size === 'icon' ? 'relative' : 'relative z-10'
      )}>
        {children}
      </span>
    </button>
  );
};

// Chord-specific button component that matches the ChordNavigation styling
interface ChordButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const ChordButton: React.FC<ChordButtonProps> = ({
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
  const baseClasses = `
    font-medium transition-all duration-200 rounded-lg
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1e2329]
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
      ? 'bg-blue-500 shadow-lg text-white ring-2 ring-blue-300 focus:ring-blue-500'
      : 'bg-blue-700 hover:bg-blue-600 text-white focus:ring-blue-500',
    secondary: active
      ? 'bg-gray-500 shadow-lg text-white ring-2 ring-gray-300 focus:ring-gray-500'
      : 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    danger: active
      ? 'bg-red-500 shadow-lg text-white ring-2 ring-red-300 focus:ring-red-500'
      : 'bg-red-700 hover:bg-red-600 text-white focus:ring-red-500',
    success: active
      ? 'bg-green-500 shadow-lg text-white ring-2 ring-green-300 focus:ring-green-500'
      : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
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
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </button>
  );
};
