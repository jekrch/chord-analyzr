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

const Dropdown: React.FC<DropdownProps> = ({ value, onChange, options, className, menuClassName, showSearch, buttonClassName }) => {
  const [filter, setFilter] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0, 
    left: 0, 
    maxHeight: 300 
  });
  const filteredOptions = options.filter(option =>
    filter?.length ? option.toLowerCase().includes(filter.toLowerCase()) : true
  );

  const portalMountNode = document.body;

  const handleMenuClose = () => {
    setFilter('');
  };

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const bottomSpace = window.innerHeight - rect.bottom; 
      const maxHeight = Math.min(bottomSpace - 10, 300); 
  
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
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
            "inline-flex w-full justify-center gap-x-1.5 rounded-md",
            "bg-[#3d434f] px-3 py-[0.2em] h-6 text-sm font-bold",
            "text-slate-200 shadow-sm ring-1 ring-inset ring-gray-600 hover:bg-[#4a5262]",
            "h-[2em] items-center transition-colors !p-4", 
            buttonClassName
          )}>
          {value}
          <ChevronDownIcon className="-mr-1 h-5 w-5 text-slate-400" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        {createPortal(
          <div
          style={{
            position: 'absolute',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 1000,
          }}
          className="origin-top-right"
        >
        <Menu.Items 
          as="div" 
          style={{ maxHeight: `${menuPosition.maxHeight}px`, overflowY: 'auto' }}
          className="dropdown-menu absolute mt-2 rounded-md shadow-lg ring-1 ring-gray-600 ring-opacity-5 focus:outline-none custom-scrollbar w-auto"
         >
          <div className="py-1 bg-[#3d434f] border border-gray-600 rounded-md overflow-hidden">
            {showSearch &&
              <div className="p-2 border-b border-gray-600">
                <input
                  type="text"
                  className="w-full text-slate-200 px-3 py-2 text-sm font-normal bg-[#444b59] border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                  placeholder="Search..."
                  value={filter}                
                  onChange={(e) => {
                    setFilter(e.target.value)
                  }}
                />
              </div>
            }
            <div className={classNames("overflow-y-auto bg-[#444b59] ", menuClassName)}>
              {filteredOptions.map((option, index) => (
                <Menu.Item key={index}>
                  {({ active }) => (
                    <button
                      onClick={(event) => {
                        onChange(option)
                        setFilter('');
                      }}
                      className={classNames(
                        active ? 'bg-[#4a5262] text-slate-100' : 'text-slate-300',
                        'block w-full px-4 py-2 text-left text-sm hover:bg-[#4a5262] hover:text-slate-100 transition-colors'
                      )}
                    >
                      {option}
                    </button>
                  )}
                </Menu.Item>
              ))}
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