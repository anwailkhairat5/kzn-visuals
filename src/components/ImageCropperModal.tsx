/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  targetTitle?: string;
  defaultAspect?: 'idcard' | 'strap' | 'square' | 'wide' | 'free';
  onCropComplete: (croppedDataUrl: string) => void;
  onClose: () => void;
}

type AspectRatio = 'idcard' | 'strap' | 'square' | 'wide' | 'free';

const ASPECT_RATIOS: { id: AspectRatio; label: string; ratio: number | null }[] = [
  { id: 'idcard', label: '🪪 ID Card (2:3)', ratio: 2 / 3 },
  { id: 'square', label: '⏹️ Persegi (1:1)', ratio: 1 },
  { id: 'wide', label: '🖥️ Banner (16:9)', ratio: 16 / 9 },
  { id: 'strap', label: '🎗️ Tali Strap (1:4)', ratio: 1 / 4 },
  { id: 'free', label: '✂️ Bebas', ratio: null },
];

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  targetTitle = 'Potong & Sesuaikan Gambar',
  defaultAspect = 'idcard',
  onCropComplete,
  onClose,
}: ImageCropperModalProps) {
  const [aspect, setAspect] = useState<AspectRatio>(defaultAspect);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset when image changes
  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setAspect(defaultAspect);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        draw();
      };
      img.src = imageSrc;
    }
  }, [imageSrc, defaultAspect]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Dark backdrop
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, width, height);

    // Save state for image transformation
    ctx.save();
    ctx.translate(width / 2 + position.x, height / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw image centered
    const imgWidth = img.width;
    const imgHeight = img.height;
    const scale = Math.min((width * 0.75) / imgWidth, (height * 0.75) / imgHeight);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Calculate crop rectangle
    let cropW = width * 0.7;
    let cropH = height * 0.7;
    const selectedAspect = ASPECT_RATIOS.find((a) => a.id === aspect);

    if (selectedAspect && selectedAspect.ratio) {
      const targetRatio = selectedAspect.ratio;
      if (width / height > targetRatio) {
        cropH = height * 0.75;
        cropW = cropH * targetRatio;
      } else {
        cropW = width * 0.75;
        cropH = cropW / targetRatio;
      }
    }

    const cropX = (width - cropW) / 2;
    const cropY = (height - cropH) / 2;

    // Draw dim mask outside crop box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    // Top
    ctx.fillRect(0, 0, width, cropY);
    // Bottom
    ctx.fillRect(0, cropY + cropH, width, height - (cropY + cropH));
    // Left
    ctx.fillRect(0, cropY, cropX, cropH);
    // Right
    ctx.fillRect(cropX + cropW, cropY, width - (cropX + cropW), cropH);

    // Draw crop border
    ctx.strokeStyle = '#18d3ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Draw rule-of-thirds grid inside crop box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cropX + cropW / 3, cropY);
    ctx.lineTo(cropX + cropW / 3, cropY + cropH);
    ctx.moveTo(cropX + (cropW * 2) / 3, cropY);
    ctx.lineTo(cropX + (cropW * 2) / 3, cropY + cropH);
    ctx.moveTo(cropX, cropY + cropH / 3);
    ctx.lineTo(cropX + cropW, cropY + cropH / 3);
    ctx.moveTo(cropX, cropY + (cropH * 2) / 3);
    ctx.lineTo(cropX + cropW, cropY + (cropH * 2) / 3);
    ctx.stroke();

    // Corner handles
    ctx.fillStyle = '#ffffff';
    const handleSize = 10;
    // Top-left
    ctx.fillRect(cropX - 2, cropY - 2, handleSize, 3);
    ctx.fillRect(cropX - 2, cropY - 2, 3, handleSize);
    // Top-right
    ctx.fillRect(cropX + cropW - handleSize + 2, cropY - 2, handleSize, 3);
    ctx.fillRect(cropX + cropW - 1, cropY - 2, 3, handleSize);
    // Bottom-left
    ctx.fillRect(cropX - 2, cropY + cropH - 1, handleSize, 3);
    ctx.fillRect(cropX - 2, cropY + cropH - handleSize + 2, 3, handleSize);
    // Bottom-right
    ctx.fillRect(cropX + cropW - handleSize + 2, cropY + cropH - 1, handleSize, 3);
    ctx.fillRect(cropX + cropW - 1, cropY + cropH - handleSize + 2, 3, handleSize);
  }, [aspect, zoom, rotation, position]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse / Touch Drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 4.0));
  };

  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    // Calculate crop rectangle on canvas
    const width = canvas.width;
    const height = canvas.height;
    let cropW = width * 0.7;
    let cropH = height * 0.7;
    const selectedAspect = ASPECT_RATIOS.find((a) => a.id === aspect);

    if (selectedAspect && selectedAspect.ratio) {
      const targetRatio = selectedAspect.ratio;
      if (width / height > targetRatio) {
        cropH = height * 0.75;
        cropW = cropH * targetRatio;
      } else {
        cropW = width * 0.75;
        cropH = cropW / targetRatio;
      }
    }

    const cropX = (width - cropW) / 2;
    const cropY = (height - cropH) / 2;

    // Create high-resolution export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.round(cropW);
    exportCanvas.height = Math.round(cropH);
    const exportCtx = exportCanvas.getContext('2d');

    if (!exportCtx) return;

    // Extract the cropped pixels from main canvas
    const mainCtx = canvas.getContext('2d');
    if (!mainCtx) return;

    // Redraw without dimming and borders to export clean image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.save();
    tempCtx.translate(width / 2 + position.x, height / 2 + position.y);
    tempCtx.rotate((rotation * Math.PI) / 180);
    tempCtx.scale(zoom, zoom);

    const imgWidth = img.width;
    const imgHeight = img.height;
    const scale = Math.min((width * 0.75) / imgWidth, (height * 0.75) / imgHeight);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;

    tempCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    tempCtx.restore();

    // Copy exact crop area
    exportCtx.drawImage(
      tempCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      exportCanvas.width,
      exportCanvas.height
    );

    const croppedDataUrl = exportCanvas.toDataURL('image/png', 0.95);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1422] border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141a2e]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2f77ff]/20 text-[#18d3ff] border border-[#2f77ff]/40 flex items-center justify-center text-sm font-bold">
              ✂️
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{targetTitle}</h3>
              <p className="text-[11px] text-white/50">Geser untuk memposisikan, putar atau zoom sesuai kebutuhan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        {/* Modal Body - Canvas */}
        <div className="relative flex-1 flex items-center justify-center p-4 bg-[#090c14] overflow-hidden select-none">
          <canvas
            ref={canvasRef}
            width={600}
            height={420}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="rounded-2xl max-w-full max-h-[50vh] object-contain cursor-grab active:cursor-grabbing border border-white/10 shadow-inner"
          />
          <div className="absolute bottom-6 left-6 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white/60 pointer-events-none">
            💡 Tips: Klik & geser mouse untuk memindahkan posisi gambar
          </div>
        </div>

        {/* Modal Controls */}
        <div className="px-6 py-4 bg-[#141a2e]/90 border-t border-white/10 flex flex-col gap-3">
          {/* Aspect Ratio Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white/70">Aspek Rasio:</span>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAspect(item.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    aspect === item.id
                      ? 'bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white shadow-md shadow-blue-500/20'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom & Rotation controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/60 min-w-12">Zoom ({zoom.toFixed(1)}x)</span>
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#18d3ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <span>↻ Putar 90°</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setPosition({ x: 0, y: 0 });
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 border border-white/10 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="text-xs px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-semibold shadow-lg shadow-blue-500/25 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>✓ Terapkan & Gunakan Gambar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
