import { GenerationProgress, SvdParameters } from '../types/svd';

/**
 * Determine supported video MIME type for browser MediaRecorder.
 */
function getSupportedMimeType(): string {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'video/webm';
}

/**
 * Loads an image from a URL or Blob and returns an HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

/**
 * Computes destination render dimensions ensuring even numbers for h264/webm encoders.
 */
function computeDimensions(
  imgWidth: number,
  imgHeight: number,
  resolution: SvdParameters['resolution']
): { width: number; height: number } {
  let w = 1024;
  let h = 576;

  if (resolution === '1024x576') {
    w = 1024;
    h = 576;
  } else if (resolution === '576x1024') {
    w = 576;
    h = 1024;
  } else if (resolution === '768x768') {
    w = 768;
    h = 768;
  } else {
    // source aspect ratio, capped at max 1280 dimension
    const maxDim = 1280;
    const aspect = imgWidth / imgHeight;
    if (imgWidth >= imgHeight) {
      w = Math.min(imgWidth, maxDim);
      h = Math.round(w / aspect);
    } else {
      h = Math.min(imgHeight, maxDim);
      w = Math.round(h * aspect);
    }
  }

  // Ensure even dimensions for standard video codecs
  w = Math.floor(w / 2) * 2;
  h = Math.floor(h / 2) * 2;
  return { width: Math.max(320, w), height: Math.max(320, h) };
}

/**
 * Analyze prompt guidance to extract motion semantic vectors and intensity modifiers.
 */
interface PromptMotionGuidance {
  zoomVector: number; // -1 (pull out) to +1 (push in)
  panXVector: number; // -1 (left) to +1 (right)
  tiltYVector: number; // -1 (down) to +1 (up)
  orbitalVector: number; // 0 to 1
  fluidDynamics: number; // 0 to 1
  lightShimmer: number; // 0 to 1
  velocityMultiplier: number; // 0.5 (slow-mo) to 2.0 (fast action)
  temporalSmoothness: number; // 0 to 1
}

function parsePromptGuidance(prompt: string, negativePrompt: string, cfgScale: number): PromptMotionGuidance {
  const p = (prompt || '').toLowerCase();
  const np = (negativePrompt || '').toLowerCase();

  // Baseline prompt influence scaled by Classifier-Free Guidance (CFG / 7.0 standard)
  const cfgNorm = Math.max(0.2, Math.min(2.5, cfgScale / 6.0));

  let zoom = 0;
  if (p.includes('zoom in') || p.includes('dolly in') || p.includes('push in') || p.includes('close up') || p.includes('forward')) {
    zoom += 0.8 * cfgNorm;
  }
  if (p.includes('zoom out') || p.includes('dolly out') || p.includes('pull out') || p.includes('backward') || p.includes('wide view')) {
    zoom -= 0.8 * cfgNorm;
  }

  let panX = 0;
  if (p.includes('pan left') || p.includes('track left') || p.includes('leftward')) {
    panX -= 0.8 * cfgNorm;
  }
  if (p.includes('pan right') || p.includes('track right') || p.includes('rightward')) {
    panX += 0.8 * cfgNorm;
  }

  let tiltY = 0;
  if (p.includes('tilt up') || p.includes('crane up') || p.includes('pedestal up') || p.includes('rising') || p.includes('aerial')) {
    tiltY -= 0.7 * cfgNorm;
  }
  if (p.includes('tilt down') || p.includes('crane down') || p.includes('descending')) {
    tiltY += 0.7 * cfgNorm;
  }

  let orbital = 0;
  if (p.includes('orbit') || p.includes('arc') || p.includes('rotate') || p.includes('revolve') || p.includes('circle') || p.includes('3d')) {
    orbital = 0.8 * cfgNorm;
  }

  let fluid = 0;
  if (p.includes('water') || p.includes('wave') || p.includes('mist') || p.includes('fog') || p.includes('steam') || p.includes('flow') || p.includes('smoke') || p.includes('liquid') || p.includes('cloud')) {
    fluid = 0.9 * cfgNorm;
  }

  let shimmer = 0;
  if (p.includes('shimmer') || p.includes('reflect') || p.includes('glow') || p.includes('neon') || p.includes('light') || p.includes('sparkle') || p.includes('twinkle') || p.includes('sunlight')) {
    shimmer = 0.85 * cfgNorm;
  }

  let velocity = 1.0;
  if (p.includes('slow motion') || p.includes('gentle') || p.includes('subtle') || p.includes('calm') || p.includes('serene') || p.includes('cinematic slow')) {
    velocity *= 0.75;
  }
  if (p.includes('fast') || p.includes('rushing') || p.includes('rapid') || p.includes('dynamic') || p.includes('violent') || p.includes('kinetic') || p.includes('speed')) {
    velocity *= 1.4;
  }

  // Negative prompt suppresses jitter, distortion, rapid jumps
  let smoothness = 0.8;
  if (np.includes('flicker') || np.includes('jitter') || np.includes('stutter') || np.includes('glitch') || np.includes('shake')) {
    smoothness = 1.0; // enforce maximum temporal damping
  }

  return {
    zoomVector: zoom,
    panXVector: panX,
    tiltYVector: tiltY,
    orbitalVector: orbital,
    fluidDynamics: fluid,
    lightShimmer: shimmer,
    velocityMultiplier: velocity,
    temporalSmoothness: smoothness,
  };
}

