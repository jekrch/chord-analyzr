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
        ? 'bg-mcb-active border-mcb-secondary text-slate-100' 
        : 'bg-mcb-secondary border-mcb-primary text-mcb-primary hover:bg-mcb-hover hover:border-mcb-secondary'
      }
      focus:ring-[var(--mcb-accent-primary)]/50
    `,
    secondary: `
      ${active 
        ? 'bg-mcb-active border-mcb-secondary text-slate-100' 
        : 'bg-mcb-hover border-mcb-secondary text-mcb-primary hover:bg-mcb-active hover:border-gray-400'
      }
      focus:ring-gray-400/50
    `,
    success: `
      ${active 
        ? 'bg-[var(--mcb-success-primary)] border-green-500 text-[var(--mcb-success-text)]' 
        : 'bg-[var(--mcb-success-secondary)] border-green-600 text-[var(--mcb-success-text)] hover:bg-[var(--mcb-success-primary)] hover:border-green-500'
      }
      focus:ring-green-500/50
    `,
    danger: `
      ${active 
        ? 'bg-[var(--mcb-danger-primary)] border-[var(--mcb-danger-border)] text-red-100' 
        : 'bg-[var(--mcb-danger-secondary)] border-red-600 text-red-100 hover:bg-[var(--mcb-danger-primary)] hover:border-[var(--mcb-danger-border)]'
      }
      focus:ring-red-500/50
    `,
    icon: `
      ${active 
        ? 'bg-mcb-active border-mcb-secondary text-mcb-primary' 
        : 'bg-mcb-secondary border-mcb-primary text-mcb-tertiary hover:bg-mcb-hover hover:border-mcb-secondary hover:text-mcb-primary'
      }
      focus:ring-gray-500/50
    `,
    'play-stop': `
      ${active 
        ? 'bg-[var(--mcb-danger-secondary)] hover:bg-[var(--mcb-danger-primary)] border-red-600 text-white' 
        : 'bg-[var(--mcb-success-primary)] hover:bg-green-500 border-green-500 text-white'
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
