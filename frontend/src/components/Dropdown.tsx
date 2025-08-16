import React, { useRef, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import classNames from 'classnames';
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
  className, 
  menuClassName, 
  showSearch, 
  buttonClassName 
}) => {
  const [filter, setFilter] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0, 
    left: 0, 
    width: 0,
    maxHeight: 300 
  });
  
  const filteredOptions = options.filter(option =>
    filter?.length ? option.toLowerCase().includes(filter.toLowerCase()) : true
  );

  const portalMountNode = document.body;

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const bottomSpace = window.innerHeight - rect.bottom; 
      const maxHeight = Math.min(bottomSpace - 10, 300); 
  
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width, // Match button width
        maxHeight 
      });
    }
  };

  return (
    <Menu as="div" className={classNames("relative inline-block text-left z-50", className)}>
      <div>
        <Menu.Button 
          ref={buttonRef}
          onClick={(e) => {
            updateMenuPosition();
          }}
          className={classNames(
            "inline-flex w-full justify-between items-center gap-x-2 rounded-lg",
            "bg-[#3d434f] px-4 py-2.5 text-sm font-medium",
            "text-slate-200 shadow-sm ring-1 ring-inset ring-gray-600",
            "hover:bg-[#4a5262] hover:ring-gray-500 hover:shadow-md",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#3d434f]",
            "transition-all duration-200 ease-in-out",
            "group h-10 ",
            buttonClassName
          )}
        >
          <span className="truncate text-left flex-1">{value}</span>
          <ChevronDownIcon 
            className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors duration-200 flex-shrink-0" 
            aria-hidden="true" 
          />
        </Menu.Button>
      </div>

      <Transition
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95 translate-y-1"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100 translate-y-0"
        leaveTo="transform opacity-0 scale-95 translate-y-1"
      >
        {createPortal(
          <div
            style={{
              position: 'absolute',
              top: `${menuPosition.top + 4}px`,
              left: `${menuPosition.left}px`,
              minWidth: `${menuPosition.width}px`,
              zIndex: 1000,
            }}
            className="origin-top"
          >
            <Menu.Items 
              as="div" 
              style={{ 
                maxHeight: `${menuPosition.maxHeight}px`, 
                overflowY: 'auto',
                minWidth: `${menuPosition.width}px`
              }}
              className="dropdown-menu rounded-lg shadow-xl ring-1 ring-black ring-opacity-20 focus:outline-none custom-scrollbar backdrop-blur-sm"
            >
              <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden shadow-2xl">
                {showSearch && (
                  <div className="p-3 border-b border-gray-600 bg-[#3d434f]">
                    <input
                      type="text"
                      className="w-full text-slate-200 px-3 py-2 text-sm font-normal bg-[#444b59] border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 transition-all duration-200"
                      placeholder="Search options..."
                      value={filter}                
                      onChange={(e) => {
                        setFilter(e.target.value)
                      }}
                    />
                  </div>
                )}
                <div className={classNames(
                  "py-1 bg-[#444b59]",
                  menuClassName
                )}>
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, index) => (
                      <Menu.Item key={index}>
                        {({ active }) => (
                          <button
                            onClick={(event) => {
                              onChange(option)
                              setFilter('');
                            }}
                            className={classNames(
                              'block w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150',
                              active 
                                ? 'bg-[#4a5262] text-slate-100 shadow-sm' 
                                : 'text-slate-300 hover:bg-[#4a5262] hover:text-slate-100',
                              'border-l-2 border-transparent',
                              active && 'border-l-blue-500'
                            )}
                          >
                            <span className="truncate block">{option}</span>
                          </button>
                        )}
                      </Menu.Item>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 italic">
                      No options found
                    </div>
                  )}
                </div>
              </div>
            </Menu.Items>
          </div>,
          portalMountNode
        )}
      </Transition>
    </Menu>
  );
};

export default Dropdown;