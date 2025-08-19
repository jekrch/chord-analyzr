import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

type DropdownProps = {
  className?: string;
  menuClassName?: string;
  buttonClassName?: string;
  value: string;
  onChange: (value: any) => void;
  options: string[];
  showSearch?: boolean;
};

const Dropdown: React.FC<DropdownProps> = ({ 
  value, 
  onChange, 
  options, 
  className = '', 
  menuClassName = '', 
  showSearch = false, 
  buttonClassName = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [filter, setFilter] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0, 
    left: 0, 
    width: 0,
    maxHeight: 320 
  });
  
  const filteredOptions = options.filter(option =>
    filter?.length ? option.toLowerCase().includes(filter.toLowerCase()) : true
  );

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const bottomSpace = window.innerHeight - rect.bottom; 
      const maxHeight = Math.min(bottomSpace - 10, 320); 
  
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        maxHeight 
      });
      setIsPositioned(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current && 
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFilter('');
        setIsPositioned(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setFilter('');
        setIsPositioned(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      updateMenuPosition();
      // Small delay to ensure position is set before render
      requestAnimationFrame(() => {
        setIsOpen(true);
      });
    } else {
      setIsOpen(false);
      setIsPositioned(false);
    }
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setFilter('');
    setIsPositioned(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`
          inline-flex w-full justify-between items-center gap-x-2 rounded-lg
          bg-gradient-to-b from-[#464d5a] to-[#3d434f]
          px-4 py-2.5 text-sm font-medium
          text-slate-200 shadow-lg ring-1 ring-inset
          ${isOpen ? 'ring-blue-500/50 shadow-blue-900/20' : 'ring-gray-600/50'}
          hover:from-[#4d5462] hover:to-[#434956] hover:ring-gray-500/50 hover:shadow-xl
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#3d434f]
          transition-all duration-300 ease-out
          group h-10 backdrop-blur-sm
          relative overflow-hidden
          ${buttonClassName}
        `}
      >
        {/* Subtle shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
        
        <span className="truncate text-left flex-1 relative z-10 font-medium tracking-wide">
          {value}
        </span>
        <ChevronDown 
          className={`
            h-4 w-4 text-slate-400 group-hover:text-slate-200 
            transition-all duration-300 flex-shrink-0 relative z-10
            ${isOpen ? 'rotate-180 text-slate-200' : ''}
          `}
          aria-hidden="true" 
        />
      </button>

      {isOpen && isPositioned && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: `${menuPosition.top + 4}px`,
            left: `${menuPosition.left}px`,
            minWidth: `${menuPosition.width}px`,
            maxWidth: `${menuPosition.width}px`,
            zIndex: 9999,
          }}
          className="origin-top dropdown-enter"
        >
          <div 
            style={{ 
              maxHeight: `${menuPosition.maxHeight}px`,
              minWidth: `${menuPosition.width}px`
            }}
            className="dropdown-menu rounded-lg shadow-2xl ring-1 ring-black/30 overflow-hidden backdrop-blur-xl"
          >
            <div className="bg-gradient-to-b from-[#444b59]/95 to-[#3d434f]/95 border border-gray-600/50 rounded-lg overflow-hidden shadow-2xl backdrop-blur-xl">
              {/* Subtle top highlight */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              
              {showSearch && (
                <div className="p-3 border-b border-gray-600/30 bg-[#3d434f]/50 backdrop-blur-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full text-slate-200 pl-9 pr-3 py-2 text-sm font-normal 
                        bg-[#2a2f38]/60 backdrop-blur-sm
                        border border-gray-600/40 rounded-md 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent 
                        placeholder-slate-500 
                        transition-all duration-200
                        hover:bg-[#2a2f38]/80 hover:border-gray-500/40"
                      placeholder="Search options..."
                      value={filter}                
                      onChange={(e) => setFilter(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              )}
              
              <div 
                className={`py-1.5 overflow-y-auto ${menuClassName}`}
                style={{ maxHeight: showSearch ? `${menuPosition.maxHeight - 60}px` : `${menuPosition.maxHeight}px` }}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={(e) => {
                        e.currentTarget.classList.add('active');
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.classList.remove('active');
                      }}
                      className={`
                        relative block w-full px-4 py-2.5 text-left text-sm font-medium 
                        transition-all duration-200
                        text-slate-300 hover:text-slate-100
                        hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20
                        border-l-2 border-l-transparent hover:border-l-blue-400
                        group
                      `}
                    >
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 pointer-events-none transition-all duration-200" />
                      
                      <span className="relative truncate block tracking-wide">
                        {option}
                      </span>
                      
                      {value === option && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 italic text-center">
                    No options found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dropdown;