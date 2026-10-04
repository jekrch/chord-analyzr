import React from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useExitTransition } from '../hooks/useExitTransition';
import { useScrollLock } from '../hooks/useScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  title?: string;
  fixedHeader?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  showCloseButton = true,
  closeOnBackdropClick = true,
  title,
  fixedHeader = false
}) => {
  const { isRendered, isClosing } = useExitTransition(isOpen);
  useScrollLock(isRendered);

  if (!isRendered) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Portaled to body: rendered in place, a modal opened from inside the
  // scroll container is stuck in its stacking context on iOS and ends up
  // under the fixed chord bar
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 ${
          isClosing ? 'backdrop-fade-out' : 'backdrop-fade-in'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Modal Content */}
      <div className={`relative mcb-panel overflow-hidden w-full ${
        isClosing ? 'animate-out' : 'animate-in'
      } ${
        fixedHeader ? 'flex flex-col max-h-full' : ''
      } ${className}`}>
        {/* Header (optional) */}
        {(title || showCloseButton) && (
          <div className={`mcb-panel-header ${
            fixedHeader ? 'flex-shrink-0' : ''
          }`}>
            {title && (
              <h3 className="mcb-panel-title">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-md text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors ml-auto"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {fixedHeader ? (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;