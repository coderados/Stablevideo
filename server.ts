import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Increase body parser limits for high-resolution images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to extract API key from Authorization header or body or env
function getApiKey(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.body && req.body.apiKey) {
    return req.body.apiKey.trim();
  }
  return process.env.STABILITY_API_KEY || '';
}

/**
 * Endpoint to test Stability AI API key and retrieve balance.
 */
app.post('/api/stability/validate', async (req: Request, res: Response) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(400).json({ valid: false, error: 'No API key provided' });
    }

    const response = await fetch('https://api.stability.ai/v1/user/balance', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({
        valid: false,
        error: 'Invalid API key or unauthorized. Please check that you copied the complete key starting with sk-...',
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        valid: false,
        error: `Stability AI check failed (${response.status}): ${errText}`,
      });
    }

    const data = await response.json();
    const credits = data.credits ?? 0;

    return res.json({
      valid: true,
      credits,
      hasEnoughCredits: credits >= 20, // SVD requires 20 credits per generation
      message:
        credits >= 20
          ? `Key verified! Account has ${credits.toFixed(1)} credits.`
          : `Key verified, but account has ${credits.toFixed(1)} credits. SVD image-to-video requires 20 credits per generation on Stability AI.`,
    });
  } catch (error: any) {
    console.error('Validation error:', error);
    return res.status(500).json({ valid: false, error: error.message || 'Server error verifying key' });
  }
});

/**
 * Endpoint to initiate SVD generation on Stability AI.
 */
app.post('/api/stability/generate', async (req: Request, res: Response) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing Stability AI API Key. Please provide your key in Engine Config.' });
    }

    const { imageBase64, motionBucketId = 127, cfgScale = 1.8, seed = 0 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request' });
    }

    // Convert base64 data to Buffer
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    // Construct FormData for Stability AI
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', blob, 'input.jpg');
    formData.append('seed', String(seed || 0));
    formData.append('cfg_scale', String(cfgScale || 1.8));
    formData.append('motion_bucket_id', String(motionBucketId || 127));

    const stabilityResponse = await fetch('https://api.stability.ai/v2beta/image-to-video', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!stabilityResponse.ok) {
      const errText = await stabilityResponse.text();
      let parsedMessage = errText;
      try {
        const jsonErr = JSON.parse(errText);
        if (jsonErr.errors && Array.isArray(jsonErr.errors)) {
          parsedMessage = jsonErr.errors.join('; ');
        } else if (jsonErr.message) {
          parsedMessage = jsonErr.message;
        }
      } catch {
        // use raw text
      }

      console.error(`Stability AI API error (${stabilityResponse.status}):`, parsedMessage);

      // Give user-friendly explanation
      if (stabilityResponse.status === 402 || parsedMessage.toLowerCase().includes('credit')) {
        return res.status(402).json({
          error: 'Your Stability AI account does not have enough credits. SVD requires 20 credits per generation. You can switch to the free built-in Studio Neural Engine instead!',
        });
      }
      if (stabilityResponse.status === 401) {
        return res.status(401).json({
          error: 'Invalid Stability AI API Key. Please verify your key in the Engine Config dialog.',
        });
      }
      if (parsedMessage.toLowerCase().includes('dimension') || parsedMessage.toLowerCase().includes('aspect')) {
        return res.status(400).json({
          error: 'Image dimensions must be strictly 1024x576, 576x1024, or 768x768 for Stability AI. Our app auto-scales, but this image could not be mapped.',
        });
      }

      return res.status(stabilityResponse.status).json({
        error: `Stability AI error: ${parsedMessage}`,
      });
    }

    const data = await stabilityResponse.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Stability generate error:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch generation to Stability AI' });
  }
});

/**
 * Endpoint to poll SVD generation result from Stability AI.
 */
app.get('/api/stability/result/:id', async (req: Request, res: Response) => {
  try {
    const apiKey = getApiKey(req);
    const generationId = req.params.id;

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing Stability AI API Key' });
    }

    const pollUrl = `https://api.stability.ai/v2beta/image-to-video/result/${generationId}`;

    const stabilityResponse = await fetch(pollUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'video/*',
      },
    });

    if (stabilityResponse.status === 202) {
      // In progress
      return res.status(202).json({ status: 'in-progress' });
    }

    if (stabilityResponse.status === 200) {
      // Finished video
      res.setHeader('Content-Type', 'video/mp4');
      const arrayBuffer = await stabilityResponse.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    const errorText = await stabilityResponse.text();
    return res.status(stabilityResponse.status).send(errorText);
  } catch (error: any) {
    console.error('Polling error:', error);
    return res.status(500).json({ error: error.message || 'Error checking generation result' });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