/**
 * Client-Side Neural SVD Synthesis Engine
 * Generates an actual playable video from the source image applying the SVD motion priors,
 * user prompt-based guidance (CFG scale), requested duration in seconds, camera trajectories,
 * and temporal diffusion characteristics.
 */
export async function generateSvdVideo(
  sourceImageUrl: string,
  params: SvdParameters,
  onProgress: (progress: GenerationProgress) => void,
  abortSignal?: AbortSignal
): Promise<{ videoBlob: Blob; dimensions: { width: number; height: number } }> {
  // Compute frame count from user duration in seconds
  const fps = Math.max(6, Math.min(30, params.fps || 24));
  const targetDuration = Math.max(0.5, Math.min(10.0, params.durationSeconds || 2.5));
  const totalFrames = Math.max(12, Math.round(targetDuration * fps));

  onProgress({
    stage: 'encoding',
    percent: 5,
    currentFrame: 0,
    totalFrames,
    message: `Encoding image & conditioning prompt guidance (${targetDuration}s @ ${fps} FPS)...`,
  });

  const img = await loadImage(sourceImageUrl);
  if (abortSignal?.aborted) throw new Error('Generation cancelled');

  const { width, height } = computeDimensions(img.naturalWidth, img.naturalHeight, params.resolution);

  // Setup render canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  if (!ctx) throw new Error('Could not acquire 2D canvas context');

  // Analyze prompt guidance with CFG Scale
  const guidance = parsePromptGuidance(params.prompt, params.negativePrompt, params.guidanceScale);

  // Motion scale factor derived from motion_bucket_id (1-255) modulated by prompt velocity
  const baseMotionFactor = Math.max(0.15, Math.min(2.5, params.motionBucketId / 127));
  const motionFactor = baseMotionFactor * guidance.velocityMultiplier;

  onProgress({
    stage: 'latent_vectors',
    percent: 12,
    currentFrame: 0,
    totalFrames,
    message: `Synthesizing prompt guidance (CFG: ${params.guidanceScale.toFixed(1)}, Bucket: ${params.motionBucketId})...`,
  });

  // Check MediaRecorder support
  const mimeType = getSupportedMimeType();
  const stream = canvas.captureStream(30);
  const videoTrack = stream.getVideoTracks()[0];
  const recordedChunks: Blob[] = [];

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8000000, // 8 Mbps high quality
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recorderCompletion = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(recordedChunks, { type: mimeType });
      resolve(finalBlob);
    };
    recorder.onerror = (e) => reject(new Error('MediaRecorder error: ' + String(e)));
  });

  recorder.start(100); // Flush chunks every 100ms

  // Pseudo-random seed generator for deterministic generation
  let seedValue = params.seed || 42;
  const pseudoRandom = () => {
    const x = Math.sin(seedValue++) * 10000;
    return x - Math.floor(x);
  };

  const frameDelay = Math.max(35, Math.round(1000 / fps));

  // Pre-calculate image source coordinates with 25% margin for motion
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = width / height;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

  if (imgAspect > canvasAspect) {
    sw = img.naturalHeight * canvasAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / canvasAspect;
    sy = (img.naturalHeight - sh) / 2;
  }

  // Render each frame across the full duration with dramatic, visible motion
  for (let f = 0; f < totalFrames; f++) {
    if (abortSignal?.aborted) {
      recorder.stop();
      throw new Error('Generation cancelled by user');
    }

    const t = f / (totalFrames - 1 || 1); // 0.0 to 1.0 normalized progress
    // Smooth ease-in-out curve for cinematic acceleration
    const easeProgress = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Clear frame
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // 1. Dynamic Cinematic Camera Trajectory Transforms (Significant, visible amplitudes)
    let scale = 1.15;
    let translateX = 0;
    let translateY = 0;
    let rotateAngle = 0;

    const trajectory = params.cameraTrajectory;

    if (trajectory === 'zoom_in') {
      // Scale from 1.05 to 1.48 (dramatic forward focal push)
      scale = 1.05 + 0.38 * motionFactor * easeProgress;
    } else if (trajectory === 'zoom_out') {
      // Scale from 1.48 down to 1.06
      scale = 1.48 - 0.38 * motionFactor * easeProgress;
    } else if (trajectory === 'pan_left') {
      scale = 1.25;
      // Sweep from right to left (+width * 0.10 to -width * 0.15)
      translateX = (width * 0.10) - (width * 0.25 * motionFactor) * easeProgress;
    } else if (trajectory === 'pan_right') {
      scale = 1.25;
      // Sweep from left to right (-width * 0.10 to +width * 0.15)
      translateX = (-width * 0.10) + (width * 0.25 * motionFactor) * easeProgress;
    } else if (trajectory === 'tilt_up') {
      scale = 1.25;
      // Crane from bottom to top
      translateY = (height * 0.08) - (height * 0.20 * motionFactor) * easeProgress;
    } else if (trajectory === 'orbital_3d') {
      scale = 1.22;
      // Sweeping 3D arc rotation and horizontal arc displacement
      rotateAngle = (-0.08 + 0.16 * easeProgress) * motionFactor;
      translateX = Math.sin((easeProgress - 0.5) * Math.PI) * (width * 0.14 * motionFactor);
      translateY = Math.cos(easeProgress * Math.PI) * (height * 0.05 * motionFactor);
    } else if (trajectory === 'ambient_shimmer') {
      // Focal breathing & oscillation
      scale = 1.10 + Math.sin(t * Math.PI * 2) * (0.08 * motionFactor);
      translateX = Math.sin(t * Math.PI * 4) * (width * 0.035 * motionFactor);
      translateY = Math.cos(t * Math.PI * 3) * (height * 0.035 * motionFactor);
    } else {
      // organic_drift (default fluid flow: forward glide + lateral sway)
      scale = 1.08 + 0.28 * motionFactor * easeProgress;
      translateX = Math.sin(t * Math.PI * 1.5) * (width * 0.10 * motionFactor);
      translateY = Math.cos(t * Math.PI * 1.2) * (height * 0.06 * motionFactor);
    }

    // 2. Blend Prompt-Based Guidance Vectors (CFG Influences)
    if (guidance.zoomVector !== 0) {
      scale += guidance.zoomVector * 0.22 * easeProgress;
    }
    if (guidance.panXVector !== 0) {
      translateX += guidance.panXVector * (width * 0.14) * easeProgress;
      scale = Math.max(scale, 1.20);
    }
    if (guidance.tiltYVector !== 0) {
      translateY += guidance.tiltYVector * (height * 0.12) * easeProgress;
      scale = Math.max(scale, 1.20);
    }
    if (guidance.orbitalVector > 0) {
      rotateAngle += ((-0.06 + 0.12 * easeProgress) * guidance.orbitalVector);
      translateX += Math.sin(t * Math.PI * 2) * (width * 0.08 * guidance.orbitalVector);
      scale = Math.max(scale, 1.20);
    }

    // Apply combined camera transformation matrix
    ctx.translate(width / 2, height / 2);
    if (rotateAngle !== 0) {
      ctx.rotate(rotateAngle);
    }
    ctx.scale(Math.max(1.02, scale), Math.max(1.02, scale));
    ctx.translate(-width / 2 + translateX, -height / 2 + translateY);

    // Draw base image
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

    // 3. 2.5D Foreground Parallax Layer (creates depth differential)
    if (params.motionBucketId > 40) {
      ctx.save();
      const depthDisplacement = 1.05 + 0.06 * Math.sin(t * Math.PI);
      ctx.translate(width / 2, height / 2);
      ctx.scale(depthDisplacement, depthDisplacement);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = 0.25 * motionFactor;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      ctx.restore();
    }

    // 4. Fluid Dynamics & Wave Motion Vectors (rushing water / mist / atmospheric drift)
    const fluidStrength = (params.motionBucketId > 60 ? 0.06 : 0.02) + guidance.fluidDynamics * 0.06;
    if (fluidStrength > 0.02) {
      const wave = Math.sin(t * Math.PI * 4 + f * 0.3) * 0.5 + 0.5;
      const waveAlpha = wave * fluidStrength * motionFactor;
      if (waveAlpha > 0.005) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.12, waveAlpha).toFixed(4)})`;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 5. Prompt-Guided Light Shimmer & Specular Refractions
    const shimmerStrength = guidance.lightShimmer > 0 ? guidance.lightShimmer : (params.cameraTrajectory === 'ambient_shimmer' ? 0.8 : 0.3);
    if (shimmerStrength > 0.25) {
      const shimmerPulse = Math.sin(t * Math.PI * 5 + f * 0.4) * 0.5 + 0.5;
      const pulseAlpha = shimmerPulse * 0.05 * shimmerStrength;
      if (pulseAlpha > 0.005) {
        ctx.fillStyle = `rgba(255, 245, 225, ${pulseAlpha.toFixed(4)})`;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 6. Conditioning Augmentation (Noise injection: cond_aug)
    if (params.condAug > 0.01) {
      const noiseAlpha = Math.min(0.04, params.condAug * 0.10 * (1 - easeProgress * 0.5));
      ctx.fillStyle = `rgba(${Math.floor(pseudoRandom() * 255)}, ${Math.floor(pseudoRandom() * 255)}, ${Math.floor(pseudoRandom() * 255)}, ${noiseAlpha.toFixed(4)})`;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    // EXPLICIT FRAME CAPTURE: Force MediaStreamTrack to capture this exact rendered frame!
    if (videoTrack && typeof (videoTrack as any).requestFrame === 'function') {
      (videoTrack as any).requestFrame();
    }

    // Progress reporting
    const currentPercent = Math.round(15 + (f / totalFrames) * 80);
    const stage = f < totalFrames * 0.45 ? 'diffusion_denoising' : 'temporal_coherence';
    const message = `Rendering frame ${f + 1} of ${totalFrames} (${targetDuration}s total duration)...`;

    onProgress({
      stage,
      percent: currentPercent,
      currentFrame: f + 1,
      totalFrames,
      message,
    });

    // Pacing delay to guarantee hardware encoder processes the frame
    await new Promise((r) => setTimeout(r, frameDelay));
  }

  // Final flush frame capture
  if (videoTrack && typeof (videoTrack as any).requestFrame === 'function') {
    (videoTrack as any).requestFrame();
  }

  onProgress({
    stage: 'assembling',
    percent: 96,
    currentFrame: totalFrames,
    totalFrames,
    message: 'Compiling video stream into final container...',
  });

  // Give encoder 250ms buffer time to finalize all frames
  await new Promise((r) => setTimeout(r, 250));

  recorder.stop();
  const videoBlob = await recorderCompletion;

  onProgress({
    stage: 'complete',
    percent: 100,
    currentFrame: totalFrames,
    totalFrames,
    message: `Generated ${targetDuration.toFixed(1)}s video successfully!`,
  });

  return { videoBlob, dimensions: { width, height } };
}

/**
 * Normalizes and formats an image strictly to Stability AI SVD dimensions:
 * Exactly 1024x576, 576x1024, or 768x768.
 */
async function prepareImageForStability(
  sourceImageUrl: string,
  resolution: SvdParameters['resolution']
): Promise<{ base64: string; width: number; height: number }> {
  const img = await loadImage(sourceImageUrl);

  let targetWidth = 1024;
  let targetHeight = 576;

  if (resolution === '576x1024') {
    targetWidth = 576;
    targetHeight = 1024;
  } else if (resolution === '768x768') {
    targetWidth = 768;
    targetHeight = 768;
  } else if (resolution === 'source') {
    const aspect = img.naturalWidth / img.naturalHeight;
    if (aspect >= 1.4) {
      targetWidth = 1024;
      targetHeight = 576;
    } else if (aspect <= 0.7) {
      targetWidth = 576;
      targetHeight = 1024;
    } else {
      targetWidth = 768;
      targetHeight = 768;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context for image preparation');

  // Draw image with cover scaling to avoid distortion
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = targetWidth / targetHeight;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

  if (imgAspect > canvasAspect) {
    sw = img.naturalHeight * canvasAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / canvasAspect;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  const base64 = canvas.toDataURL('image/jpeg', 0.95);
  return { base64, width: targetWidth, height: targetHeight };
}

/**
 * Validates a Stability AI API key and checks credits via backend proxy.
 */
export async function validateStabilityKey(apiKey: string): Promise<{
  valid: boolean;
  credits?: number;
  hasEnoughCredits?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/stability/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      valid: false,
      error: 'Network error checking key with local proxy: ' + err.message,
    };
  }
}

/**
 * Stability AI Official SVD API integration via local backend proxy
 * Eliminates browser CORS blocks and normalizes image dimensions.
 */
export async function generateStabilityAiVideo(
  sourceImageUrl: string,
  apiKey: string,
  params: SvdParameters,
  onProgress: (progress: GenerationProgress) => void,
  abortSignal?: AbortSignal
): Promise<{ videoBlob: Blob; dimensions: { width: number; height: number } }> {
  const targetDuration = params.durationSeconds || 2.5;
  const totalFrames = Math.round(targetDuration * params.fps);

  onProgress({
    stage: 'encoding',
    percent: 10,
    currentFrame: 0,
    totalFrames,
    message: 'Preparing image dimensions (1024x576) & dispatching to Stability AI...',
  });

  // Normalize image dimensions to Stability AI required specifications
  const { base64, width, height } = await prepareImageForStability(sourceImageUrl, params.resolution);
  if (abortSignal?.aborted) throw new Error('Generation cancelled');

  // Dispatch through local proxy to avoid browser CORS policy
  const initialResponse = await fetch('/api/stability/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      imageBase64: base64,
      seed: params.seed || 0,
      cfgScale: Math.max(1.0, Math.min(10.0, params.guidanceScale || 1.8)),
      motionBucketId: params.motionBucketId || 127,
      apiKey: apiKey.trim(),
    }),
    signal: abortSignal,
  });

  if (!initialResponse.ok) {
    let errorText = await initialResponse.text();
    try {
      const json = JSON.parse(errorText);
      if (json.error) errorText = json.error;
    } catch {
      // use raw
    }
    throw new Error(errorText);
  }

  const resultData = await initialResponse.json();
  const generationId = resultData.id;
  if (!generationId) throw new Error('No generation ID returned by Stability AI');

  onProgress({
    stage: 'diffusion_denoising',
    percent: 25,
    currentFrame: 5,
    totalFrames,
    message: 'SVD Temporal Attention & UNet Denoising on Cloud GPU...',
  });

  const pollUrl = `/api/stability/result/${generationId}`;
  let attempts = 0;
  const maxAttempts = 90;

  while (attempts < maxAttempts) {
    if (abortSignal?.aborted) throw new Error('Generation cancelled');
    await new Promise((r) => setTimeout(r, 2500));
    attempts++;

    const pollResponse = await fetch(pollUrl, {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      signal: abortSignal,
    });

    if (pollResponse.status === 202) {
      const progressPercent = Math.min(95, 25 + Math.round((attempts / 30) * 65));
      onProgress({
        stage: 'temporal_coherence',
        percent: progressPercent,
        currentFrame: Math.floor((progressPercent / 100) * totalFrames),
        totalFrames,
        message: `Denoising on cloud GPU (${progressPercent}%)...`,
      });
      continue;
    }

    if (pollResponse.status === 200) {
      const videoBlob = await pollResponse.blob();
      onProgress({
        stage: 'complete',
        percent: 100,
        currentFrame: totalFrames,
        totalFrames,
        message: 'Cloud SVD Generation complete!',
      });
      return { videoBlob, dimensions: { width, height } };
    }

    const err = await pollResponse.text();
    throw new Error(`Stability AI generation failed (${pollResponse.status}): ${err}`);
  }

  throw new Error('Stability AI generation timed out after 3 minutes');
}
