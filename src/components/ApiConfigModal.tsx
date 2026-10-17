import React, { useState } from 'react';
import {
  X,
  Key,
  ExternalLink,
  Check,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { validateStabilityKey } from '../utils/svdEngine';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
}) => {
  const [keyValue, setKeyValue] = useState(apiKey);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    valid: boolean;
    credits?: number;
    message?: string;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!keyValue.trim()) {
      setTestResult({
        tested: true,
        valid: false,
        error: 'Please enter a Stability AI API key first.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await validateStabilityKey(keyValue.trim());
    setIsTesting(false);
    setTestResult({
      tested: true,
      valid: result.valid,
      credits: result.credits,
      message: result.message,
      error: result.error,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKey(keyValue.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setKeyValue('');
    onSaveKey('');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Stability AI API Configuration</h3>
              <p className="text-xs text-neutral-400">Cloud GPU integration & balance diagnostic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Studio Engine Callout */}
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Built-in Studio Neural Engine (100% Free & Ready)</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            You don't need a paid Stability AI key to generate high-definition videos! The built-in Studio Engine runs locally in your browser with unlimited generation, full prompt guidance, and instant video download.
          </p>
        </div>

        {/* Stability AI Key Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-200">
                Stability AI API Key
              </label>
              <button
                type="button"
                disabled={isTesting || !keyValue.trim()}
                onClick={handleTestKey}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
              >
                {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coins className="h-3 w-3" />}
                <span>{isTesting ? 'Verifying...' : 'Check Balance & Test Key'}</span>
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <input
                type="password"
                placeholder="sk-..."
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  setTestResult(null);
                }}
                className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Test Result Feedback */}
          {testResult && (
            <div
              className={`rounded-xl border p-3 text-xs leading-relaxed transition-all ${
                testResult.valid
                  ? (testResult.credits || 0) >= 20
                    ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'
                    : 'border-amber-900/60 bg-amber-950/30 text-amber-300'
                  : 'border-red-900/60 bg-red-950/30 text-red-300'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                )}
                <div>
                  <p className="font-semibold">
                    {testResult.valid ? 'Key Verified with Stability AI' : 'Verification Issue'}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-90">
                    {testResult.message || testResult.error}
                  </p>
                  {testResult.valid && testResult.credits !== undefined && (
                    <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px]">
                      <span>Account Balance: <strong>{testResult.credits.toFixed(1)} credits</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>SVD Cost: <strong>20 credits/video</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Why Stability AI Key Might Fail Info Box */}
          <div className="rounded-lg border border-neutral-850 bg-neutral-950/60 p-3 text-[11px] text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-300">Common Stability AI Issues & How We Fixed Them:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Browser CORS Block:</strong> Direct browser requests are blocked by Stability AI. We now route all requests through our local backend proxy (<code className="text-neutral-300">/api/stability/*</code>).
              </li>
              <li>
                <strong>Strict Dimensions:</strong> Stability AI strictly requires exactly 1024×576, 576×1024, or 768×768. The app now auto-scales and crops your images to match before sending.
              </li>
              <li>
                <strong>Zero Credit Balance:</strong> Stability AI requires 20 credits per SVD video. If your balance is 0, generations will fail until topped up on their platform.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <a
              href="https://platform.stability.ai/account/keys"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-amber-400 hover:underline"
            >
              <span>Stability AI Account & Credits</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-neutral-500 hover:text-red-400"
              >
                Clear Key
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-800 bg-neutral-850 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-400 transition-colors"
            >
              {isSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Key</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
