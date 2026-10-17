export type CameraTrajectory =
  | 'organic_drift'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'orbital_3d'
  | 'ambient_shimmer';

export type SvdModelType = 'svd_xt' | 'svd_base';

export type OutputResolution = '1024x576' | '576x1024' | '768x768' | 'source';

export interface SvdParameters {
  modelType: SvdModelType;
  prompt: string; // Motion and scene guidance prompt
  negativePrompt: string; // Negative motion guidance prompt
  guidanceScale: number; // CFG scale: 1.0 - 15.0 (default 6.0)
  durationSeconds: number; // 0.5 - 10.0 seconds (default 2.5)
  motionBucketId: number; // 1 - 255 (default 127)
  fps: number; // 6 - 30 (default 24)
  numFrames: number; // Calculated or custom frames (durationSeconds * fps)
  condAug: number; // 0.00 - 0.40 (default 0.02)
  seed: number;
  isRandomSeed: boolean;
  cameraTrajectory: CameraTrajectory;
  resolution: OutputResolution;
  interpolateSmoothness: boolean;
}

export interface GenerationProgress {
  stage: 'idle' | 'encoding' | 'latent_vectors' | 'diffusion_denoising' | 'temporal_coherence' | 'assembling' | 'complete';
  percent: number;
  currentFrame: number;
  totalFrames: number;
  message: string;
}

export interface GenerationItem {
  id: string;
  title: string;
  createdAt: number;
  sourceImageUrl: string;
  sourceImageName: string;
  videoUrl: string;
  blobType: string;
  params: SvdParameters;
  durationSec: number;
  dimensions: { width: number; height: number };
  fileSizeBytes: number;
  engineUsed: 'studio_local' | 'stability_api';
}

export interface PresetImage {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  description: string;
  recommendedParams: Partial<SvdParameters>;
}
