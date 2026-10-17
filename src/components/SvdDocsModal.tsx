import React from 'react';
import { X, BookOpen, Sliders, Compass, Sparkles, Layers } from 'lucide-react';

interface SvdDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SvdDocsModal: React.FC<SvdDocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Stable Video Diffusion Manual</h3>
              <p className="text-xs text-neutral-400">Architecture, parameters, and prompting guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section 1: Core Concept */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            01. Model Architecture
          </h4>
          <p className="text-xs leading-relaxed text-neutral-300">
            Stable Video Diffusion (SVD) is a latent diffusion model trained to synthesize temporally consistent video frames conditioned on a single static image. SVD incorporates spatial and temporal transformer layers into the UNet, learning real-world 3D motion, physics, and camera dynamics without explicit 3D geometry.
          </p>
        </div>

        {/* Section 2: Motion Bucket ID */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            02. Motion Bucket ID Explained
          </h4>
          <p className="text-xs leading-relaxed text-neutral-300">
            The <code className="rounded bg-neutral-950 px-1.5 py-0.5 font-mono text-amber-300">motion_bucket_id</code> (range 1–255) is the primary parameter controlling the magnitude of motion:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2.5">
              <span className="font-semibold text-neutral-200">1 – 60 (Low Velocity):</span>
              <p className="mt-0.5 text-neutral-400">Subtle breathing, gentle wind, drifting cloud ambient motion.</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2.5">
              <span className="font-semibold text-neutral-200">100 – 140 (Standard Default):</span>
              <p className="mt-0.5 text-neutral-400">Cinematic camera pans, waterfalls, walking characters.</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2.5">
              <span className="font-semibold text-neutral-200">160 – 210 (High Action):</span>
              <p className="mt-0.5 text-neutral-400">Fast vehicle turns, crashing ocean waves, rapid orbital swings.</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2.5">
              <span className="font-semibold text-neutral-200">210 – 255 (Kinetic / Turbulence):</span>
              <p className="mt-0.5 text-neutral-400">Maximum velocity. May exhibit creative morphing or dynamic warps.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Conditioning Augmentation */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            03. Conditioning Augmentation (cond_aug)
          </h4>
          <p className="text-xs leading-relaxed text-neutral-300">
            Controls how much noise is added to the conditioning image prior. At low values (0.01 – 0.03), generation strictly respects the input pixels. At higher values (0.05 – 0.15), the model has creative freedom to hallucinate unseen angles and dynamic variations.
          </p>
        </div>

        {/* Section 4: Optimal Image Inputs */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            04. Optimal Input Best Practices
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-neutral-300 leading-relaxed">
            <li><strong className="text-white">Distinct Depth Planes:</strong> Images with distinct foreground, midground, and background yield rich parallax.</li>
            <li><strong className="text-white">Landscape Format:</strong> 1024×576 is the native resolution SVD models were trained on.</li>
            <li><strong className="text-white">Clean Focus:</strong> Avoid heavily blurred or low-contrast source photos for best edge stability.</li>
          </ul>
        </div>

        {/* Section 5: Prompt Guidance & CFG Scale */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            05. Prompt-Based Motion Guidance
          </h4>
          <p className="text-xs leading-relaxed text-neutral-300">
            Use the motion guidance prompt to steer optical flow and camera trajectory (e.g. <em className="text-amber-300">"slow drone push into the misty valley"</em>).
            The <strong>Guidance Scale (CFG)</strong> determines prompt adhesion strength. A value of 6.0 provides optimal balance between image fidelity and prompt dynamic instruction.
          </p>
        </div>

        {/* Section 6: Video Duration (Seconds) */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            06. Video Duration & Frame Timing
          </h4>
          <p className="text-xs leading-relaxed text-neutral-300">
            Specify video length from 0.5s to 8.0s. Total diffusion frames rendered are calculated via <code className="rounded bg-neutral-950 px-1 font-mono text-amber-300">frames = duration × FPS</code>. Higher durations create cinematic slow-motion or expansive tracking shots.
          </p>
        </div>

        <div className="border-t border-neutral-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
