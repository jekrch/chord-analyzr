import { useState } from 'react';
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react';

interface LinkPanelProps {
  link: string;
}

export default function LinkPanel({ link }: LinkPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; the link is still visible to copy by hand
    }
  };

  return (
    <div className="pb-panel overflow-hidden">
      <div className="pb-panel-header">
        <span className="pb-panel-title">Modal chord buildr link</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {link ? (
          <>
            <div className="pb-inset flex items-center gap-2 px-3 py-2">
              <Link2 size={14} className="shrink-0 text-[var(--pb-text-tertiary)]" />
              <span className="truncate font-mono text-xs text-[var(--pb-text-secondary)]">{link}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleCopy} className="pb-btn flex-1">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <a href={link} target="_blank" rel="noreferrer" className="pb-btn pb-btn--accent flex-1">
                <ExternalLink size={14} /> Open
              </a>
            </div>
          </>
        ) : (
          <p className="pb-inset px-3 py-4 text-center text-xs text-[var(--pb-text-tertiary)]">
            Add at least one chord to your progression to generate a link.
          </p>
        )}
      </div>
    </div>
  );
}
