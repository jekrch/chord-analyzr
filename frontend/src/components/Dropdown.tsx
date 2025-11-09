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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
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

  // Scroll to selected option when menu opens
  useEffect(() => {
    if (isOpen && isPositioned && selectedOptionRef.current && scrollContainerRef.current) {
      selectedOptionRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'instant'
      });
    }
  }, [isOpen, isPositioned]);

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
    <div className={`relative inline-block text-left text-lg ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`
          inline-flex w-full justify-between items-center gap-x-2 rounded-lg
          bg-mcb-secondary border
          px-4 py-2.5 text-sm font-medium
          text-mcb-primary 
          ${isOpen ? 'border-[var(--mcb-accent-primary)] bg-mcb-hover' : 'border-mcb-primary hover:bg-mcb-hover hover:border-mcb-secondary'}
          focus:outline-none focus:ring-2 focus:ring-[var(--mcb-accent-primary)]/50 focus:ring-offset-2 focus:ring-offset-[#2a2f38]
          transition-all duration-200 ease-out
          ${buttonClassName.includes('h-') ? '' : 'h-10'}
          ${buttonClassName}
        `}
      >
        <span className="truncate text-left flex-1 font-medium tracking-wide">
          {value}
        </span>
        <ChevronDown 
          className={`
            h-4 w-4 text-mcb-tertiary flex-shrink-0
            transition-all duration-200
            ${isOpen ? 'rotate-180 text-mcb-primary' : 'group-hover:text-mcb-primary'}
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
            className="dropdown-menu rounded-lg shadow-2xl ring-1 ring-black/30 overflow-hidden"
          >
            <div className="bg-mcb-secondary border border-mcb-primary rounded-lg overflow-hidden shadow-2xl">
              {showSearch && (
                <div className="p-3 border-b border-mcb-primary bg-mcb-tertiary">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-mcb-tertiary" />
                    <input
                      type="text"
                      className="w-full text-mcb-primary pl-9 pr-3 py-2 text-sm font-normal 
                        bg-mcb-primary border border-mcb-primary rounded-md 
                        focus:outline-none focus:ring-2 focus:ring-[var(--mcb-accent-primary)]/50 focus:border-[var(--mcb-accent-primary)] 
                        placeholder-slate-500 
                        transition-all duration-200
                        hover:bg-[#333844] hover:border-mcb-secondary"
                      placeholder="Search options..."
                      value={filter}                
                      onChange={(e) => setFilter(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              )}
              
              <div 
                ref={scrollContainerRef}
                className={`py-1.5 overflow-y-auto ${menuClassName}`}
                style={{ maxHeight: showSearch ? `${menuPosition.maxHeight - 60}px` : `${menuPosition.maxHeight}px` }}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <button
                      key={index}
                      ref={value === option ? selectedOptionRef : null}
                      onClick={() => handleSelect(option)}
                      className={`
                        relative block w-full px-4 py-2.5 text-left text-sm font-medium 
                        transition-all duration-200
                        text-mcb-secondary hover:text-slate-100
                        hover:bg-mcb-hover
                        border-l-2 border-l-transparent hover:border-l-[var(--mcb-accent-text-primary)]
                      `}
                    >
                      <span className="relative truncate block tracking-wide">
                        {option}
                      </span>
                      
                      {value === option && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-[var(--mcb-accent-text-primary)] rounded-full" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-mcb-disabled italic text-center">
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