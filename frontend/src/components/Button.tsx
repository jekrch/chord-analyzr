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
    inline-flex justify-center items-center gap-x-2 rounded-md
    font-medium border
    focus:outline-none
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
    relative overflow-hidden
    shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]
    active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]
  `;

  // Focus ring classes
  const focusClasses = `
    focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--mcb-bg-primary)]
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
        ? 'bg-mcb-active border-mcb-secondary text-[var(--mcb-text-primary)]' 
        : 'bg-mcb-secondary border-mcb-primary text-mcb-primary hover:bg-mcb-hover hover:border-mcb-secondary'
      }
      focus:ring-[var(--mcb-accent-primary)]/50
    `,
    secondary: `
      ${active 
        ? 'bg-mcb-active border-mcb-secondary text-[var(--mcb-text-primary)]' 
        : 'bg-mcb-hover border-mcb-secondary text-mcb-primary hover:bg-mcb-active hover:border-[var(--mcb-border-hover)]'
      }
      focus:ring-[var(--mcb-border-secondary)]/50
    `,
    success: `
      ${active
        ? 'bg-[var(--mcb-success-primary)] border-[var(--mcb-success-primary)] text-[var(--mcb-success-text)]'
        : 'bg-[var(--mcb-success-secondary)] border-[var(--mcb-success-secondary)] text-[var(--mcb-success-text)] hover:bg-[var(--mcb-success-primary)] hover:border-[var(--mcb-success-primary)]'
      }
      focus:ring-[var(--mcb-success-primary)]/50
    `,
    danger: `
      ${active
        ? 'bg-[var(--mcb-danger-primary)] border-[var(--mcb-danger-border)] text-[var(--mcb-danger-text)]'
        : 'bg-[var(--mcb-danger-secondary)] border-[var(--mcb-danger-secondary)] text-[var(--mcb-danger-text)] hover:bg-[var(--mcb-danger-primary)] hover:border-[var(--mcb-danger-border)]'
      }
      focus:ring-[var(--mcb-danger-primary)]/50
    `,
    icon: `
      ${active 
        ? 'bg-mcb-active border-mcb-secondary text-mcb-primary' 
        : 'bg-mcb-secondary border-mcb-primary text-mcb-tertiary hover:bg-mcb-hover hover:border-mcb-secondary hover:text-mcb-primary'
      }
      focus:ring-[var(--mcb-border-secondary)]/50
    `,
    'play-stop': `
      ${active
        ? 'bg-[var(--mcb-danger-secondary)] hover:bg-[var(--mcb-danger-primary)] border-[var(--mcb-danger-primary)] text-white shadow-[0_0_14px_-2px_var(--mcb-danger-primary),inset_0_1px_0_rgba(255,255,255,0.15)]'
        : 'bg-[var(--mcb-success-primary)] hover:bg-[var(--mcb-success-hover)] border-[var(--mcb-success-primary)] text-white shadow-[0_0_14px_-2px_var(--mcb-success-primary),inset_0_1px_0_rgba(255,255,255,0.15)]'
      }
      font-semibold uppercase tracking-widest text-xs w-[7em] px-4 py-2 !rounded-full
      focus:ring-[var(--mcb-success-primary)]/50
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
