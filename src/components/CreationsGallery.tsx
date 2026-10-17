import React from 'react';
import { Film, Play, Download, Trash2, Sliders, ArrowUpRight } from 'lucide-react';
import { GenerationItem } from '../types/svd';

interface CreationsGalleryProps {
  items: GenerationItem[];
  selectedId: string | null;
  onSelect: (item: GenerationItem) => void;
  onDownload: (item: GenerationItem) => void;
  onDelete: (id: string) => void;
  onNewCreation: () => void;
}

export const CreationsGallery: React.FC<CreationsGalleryProps> = ({
  items,
  selectedId,
  onSelect,
  onDownload,
  onDelete,
  onNewCreation,
}) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-850 border border-neutral-800 text-neutral-500 mb-3">
          <Film className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-neutral-200">No Generated Videos in Archive</h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">
          Your generated Stable Video Diffusion animations will appear here for instant replay, parameter inspection, and re-download.
        </p>
        <button
          onClick={onNewCreation}
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 transition-colors"
        >
          Create First Video
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">Video Generations Archive</h2>
          <p className="text-xs text-neutral-400">
            {items.length} {items.length === 1 ? 'generation' : 'generations'} recorded in current session
          </p>
        </div>
        <button
          onClick={onNewCreation}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors"
        >
          New Generation
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const durationStr = `${item.durationSec.toFixed(1)}s`;
          return (
            <div
              key={item.id}
              className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all ${
                isSelected
                  ? 'border-amber-400/80 bg-neutral-900 ring-1 ring-amber-400/50'
                  : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900'
              }`}
            >
              {/* Video Thumbnail / Preview */}
              <div
                onClick={() => onSelect(item)}
                className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black"
              >
                <video
                  src={item.videoUrl}
                  muted
                  playsInline
                  loop
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white backdrop-blur">
                  <span>{durationStr}</span>
                </div>

                <div className="absolute left-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-amber-300 backdrop-blur">
                  <span>Bucket {item.params.motionBucketId}</span>
                </div>
              </div>

              {/* Content info */}
              <div className="flex flex-1 flex-col justify-between p-3.5">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="truncate text-xs font-semibold text-neutral-200 group-hover:text-amber-300">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="font-mono tabular-nums">
                      {item.dimensions.width}×{item.dimensions.height}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.params.fps} FPS</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.params.cameraTrajectory.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between border-t border-neutral-850 pt-2.5">
                  <button
                    onClick={() => onSelect(item)}
                    className="flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <span>Inspect</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDownload(item)}
                      title="Download Video"
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      title="Delete from archive"
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
