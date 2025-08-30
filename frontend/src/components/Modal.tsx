import React from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

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
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      
      {/* Modal Content */}
      <div className={`relative bg-[#3d434f] border border-gray-600 rounded-lg shadow-xl w-full animate-in fade-in-0 zoom-in-95 duration-200 ${
        fixedHeader ? 'flex flex-col max-h-full' : ''
      } ${className}`}>
        {/* Header (optional) */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between p-4 border-b border-gray-600 bg-[#3d434f] rounded-t-lg ${
            fixedHeader ? 'flex-shrink-0' : ''
          }`}>
            {title && (
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors ml-auto"
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