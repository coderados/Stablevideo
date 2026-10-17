import React, { useState } from 'react';
import {
  Sliders,
  Compass,
  Video,
  Dices,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  Clock,
  MessageSquare,
  Cpu,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { CameraTrajectory, OutputResolution, SvdModelType, SvdParameters } from '../types/svd';

interface SvdParameterControlsProps {
  params: SvdParameters;
  onChange: (updated: Partial<SvdParameters>) => void;
  engineMode: 'studio_local' | 'stability_api';
  onChangeEngineMode: (mode: 'studio_local' | 'stability_api') => void;
  hasApiKey: boolean;
  onOpenApiConfig: () => void;
}

const TRAJECTORIES: { id: CameraTrajectory; label: string; desc: string }[] = [
  { id: 'organic_drift', label: 'Organic Drift', desc: 'Harmonic natural flow & atmospheric breeze' },
  { id: 'zoom_in', label: 'Push In (Dolly)', desc: 'Cinematic forward zoom towards focal subject' },
  { id: 'zoom_out', label: 'Pull Out', desc: 'Expansive backward pull revealing environment' },
  { id: 'pan_left', label: 'Pan Left', desc: 'Smooth horizontal tracking across the horizon' },
  { id: 'pan_right', label: 'Pan Right', desc: 'Rightward tracking motion prior' },
  { id: 'tilt_up', label: 'Tilt Up', desc: 'Vertical crane perspective motion' },
  { id: 'orbital_3d', label: '3D Orbit', desc: 'Curved parallax arc with depth disparity' },
  { id: 'ambient_shimmer', label: 'Ambient Shimmer', desc: 'Subtle micro-motion & light oscillation' },
];

const PROMPT_SUGGESTIONS = [
  'cinematic slow motion',
  'water ripples & mist',
  'dramatic dolly push in',
  'gentle wind swaying trees',
  'rain reflections on asphalt',
  'cosmic nebula swirling',
  'aerial orbital turn',
];

export const SvdParameterControls: React.FC<SvdParameterControlsProps> = ({
  params,
  onChange,
  engineMode,
  onChangeEngineMode,
  hasApiKey,
  onOpenApiConfig,
}) => {
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false);

  const getMotionBucketLabel = (val: number) => {
    if (val < 60) return 'Subtle / Micro-drift';
    if (val < 110) return 'Gentle Ambient';
    if (val < 160) return 'Balanced (Standard)';
    if (val < 210) return 'Dynamic Velocity';
    return 'Extreme Kinetic';
  };

  const handleRollSeed = () => {
    const newSeed = Math.floor(Math.random() * 999999) + 1;
    onChange({ seed: newSeed });
  };

  const handleDurationChange = (secs: number) => {
    const clamped = Math.max(0.5, Math.min(10.0, secs));
    const calculatedFrames = Math.round(clamped * params.fps);
    onChange({
      durationSeconds: clamped,
      numFrames: calculatedFrames,
    });
  };

  const handleFpsChange = (newFps: number) => {
    const calculatedFrames = Math.round(params.durationSeconds * newFps);
    onChange({
      fps: newFps,
      numFrames: calculatedFrames,
    });
  };

  const handleAppendPromptTag = (tag: string) => {
    const current = params.prompt.trim();
    if (!current) {
      onChange({ prompt: tag });
    } else if (!current.toLowerCase().includes(tag.toLowerCase())) {
      onChange({ prompt: `${current}, ${tag}` });
    }
  };

  const calculatedFrames = Math.round(params.durationSeconds * params.fps);

  return (
    <div className="space-y-5">
      {/* Engine Switcher */}
      <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Diffusion Engine
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            {engineMode === 'studio_local' ? 'Instant Local' : 'Cloud GPU'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-850">
          <button
            type="button"
            onClick={() => onChangeEngineMode('studio_local')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              engineMode === 'studio_local'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Studio Neural Engine
          </button>
          <button
            type="button"
            onClick={() => {
              if (!hasApiKey) {
                onOpenApiConfig();
              } else {
                onChangeEngineMode('stability_api');
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
              engineMode === 'stability_api'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Stability AI Cloud</span>
            {!hasApiKey && (
              <span className="text-[10px] text-amber-400/80">(Set Key)</span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Prompt-based Guidance Section */}
      <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
            <label htmlFor="motion-prompt" className="text-xs font-semibold text-neutral-200">
              Motion & Scene Guidance Prompt
            </label>
          </div>
          {params.prompt && (
            <button
              type="button"
              onClick={() => onChange({ prompt: '' })}
              className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            id="motion-prompt"
            rows={2}
            placeholder="Describe the desired movement (e.g. slow cinematic aerial dolly push in, mist rising through trees, golden reflections shimmering)..."
            value={params.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            className="w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Quick Prompt Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-neutral-500">Quick additions:</span>
          {PROMPT_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAppendPromptTag(tag)}
              className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-400 hover:border-neutral-700 hover:text-amber-300 transition-colors"
            >
              +{tag}
            </button>
          ))}
        </div>

        {/* Guidance Scale (CFG) Slider */}
        <div className="space-y-1.5 border-t border-neutral-850 pt-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className="font-medium text-neutral-300">Guidance Scale (CFG)</span>
              <span className="text-[10px] text-neutral-500">Prompt strength</span>
            </div>
            <span className="font-mono tabular-nums text-xs font-bold text-amber-300">
              {params.guidanceScale.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="14.0"
            step="0.5"
            value={params.guidanceScale}
            onChange={(e) => onChange({ guidanceScale: parseFloat(e.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>2.0 (Loose)</span>
            <span>6.0 (Balanced)</span>
            <span>10.0 (Strict)</span>
            <span>14.0 (Heavy)</span>
          </div>
        </div>

        {/* Negative Prompt toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvancedPrompt(!showAdvancedPrompt)}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {showAdvancedPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>Negative Prompt & Temporal Constraints</span>
          </button>

          {showAdvancedPrompt && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-neutral-850 bg-neutral-950 p-2.5">
              <label htmlFor="negative-prompt" className="text-[11px] font-medium text-neutral-300 block">
                Negative Motion Prompt (what to avoid)
              </label>
              <input
                id="negative-prompt"
                type="text"
                placeholder="flicker, jitter, static distortion, jerky cuts, blurry artifacts"
                value={params.negativePrompt}
                onChange={(e) => onChange({ negativePrompt: e.target.value })}
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-500">
                Suppresses high-frequency flickering, sudden jump-cuts, and jitter artifacts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Video Duration in Seconds Control */}
      <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-neutral-200">
              Video Duration (Seconds)
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-neutral-400 tabular-nums">
              {calculatedFrames} frames @ {params.fps} FPS
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="rounded bg-neutral-800 px-2 py-0.5 font-bold tabular-nums text-amber-300">
              {params.durationSeconds.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Quick Duration Buttons */}
        <div className="grid grid-cols-6 gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-850">
          {[1.0, 2.0, 3.0, 4.0, 5.0, 6.0].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => handleDurationChange(sec)}
              className={`py-1 text-xs font-medium rounded transition-colors ${
                params.durationSeconds === sec
                  ? 'bg-neutral-800 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {sec.toFixed(1)}s
            </button>
          ))}
        </div>

        {/* Duration Slider (0.5s to 10.0s) */}
        <input
          type="range"
          min="0.5"
          max="8.0"
          step="0.5"
          value={params.durationSeconds}
          onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
        />

        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span>0.5s (Micro)</span>
          <span>2.5s (SVD Std)</span>
          <span>5.0s (Extended)</span>
          <span>8.0s (Cinematic)</span>
        </div>
      </div>

      {/* 3. Motion Bucket ID */}
      <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <label htmlFor="motion-bucket" className="text-xs font-semibold text-neutral-200">
              Motion Bucket ID
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400">
              {getMotionBucketLabel(params.motionBucketId)}
            </span>
            <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-amber-300">
              {params.motionBucketId}
            </span>
          </div>
        </div>

        <input
          id="motion-bucket"
          type="range"
          min="1"
          max="255"
          step="1"
          value={params.motionBucketId}
          onChange={(e) => onChange({ motionBucketId: Number(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
        />

        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span>1 (Still)</span>
          <button
            type="button"
            onClick={() => onChange({ motionBucketId: 40 })}
            className="hover:text-amber-400 transition-colors"
          >
            40
          </button>
          <button
            type="button"
            onClick={() => onChange({ motionBucketId: 127 })}
            className="text-neutral-300 underline underline-offset-2 hover:text-amber-400"
          >
            127 (Std)
          </button>
          <button
            type="button"
            onClick={() => onChange({ motionBucketId: 180 })}
            className="hover:text-amber-400 transition-colors"
          >
            180
          </button>
          <span>255 (High)</span>
        </div>
      </div>

      {/* 4. Camera Trajectory Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold text-neutral-300">Camera Motion Prior</span>
          </div>
          <span className="text-[11px] text-neutral-500">8 trajectories</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TRAJECTORIES.map((traj) => {
            const isActive = params.cameraTrajectory === traj.id;
            return (
              <button
                key={traj.id}
                type="button"
                onClick={() => onChange({ cameraTrajectory: traj.id })}
                className={`flex flex-col items-start rounded-lg border p-2 text-left transition-all ${
                  isActive
                    ? 'border-amber-400 bg-amber-500/10 text-white'
                    : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <span className="text-xs font-medium truncate w-full">{traj.label}</span>
                <span className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                  {traj.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Framerate & Resolution Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Frame Rate */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
            <span>Frame Rate (FPS)</span>
            <span className="font-mono tabular-nums text-neutral-400">{params.fps} FPS</span>
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
            {[12, 18, 24, 30].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleFpsChange(rate)}
                className={`py-1 text-xs font-medium rounded transition-colors ${
                  params.fps === rate
                    ? 'bg-neutral-800 text-amber-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {rate}
              </button>
            ))}
          </div>
        </div>

        {/* Output Canvas Resolution */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
            <span>Aspect Ratio & Resolution</span>
            <span className="font-mono text-neutral-400 text-[11px]">{params.resolution}</span>
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
            {(
              [
                { id: '1024x576', label: '16:9' },
                { id: '576x1024', label: '9:16' },
                { id: '768x768', label: '1:1' },
                { id: 'source', label: 'Match' },
              ] as { id: OutputResolution; label: string }[]
            ).map((res) => (
              <button
                key={res.id}
                type="button"
                onClick={() => onChange({ resolution: res.id })}
                className={`py-1 text-xs font-medium rounded transition-colors ${
                  params.resolution === res.id
                    ? 'bg-neutral-800 text-amber-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Conditioning Augmentation & Seed */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-neutral-800 bg-neutral-900/30 p-3.5">
        {/* Conditioning Augmentation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-300">Conditioning Aug (cond_aug)</span>
            <span className="font-mono tabular-nums text-neutral-400">{params.condAug.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.00"
            max="0.30"
            step="0.01"
            value={params.condAug}
            onChange={(e) => onChange({ condAug: parseFloat(e.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
          />
          <p className="text-[10px] text-neutral-500">
            Noise added to initial frame. Low = faithful, High = creative variation.
          </p>
        </div>

        {/* Seed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-300">Diffusion Seed</span>
            <button
              type="button"
              onClick={() => onChange({ isRandomSeed: !params.isRandomSeed })}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
            >
              {params.isRandomSeed ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              <span>{params.isRandomSeed ? 'Randomized' : 'Fixed Seed'}</span>
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              disabled={params.isRandomSeed}
              value={params.seed}
              onChange={(e) => onChange({ seed: parseInt(e.target.value) || 0 })}
              className={`flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1 font-mono text-xs text-neutral-200 focus:border-amber-500 focus:outline-none ${
                params.isRandomSeed ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <button
              type="button"
              onClick={handleRollSeed}
              title="Roll random seed"
              className="flex items-center justify-center rounded-lg border border-neutral-800 bg-neutral-850 px-2.5 text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors"
            >
              <Dices className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
