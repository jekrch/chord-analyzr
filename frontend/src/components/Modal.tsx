import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

const ANIMATION_DURATION = 200;

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
  // Keep the modal mounted while the exit animation plays.
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }

    if (!isRendered) return;

    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, ANIMATION_DURATION);

    return () => window.clearTimeout(timer);
  }, [isOpen, isRendered]);

  if (!isRendered) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
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
                className="w-6 h-6 flex items-center justify-center rounded-full text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors ml-auto"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {fixedHeader ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default Modal;