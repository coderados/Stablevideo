import React from 'react';
import { Film, BookOpen, Key, Sparkles, RefreshCw } from 'lucide-react';

interface TopBarProps {
  onOpenDocs: () => void;
  onOpenApiConfig: () => void;
  onReset: () => void;
  activeView: 'studio' | 'presets' | 'history';
  setActiveView: (view: 'studio' | 'presets' | 'history') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenDocs,
  onOpenApiConfig,
  onReset,
  activeView,
  setActiveView,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Film className="h-4 w-4" />
          </div>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('studio');
            }}
            className="text-base font-bold tracking-tight text-white hover:text-neutral-200 transition-colors whitespace-nowrap shrink-0"
          >
            SVD Studio
          </a>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
          <button
            onClick={() => setActiveView('studio')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'studio' ? 'text-amber-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Studio Canvas
          </button>
          <button
            onClick={() => setActiveView('presets')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'presets' ? 'text-amber-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Curated Presets
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'history' ? 'text-amber-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Creations Archive
          </button>
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>SVD Guide</span>
          </button>
          <button
            onClick={onOpenApiConfig}
            className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Key className="h-3.5 w-3.5" />
            <span>Engine Config</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onReset}
            title="Reset parameters to defaults"
            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:bg-neutral-850 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
            <span>Reset Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
