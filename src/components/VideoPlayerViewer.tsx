import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Maximize,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GenerationItem } from '../types/svd';

interface VideoPlayerViewerProps {
  currentGeneration: GenerationItem | null;
  onDownload: (item: GenerationItem) => void;
  onDownloadFrame: (videoEl: HTMLVideoElement, title: string) => void;
}

export const VideoPlayerViewer: React.FC<VideoPlayerViewerProps> = ({
  currentGeneration,
  onDownload,
  onDownloadFrame,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [compareMode, setCompareMode] = useState<'video' | 'split' | 'source'>('video');
  const [splitPosition, setSplitPosition] = useState(50); // percentage 0 - 100
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  useEffect(() => {
    if (videoRef.current && currentGeneration) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [currentGeneration?.videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || currentGeneration?.durationSec || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleStepFrame = (direction: 'prev' | 'next') => {
    if (!videoRef.current) return;
    const fps = currentGeneration?.params.fps || 24;
    const frameDuration = 1 / fps;
    videoRef.current.pause();
    setIsPlaying(false);
    if (direction === 'prev') {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - frameDuration);
    } else {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + frameDuration
      );
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Split-screen scrubber drag
  const handleSplitMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSplitPosition(percent);
  };

  if (!currentGeneration) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-xl border border-neutral-800/80 bg-neutral-900/30 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-850 border border-neutral-800 text-neutral-500 mb-3">
          <Layers className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-200">No Video Generated Yet</h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">
          Upload an image or pick a preset on the left, adjust your SVD motion bucket parameters, and click Generate Video.
        </p>
      </div>
    );
  }

  const fps = currentGeneration.params.fps;
  const currentFrameNum = Math.min(
    currentGeneration.params.numFrames,
    Math.floor(currentTime * fps) + 1
  );

  return (
    <div className="space-y-3">
      {/* View Mode Toolbar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
          <button
            type="button"
            onClick={() => setCompareMode('video')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              compareMode === 'video'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('split')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              compareMode === 'split'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>Split Comparison</span>
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('source')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              compareMode === 'source'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Static Source
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-neutral-500 mr-1">Speed:</span>
          {[0.5, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSpeedChange(rate)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums transition-colors ${
                playbackRate === rate
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        onMouseMove={handleSplitMouseMove}
        onMouseUp={() => setIsDraggingSplit(false)}
        className="group relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-black shadow-2xl select-none"
      >
        {/* Underneath: Source Image for split view or source mode */}
        {(compareMode === 'split' || compareMode === 'source') && (
          <img
            src={currentGeneration.sourceImageUrl}
            alt="Source Frame"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}

        {/* Video Element */}
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            clipPath:
              compareMode === 'split' ? `inset(0 0 0 ${splitPosition}%)` : 'none',
            display: compareMode === 'source' ? 'none' : 'block',
          }}
        >
          <video
            ref={videoRef}
            src={currentGeneration.videoUrl}
            loop={isLooping}
            playsInline
            muted
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="h-full w-full object-contain cursor-pointer"
          />
        </div>

        {/* Split Divider Handle */}
        {compareMode === 'split' && (
          <div
            style={{ left: `${splitPosition}%` }}
            onMouseDown={() => setIsDraggingSplit(true)}
            className="absolute top-0 bottom-0 z-20 flex -translate-x-1/2 cursor-ew-resize items-center justify-center"
          >
            <div className="h-full w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <div className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-amber-400 bg-neutral-900 text-amber-400 shadow-md">
              <SlidersHorizontal className="h-3.5 w-3.5 rotate-90" />
            </div>
          </div>
        )}

        {/* Corner Watermark / Mode indicator */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          {compareMode === 'split' ? (
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="rounded bg-black/70 px-2 py-0.5 text-neutral-300 backdrop-blur">
                Left: Original Image
              </span>
              <span className="rounded bg-amber-500/80 px-2 py-0.5 text-black font-bold backdrop-blur">
                Right: SVD Motion Video
              </span>
            </div>
          ) : (
            <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono text-neutral-300 backdrop-blur">
              {currentGeneration.params.modelType === 'svd_xt' ? 'SVD-XT' : 'SVD'} · Frame {currentFrameNum}/{currentGeneration.params.numFrames}
            </span>
          )}
        </div>

        {/* Center play icon overlay on pause */}
        {!isPlaying && compareMode !== 'source' && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer backdrop-blur-[1px]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-neutral-950 shadow-lg hover:scale-105 transition-transform">
              <Play className="h-6 w-6 ml-1 fill-current" />
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls & Scrubber */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-2">
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-neutral-400 w-12 text-left">
            {currentTime.toFixed(2)}s
          </span>
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-amber-400"
          />
          <span className="font-mono text-xs tabular-nums text-neutral-400 w-12 text-right">
            {(duration || currentGeneration.durationSec).toFixed(2)}s
          </span>
        </div>

        {/* Transport Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
            </button>

            <button
              onClick={() => handleStepFrame('prev')}
              title="Step Backward 1 Frame"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-850 bg-neutral-900 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleStepFrame('next')}
              title="Step Forward 1 Frame"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-850 bg-neutral-900 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? 'Looping Enabled' : 'Looping Disabled'}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                isLooping
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-neutral-850 bg-neutral-900 text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
            </button>

            {/* Frame readout */}
            <div className="hidden sm:flex items-center gap-1.5 pl-2 text-xs font-mono text-neutral-400">
              <span className="text-neutral-500">Frame:</span>
              <span className="font-semibold text-neutral-200 tabular-nums">
                {currentFrameNum} / {currentGeneration.params.numFrames}
              </span>
            </div>
          </div>

          {/* Action buttons on the right: Frame Snapshot, Fullscreen, and Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (videoRef.current) {
                  onDownloadFrame(videoRef.current, currentGeneration.title);
                }
              }}
              title="Export Current Frame as PNG"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-850 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Save Frame</span>
            </button>

            <button
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-850 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onDownload(currentGeneration)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-400 transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generation Metadata Details (Strict Zero-Pill Discipline) */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 px-1 py-1">
        <span className="font-medium text-neutral-200">{currentGeneration.title}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums text-amber-300 font-semibold">
          {currentGeneration.durationSec.toFixed(1)}s Duration
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">
          {currentGeneration.dimensions.width}×{currentGeneration.dimensions.height}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">{currentGeneration.params.fps} FPS</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">{currentGeneration.params.numFrames} Frames</span>
        <span aria-hidden="true">·</span>
        <span>Bucket {currentGeneration.params.motionBucketId}</span>
        <span aria-hidden="true">·</span>
        <span>CFG {currentGeneration.params.guidanceScale.toFixed(1)}</span>
        <span aria-hidden="true">·</span>
        <span>{currentGeneration.params.cameraTrajectory.replace('_', ' ')}</span>
        {currentGeneration.params.prompt && (
          <>
            <span aria-hidden="true">·</span>
            <span className="italic text-neutral-300 max-w-xs truncate" title={currentGeneration.params.prompt}>
              "{currentGeneration.params.prompt}"
            </span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">
          {(currentGeneration.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
        </span>
      </div>
    </div>
  );
};
