import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, Link, Check, Sparkles } from 'lucide-react';
import { PRESET_IMAGES } from '../data/presets';
import { PresetImage, SvdParameters } from '../types/svd';

interface ImageUploadAreaProps {
  selectedImageUrl: string | null;
  selectedImageName: string;
  imageDimensions: { width: number; height: number } | null;
  onSelectImage: (url: string, name: string, dimensions?: { width: number; height: number }) => void;
  onApplyPreset: (preset: PresetImage) => void;
  onClearImage: () => void;
}

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  selectedImageUrl,
  selectedImageName,
  imageDimensions,
  onSelectImage,
  onApplyPreset,
  onClearImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUrlError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    setUrlError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      onSelectImage(url, file.name, { width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    if (!urlInputValue.trim()) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      onSelectImage(urlInputValue.trim(), 'Remote Image', {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setShowUrlInput(false);
      setUrlInputValue('');
    };
    img.onerror = () => {
      setUrlError('Could not load image from this URL. Please verify the link or try another.');
    };
    img.src = urlInputValue.trim();
  };

  return (
    <div className="space-y-4">
      {/* Upload Box / Active Image Display */}
      {!selectedImageUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-all ${
            isDragging
              ? 'border-amber-400 bg-amber-500/5'
              : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800/80 border border-neutral-700/50 text-neutral-300 group-hover:scale-105 group-hover:text-amber-400 transition-all">
            <Upload className="h-5 w-5" />
          </div>

          <p className="mt-3 text-sm font-medium text-neutral-200">
            Drop your image here or <span className="text-amber-400 underline decoration-amber-400/40 underline-offset-2">browse</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Supports PNG, JPG, WEBP · Recommended 1024×576 or 768×768
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlInput(!showUrlInput);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-850 px-2.5 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition-colors"
            >
              <Link className="h-3 w-3" />
              <span>Import via URL</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-950">
            <img
              src={selectedImageUrl}
              alt={selectedImageName}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
            {/* Top right remove action */}
            <button
              onClick={onClearImage}
              title="Remove image"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900/80 text-neutral-300 backdrop-blur hover:bg-red-950/80 hover:text-red-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Metadata Row */}
          <div className="mt-2.5 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2 truncate pr-2">
              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="truncate font-medium text-neutral-200">{selectedImageName}</span>
              {imageDimensions && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-neutral-400">
                    {imageDimensions.width}×{imageDimensions.height}px
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-xs font-medium text-amber-400 hover:underline"
            >
              Replace
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {/* URL Input collapse */}
      {showUrlInput && !selectedImageUrl && (
        <form onSubmit={handleUrlSubmit} className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
          <label className="block text-xs font-medium text-neutral-300">Image Web Address (URL)</label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/cinematic-photo.jpg"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-neutral-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              Load
            </button>
          </div>
          {urlError && <p className="text-xs text-red-400">{urlError}</p>}
        </form>
      )}

      {/* Curated Presets Bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-neutral-300">Or pick a curated SVD starter image:</span>
          <span className="text-neutral-500">Optimized lighting & depth</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESET_IMAGES.map((preset) => {
            const isSelected = selectedImageUrl === preset.thumbnail;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset)}
                className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-amber-400 ring-1 ring-amber-400'
                    : 'border-neutral-850 hover:border-neutral-700 bg-neutral-900/50'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
                  <img
                    src={preset.thumbnail}
                    alt={preset.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isSelected && (
                    <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-neutral-950">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-neutral-200 group-hover:text-amber-300">
                    {preset.title}
                  </p>
                  <p className="truncate text-[10px] text-neutral-500">
                    {preset.category}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
