import React from 'react';

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
  variant?: 'default' | 'split'; // New variant prop for split layout
  
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
  className = "",
  labelClassName = ""
}) => {
  // Format the display value
  const getDisplayValue = () => {
    if (formatValue) {
      return formatValue(value);
    }
    if (showPercentage) {
      return `${Math.round(value * 100)}%`;
    }
    return `${value}${suffix || ''}`;
  };

  // Handle change event
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  if (variant === 'split') {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-1">
          <span className={`text-xs text-slate-400 uppercase tracking-wide ${labelClassName}`}>
            {label}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {getDisplayValue()}
          </span>
        </div>
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
        />
        
        {showMinMax && (
          <div className="flex justify-between text-xs text-slate-500 mt-1">
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
      <label className={`block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide ${labelClassName}`}>
        {label}
        <span className="text-xs text-slate-400 ml-2 normal-case">
          ({getDisplayValue()})
        </span>
      </label>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="slider-mobile w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
        />
      </div>
      
      {showMinMax && (
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
    </div>
  );
}

export default Slider;