import React from 'react';
import { Sparkles, Loader2, XCircle } from 'lucide-react';
import { GenerationProgress } from '../types/svd';

interface GenerationModalProps {
  progress: GenerationProgress;
  onCancel: () => void;
}

export const GenerationModal: React.FC<GenerationModalProps> = ({ progress, onCancel }) => {
  const STAGES = [
    { id: 'encoding', label: 'VAE Latents' },
    { id: 'latent_vectors', label: 'Motion Vectors' },
    { id: 'diffusion_denoising', label: 'Diffusion Steps' },
    { id: 'temporal_coherence', label: 'Temporal Smoothing' },
    { id: 'assembling', label: 'Video Assembly' },
  ];

  const getStageIndex = (stage: GenerationProgress['stage']) => {
    switch (stage) {
      case 'encoding':
        return 0;
      case 'latent_vectors':
        return 1;
      case 'diffusion_denoising':
        return 2;
      case 'temporal_coherence':
        return 3;
      case 'assembling':
      case 'complete':
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(progress.stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Synthesizing Stable Video Diffusion</h3>
              <p className="text-xs text-neutral-400">Generating video frames from image prior</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            title="Cancel Generation"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Multi-step progress pipeline indicators */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {STAGES.map((s, idx) => {
            const isPassed = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={s.id} className="flex flex-col items-center text-center">
                <div
                  className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                    isPassed
                      ? 'bg-amber-400'
                      : isCurrent
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-neutral-800'
                  }`}
                />
                <span
                  className={`mt-1.5 text-[10px] leading-tight truncate w-full ${
                    isCurrent
                      ? 'font-bold text-amber-300'
                      : isPassed
                      ? 'text-neutral-300'
                      : 'text-neutral-600'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Main Progress Bar & Readout */}
        <div className="space-y-2 rounded-xl border border-neutral-850 bg-neutral-950 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-neutral-300">{progress.message}</span>
            <span className="font-mono font-bold tabular-nums text-amber-400">
              {progress.percent}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-850">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {progress.totalFrames > 0 && (
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <span>Frame: {progress.currentFrame} / {progress.totalFrames}</span>
              <span>Temporal Denoising Active</span>
            </div>
          )}
        </div>

        {/* Informative text box */}
        <p className="text-xs text-neutral-400 leading-relaxed">
          Stable Video Diffusion conditions each subsequent frame on the initial latent embedding while maintaining temporal continuity through cross-frame self-attention.
        </p>

        <div className="flex justify-end pt-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-800 bg-neutral-850 px-4 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors"
          >
            Cancel Generation
          </button>
        </div>
      </div>
    </div>
  );
};
