/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Film, Play, Sparkles, Download, Layers, ShieldCheck, ArrowRight, Video, RefreshCw } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { ImageUploadArea } from './components/ImageUploadArea';
import { SvdParameterControls } from './components/SvdParameterControls';
import { VideoPlayerViewer } from './components/VideoPlayerViewer';
import { GenerationModal } from './components/GenerationModal';
import { CreationsGallery } from './components/CreationsGallery';
import { SvdDocsModal } from './components/SvdDocsModal';
import { ApiConfigModal } from './components/ApiConfigModal';
import { PRESET_IMAGES } from './data/presets';
import { GenerationItem, GenerationProgress, PresetImage, SvdParameters } from './types/svd';
import { generateStabilityAiVideo, generateSvdVideo } from './utils/svdEngine';

const DEFAULT_PARAMS: SvdParameters = {
  modelType: 'svd_xt',
  prompt: 'cascading alpine waterfall with rushing white water, morning mist rising gently through trees, soft golden light shimmering',
  negativePrompt: 'flicker, jitter, static distortion, jerky cuts, blurry rocks',
  guidanceScale: 6.5,
  durationSeconds: 3.0,
  motionBucketId: 140,
  fps: 24,
  numFrames: 72,
  condAug: 0.03,
  seed: 48291,
  isRandomSeed: true,
  cameraTrajectory: 'organic_drift',
  resolution: '1024x576',
  interpolateSmoothness: true,
};

