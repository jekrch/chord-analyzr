import React, { useState, useEffect } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  
  // Formatting options
  suffix?: string;
  showPercentage?: boolean;
  formatValue?: (value: number) => string;
  
  // Layout options
  showMinMax?: boolean;
  minLabel?: string;
  maxLabel?: string;
  variant?: 'default' | 'split'; 
  
  // Bypass functionality
  showBypass?: boolean;
  
  // Styling
  className?: string;
  labelClassName?: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 0.05,
  onChange,
  suffix,
  showPercentage = false,
  formatValue,
  showMinMax = false,
  minLabel,
  maxLabel,
  variant = 'default',
  showBypass = false,
  className = "",
  labelClassName = ""
}) => {
  const [enabled, setEnabled] = useState(true);
  const [storedValue, setStoredValue] = useState(value);

  // Keep storedValue in sync with incoming value prop when enabled
  useEffect(() => {
    if (enabled) {
      setStoredValue(value);
    }
  }, [value, enabled]);

  // Format the display value
  const getDisplayValue = () => {
    const displayVal = enabled ? value : storedValue;
    if (formatValue) {
      return formatValue(displayVal);
    }
    if (showPercentage) {
      return `${Math.round(displayVal * 100)}%`;
    }
    return `${displayVal}${suffix || ''}`;
  };

  // Handle change event
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setStoredValue(newValue);
    if (enabled) {
      onChange(newValue);
    }
  };

  // Handle bypass toggle
  const handleBypassToggle = () => {
    const newEnabled = !enabled;
    
    if (newEnabled) {
      // Re-enable: use stored value
      setEnabled(true);
      onChange(storedValue);
    } else {
      // Disable: store current value first, then send 0 to parent
      setStoredValue(value);
      setEnabled(false);
      onChange(0);
    }
  };

  // Only allow arrow keys to work with slider, let other keys fall through
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow arrow keys to control the slider
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.stopPropagation(); // Keep these for the slider only
      return;
    }
    
    // For all other keys, blur and re-dispatch to document
    e.preventDefault();
    e.currentTarget.blur();
    
    // Re-dispatch the key event to document so app keyboard shortcuts work
    const keyEvent = new KeyboardEvent('keydown', {
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(keyEvent);
  };

  // Get the current slider position value
  const sliderValue = enabled ? value : storedValue;

  if (variant === 'split') {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-1">
          <span className={`text-xs text-mcb-tertiary uppercase tracking-wide ${labelClassName}`}>
            {label}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono transition-colors ${enabled ? 'text-mcb-tertiary' : 'text-mcb-subtle'}`}>
              {getDisplayValue()}
            </span>
            {showBypass && (
              <button
                onClick={handleBypassToggle}
                className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                  enabled 
                    ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' 
                    : 'bg-[var(--mcb-text-subtle)]/50 text-mcb-disabled hover:bg-[var(--mcb-text-subtle)]/70'
                }`}
                title={enabled ? 'Bypass effect' : 'Enable effect'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                  <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`w-full h-1.5 bg-mcb-secondary rounded appearance-none cursor-pointer slider-thumb transition-opacity ${
            enabled ? 'opacity-100' : 'opacity-40'
          }`}
        />
        
        {showMinMax && (
          <div className="flex justify-between text-xs text-mcb-disabled mt-1">
            <span>{minLabel || min}</span>
            <span>{maxLabel || max}</span>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <label className={`block text-xs font-medium text-mcb-primary uppercase tracking-wide ${labelClassName}`}>
          {label}
          <span className={`text-xs ml-2 normal-case font-mono transition-colors ${enabled ? 'text-mcb-tertiary' : 'text-mcb-subtle'}`}>
            ({getDisplayValue()})
          </span>
        </label>
        {showBypass && (
          <button
            onClick={handleBypassToggle}
            className={`w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0 ${
              enabled 
                ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' 
                : 'bg-[var(--mcb-text-subtle)]/50 text-mcb-disabled hover:bg-[var(--mcb-text-subtle)]/70'
            }`}
            title={enabled ? 'Bypass effect' : 'Enable effect'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </button>
        )}
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`slider-mobile w-full h-1.5 bg-mcb-secondary rounded appearance-none cursor-pointer slider-thumb transition-opacity ${
            enabled ? 'opacity-100' : 'opacity-40'
          }`}
        />
      </div>
      
      {showMinMax && (
        <div className="flex justify-between text-xs text-mcb-disabled mt-1">
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
    </div>
  );
}

export default Slider;