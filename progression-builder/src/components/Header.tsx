// Slim chassis header, after the main app's HeaderNav: logo + wordmark on the
// left, the current key/mode readout on the right.

function Logo({ size = 30 }: { size?: number }) {
  return (
    <div className="relative flex items-center">
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <polygon
          points="24,2 38,12 38,28 24,38 10,28 10,12"
          fill="none"
          stroke="var(--pb-text-secondary)"
          strokeWidth="2"
        />
        <g fill="var(--pb-text-tertiary)">
          <circle cx="18" cy="20" r="2" />
          <circle cx="30" cy="20" r="2" />
          <circle cx="24" cy="28" r="2" />
        </g>
        <g stroke="var(--pb-text-tertiary)" strokeWidth="1.5">
          <line x1="18" y1="20" x2="24" y2="28" />
          <line x1="30" y1="20" x2="24" y2="28" />
          <line x1="18" y1="20" x2="30" y2="20" />
        </g>
      </svg>
      <div className="absolute -top-1 right-0 h-2 w-2 rotate-45 border border-[var(--pb-text-tertiary)]" />
    </div>
  );
}

interface HeaderProps {
  musicKey: string;
  mode: string;
}

export default function Header({ musicKey, mode }: HeaderProps) {
  return (
    <header className="pb-header">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3 select-none">
          <Logo />
          <div className="flex items-baseline gap-2">
            <h1 className="text-base leading-none font-bold tracking-tight text-[var(--pb-accent)]">progression</h1>
            <span className="h-0.5 w-0.5 self-center rounded-full bg-[var(--pb-text-tertiary)]" />
            <span className="pb-label">builder</span>
          </div>
        </div>
        <div className="pb-inset flex h-7 items-center gap-2 px-2.5 font-mono text-xs whitespace-nowrap">
          <span className="pb-led" />
          <span className="pb-label">key</span>
          <span className="min-w-[2ch] text-[var(--pb-accent-text)]">{musicKey}</span>
          <span className="h-3 w-px bg-[var(--pb-border-strong)]" />
          <span className="text-[var(--pb-text-secondary)]">{mode}</span>
        </div>
      </div>
    </header>
  );
}