export default function App() {
  // Navigation & views
  const [activeView, setActiveView] = useState<'studio' | 'presets' | 'history'>('studio');
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);

  // Engine & API Key
  const [engineMode, setEngineMode] = useState<'studio_local' | 'stability_api'>('studio_local');
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('svd_stability_key') || '';
  });

  // Active Image & Parameters
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(PRESET_IMAGES[0].thumbnail);
  const [selectedImageName, setSelectedImageName] = useState<string>(PRESET_IMAGES[0].title);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>({
    width: 1920,
    height: 1080,
  });
  const [params, setParams] = useState<SvdParameters>({
    ...DEFAULT_PARAMS,
    ...PRESET_IMAGES[0].recommendedParams,
  });

  // Generation execution & state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    percent: 0,
    currentFrame: 0,
    totalFrames: 25,
    message: '',
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Creations archive
  const [currentGeneration, setCurrentGeneration] = useState<GenerationItem | null>(null);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);

  // Update localStorage for API key
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('svd_stability_key', key);
      setEngineMode('stability_api');
    } else {
      localStorage.removeItem('svd_stability_key');
      setEngineMode('studio_local');
    }
  };

  // Preset Selection
  const handleApplyPreset = (preset: PresetImage) => {
    setSelectedImageUrl(preset.thumbnail);
    setSelectedImageName(preset.title);
    setImageDimensions({ width: 1920, height: 1080 });
    setParams((prev) => ({
      ...prev,
      ...preset.recommendedParams,
      seed: Math.floor(Math.random() * 900000) + 100000,
    }));
    setActiveView('studio');
  };

  // Image Upload selection
  const handleSelectImage = (
    url: string,
    name: string,
    dimensions?: { width: number; height: number }
  ) => {
    setSelectedImageUrl(url);
    setSelectedImageName(name);
    if (dimensions) {
      setImageDimensions(dimensions);
    }
  };

  const handleClearImage = () => {
    setSelectedImageUrl(null);
    setSelectedImageName('');
    setImageDimensions(null);
  };

  const handleResetSettings = () => {
    setParams({
      ...DEFAULT_PARAMS,
      seed: Math.floor(Math.random() * 900000) + 100000,
    });
  };

  // Error toast notification
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate Video
  const handleGenerate = async () => {
    setErrorMessage(null);
    if (!selectedImageUrl) {
      setErrorMessage('Please upload an image or pick a preset image first.');
      return;
    }

    const currentSeed = params.isRandomSeed
      ? Math.floor(Math.random() * 999999) + 1
      : params.seed;

    const durationSec = params.durationSeconds || 2.5;
    const numFrames = Math.round(durationSec * params.fps);

    const activeParams: SvdParameters = {
      ...params,
      seed: currentSeed,
      durationSeconds: durationSec,
      numFrames,
    };

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      let videoBlob: Blob;
      let finalDimensions: { width: number; height: number };

      if (engineMode === 'stability_api' && apiKey.trim()) {
        const result = await generateStabilityAiVideo(
          selectedImageUrl,
          apiKey,
          activeParams,
          (p) => setProgress(p),
          abortControllerRef.current.signal
        );
        videoBlob = result.videoBlob;
        finalDimensions = result.dimensions;
      } else {
        const result = await generateSvdVideo(
          selectedImageUrl,
          activeParams,
          (p) => setProgress(p),
          abortControllerRef.current.signal
        );
        videoBlob = result.videoBlob;
        finalDimensions = result.dimensions;
      }

      const videoUrl = URL.createObjectURL(videoBlob);
      const promptSnippet = activeParams.prompt ? ` · "${activeParams.prompt.slice(0, 24)}..."` : '';

      const newItem: GenerationItem = {
        id: 'svd_' + Date.now(),
        title: `${selectedImageName.replace(/\.[^/.]+$/, '')} (${durationSec.toFixed(1)}s · Motion ${activeParams.motionBucketId})${promptSnippet}`,
        createdAt: Date.now(),
        sourceImageUrl: selectedImageUrl,
        sourceImageName: selectedImageName,
        videoUrl,
        blobType: videoBlob.type,
        params: activeParams,
        durationSec,
        dimensions: finalDimensions,
        fileSizeBytes: videoBlob.size,
        engineUsed: engineMode,
      };

      setCurrentGeneration(newItem);
      setGenerations((prev) => [newItem, ...prev]);
      setActiveView('studio');
    } catch (err: unknown) {
      if ((err as Error)?.message?.includes('cancelled')) {
        console.log('Generation cancelled');
      } else {
        setErrorMessage('Video generation failed: ' + ((err as Error)?.message || String(err)));
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  // Download Video
  const handleDownload = (item: GenerationItem) => {
    const ext = item.blobType.includes('mp4') ? 'mp4' : 'webm';
    const cleanName = item.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filename = `${cleanName}_${item.durationSec.toFixed(1)}s_${item.params.fps}fps.${ext}`;

    const a = document.createElement('a');
    a.href = item.videoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download Video Frame Snapshot
  const handleDownloadFrame = (videoEl: HTMLVideoElement, title: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 1024;
    canvas.height = videoEl.videoHeight || 576;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const cleanName = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanName}_frame_capture.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleDeleteGeneration = (id: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    if (currentGeneration?.id === id) {
      const remaining = generations.filter((g) => g.id !== id);
      setCurrentGeneration(remaining[0] || null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <TopBar
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenApiConfig={() => setIsApiConfigOpen(true)}
        onReset={handleResetSettings}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 sm:px-6 max-w-7xl mx-auto w-full">
        {/* Presets Showcase View */}
        {activeView === 'presets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-850 pb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Curated Presets for Stable Video Diffusion
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  High-fidelity 16:9 images with pre-calibrated motion bucket IDs and camera trajectories.
                </p>
              </div>
              <button
                onClick={() => setActiveView('studio')}
                className="self-start sm:self-auto rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
              >
                Back to Studio
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PRESET_IMAGES.map((preset) => (
                <div
                  key={preset.id}
                  className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-neutral-700"
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-950 mb-3.5">
                    <img
                      src={preset.thumbnail}
                      alt={preset.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-mono text-amber-300 backdrop-blur">
                      {preset.category}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    {preset.title}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-400 border-t border-neutral-850 pt-3">
                    <span>Motion Bucket: <strong className="text-neutral-200">{preset.recommendedParams.motionBucketId}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Trajectory: <strong className="text-neutral-200">{preset.recommendedParams.cameraTrajectory?.replace('_', ' ')}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>{preset.recommendedParams.fps} FPS</span>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-400 transition-colors"
                    >
                      <span>Load into Studio</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History / Archive View */}
        {activeView === 'history' && (
          <CreationsGallery
            items={generations}
            selectedId={currentGeneration?.id || null}
            onSelect={(item) => {
              setCurrentGeneration(item);
              setActiveView('studio');
            }}
            onDownload={handleDownload}
            onDelete={handleDeleteGeneration}
            onNewCreation={() => setActiveView('studio')}
          />
        )}

        {/* Studio Canvas View (Main Experience) */}
        {activeView === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Input Image & SVD Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                <div>
                  <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                    Source & SVD Parameters
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Input image prior and diffusion motion controls
                  </p>
                </div>
              </div>

              {/* Image Upload Area */}
              <ImageUploadArea
                selectedImageUrl={selectedImageUrl}
                selectedImageName={selectedImageName}
                imageDimensions={imageDimensions}
                onSelectImage={handleSelectImage}
                onApplyPreset={handleApplyPreset}
                onClearImage={handleClearImage}
              />

              {/* SVD Parameter Controls */}
              <SvdParameterControls
                params={params}
                onChange={(updated) => setParams((prev) => ({ ...prev, ...updated }))}
                engineMode={engineMode}
                onChangeEngineMode={setEngineMode}
                hasApiKey={Boolean(apiKey)}
                onOpenApiConfig={() => setIsApiConfigOpen(true)}
              />

              {/* Error Alert Banner */}
              {errorMessage && (
                <div className="flex items-start justify-between gap-2 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
                  <p className="flex-1">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-200 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Big Generate Button */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={!selectedImageUrl || isGenerating}
                  onClick={handleGenerate}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-neutral-950 shadow-lg transition-all ${
                    !selectedImageUrl || isGenerating
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 hover:scale-[1.01] active:scale-[0.99] shadow-amber-500/10'
                  }`}
                >
                  <Sparkles className="h-4 w-4 fill-current" />
                  <span>
                    {isGenerating
                      ? 'Synthesizing Diffusion Frames...'
                      : `Generate ${params.durationSeconds.toFixed(1)}s Video (${Math.round(params.durationSeconds * params.fps)} Frames)`}
                  </span>
                </button>
                <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 px-1 font-mono">
                  <span>Engine: {engineMode === 'studio_local' ? 'Studio Neural (Free)' : 'Stability Cloud'}</span>
                  <span>Duration: {params.durationSeconds.toFixed(1)}s ({params.fps} FPS)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Video Player & Output Canvas (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                <div>
                  <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                    Video Generation Output
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Real-time playback, split before/after comparison, and download
                  </p>
                </div>
                {currentGeneration && (
                  <button
                    onClick={() => handleDownload(currentGeneration)}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-neutral-850 hover:text-amber-300 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download {currentGeneration.blobType.includes('mp4') ? '.MP4' : '.WebM'}</span>
                  </button>
                )}
              </div>

              {/* Video Player */}
              <VideoPlayerViewer
                currentGeneration={currentGeneration}
                onDownload={handleDownload}
                onDownloadFrame={handleDownloadFrame}
              />

              {/* Mini history strip if generations exist */}
              {generations.length > 0 && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300">
                      Session Generations ({generations.length})
                    </span>
                    <button
                      onClick={() => setActiveView('history')}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      View All Archive
                    </button>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                    {generations.slice(0, 6).map((gen) => (
                      <button
                        key={gen.id}
                        onClick={() => setCurrentGeneration(gen)}
                        className={`group relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg border text-left transition-all ${
                          currentGeneration?.id === gen.id
                            ? 'border-amber-400 ring-1 ring-amber-400'
                            : 'border-neutral-850 hover:border-neutral-700'
                        }`}
                      >
                        <video
                          src={gen.videoUrl}
                          muted
                          playsInline
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                          <p className="truncate text-[9px] font-medium text-neutral-200">
                            {gen.title}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Generation Progress Modal */}
      {isGenerating && (
        <GenerationModal
          progress={progress}
          onCancel={handleCancelGeneration}
        />
      )}

      {/* SVD Docs Modal */}
      <SvdDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      {/* Engine & API Key Modal */}
      <ApiConfigModal
        isOpen={isApiConfigOpen}
        onClose={() => setIsApiConfigOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />
    </div>
  );
}
