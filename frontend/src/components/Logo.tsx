import React from 'react';

interface LogoProps {
  size?: number; // Size in pixels (default: 48)
  className?: string;
}

// Accent square, in viewBox units so it scales with the logo.
// At the nav's 30px size these come out to a 6px square, 1px line, 3px gap.
const ACCENT_SIDE = 9.6; // outer edge to outer edge
const ACCENT_STROKE = 1.6;
const ACCENT_GAP = 4.8; // between the square and the hexagon's stroke

// Sit the square just outside the middle of the upper-right hexagon edge,
// (24,2) -> (38,12), with its sides parallel to that edge.
const EDGE_DX = 14;
const EDGE_DY = 10;
const EDGE_LEN = Math.hypot(EDGE_DX, EDGE_DY);
const EDGE_ANGLE = (Math.atan2(EDGE_DY, EDGE_DX) * 180) / Math.PI;
const ACCENT_OFFSET = 1 /* half hexagon stroke */ + ACCENT_GAP + ACCENT_SIDE / 2;
const ACCENT_CX = 31 + (EDGE_DY / EDGE_LEN) * ACCENT_OFFSET;
const ACCENT_CY = 7 - (EDGE_DX / EDGE_LEN) * ACCENT_OFFSET;
const ACCENT_RECT = ACCENT_SIDE - ACCENT_STROKE; // stroke straddles the rect edge

const Logo: React.FC<LogoProps> = ({ size = 48, className = '' }) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* y offset centers the hexagon (y 2–38) in the box; the accent pokes
            above it, so let it overflow */}
        <svg viewBox="0 -4 48 48" overflow="visible" style={{ width: size, height: size }}>
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
          {/* Decorative accent, centered on the hexagon's upper-right edge */}
          <rect
            x={ACCENT_CX - ACCENT_RECT / 2}
            y={ACCENT_CY - ACCENT_RECT / 2}
            width={ACCENT_RECT}
            height={ACCENT_RECT}
            transform={`rotate(${EDGE_ANGLE} ${ACCENT_CX} ${ACCENT_CY})`}
            fill="none"
            stroke="currentColor"
            strokeWidth={ACCENT_STROKE}
            className="text-mcb-tertiary"
          />
        </svg>
      </div>
    </div>
  );
};

export default Logo;