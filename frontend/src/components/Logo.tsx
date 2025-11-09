import React from 'react';

interface LogoProps {
  size?: number; // Size in pixels (default: 48)
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 48, className = '' }) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
          {/* Hexagonal outline */}
          <polygon 
            points="24,2 38,12 38,28 24,38 10,28 10,12" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            className="text-mcb-secondary"
          />
          {/* Three nodes forming a triangle */}
          <circle cx="18" cy="20" r="2" fill="currentColor" className="text-mcb-tertiary"/>
          <circle cx="30" cy="20" r="2" fill="currentColor" className="text-mcb-tertiary"/>
          <circle cx="24" cy="28" r="2" fill="currentColor" className="text-mcb-tertiary"/>
          {/* Connecting lines */}
          <line x1="18" y1="20" x2="24" y2="28" stroke="currentColor" strokeWidth="1.5" className="text-mcb-tertiary"/>
          <line x1="30" y1="20" x2="24" y2="28" stroke="currentColor" strokeWidth="1.5" className="text-mcb-tertiary"/>
          <line x1="18" y1="20" x2="30" y2="20" stroke="currentColor" strokeWidth="1.5" className="text-mcb-tertiary"/>
        </svg>
      </div>
      {/* Decorative accent */}
      <div className="absolute -top-1 -right-0 w-2 h-2 border border-slate-400 transform rotate-45"></div>
    </div>
  );
};

export default Logo;