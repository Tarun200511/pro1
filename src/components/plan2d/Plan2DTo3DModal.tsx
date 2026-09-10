import React, { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import {
  SAMPLE_BLUEPRINTS,
  analyzeFloorPlanImage
} from '../../utils/planRecognizer';
import type { SampleBlueprint, PlanRecognitionResult } from '../../utils/planRecognizer';
import type { Wall, RoomObject } from '../../types/room';
import { triggerHaptic, playScanComplete, playMeshDetect } from '../../utils/sound';
import {
  Layers,
  Upload,
  Camera,
  Sparkles,
  X,
  Box,
  Eye,
  RefreshCw,
  Building2,
  Compass
} from 'lucide-react';

export const Plan2DTo3DModal: React.FC = () => {
  const isOpen = useRoomStore((state) => state.isPlan2DModalOpen);
  const onClose = useRoomStore((state) => state.closePlan2DModal);
  const clearRoom = useRoomStore((state) => state.clearRoom);
  const addWall = useRoomStore((state) => state.addWall);
  const addObject = useRoomStore((state) => state.addObject);
  const setRoomName = useRoomStore((state) => state.setRoomName);
  const setCeilingHeight = useRoomStore((state) => state.setCeilingHeight);
  const setRenderStyle = useRoomStore((state) => state.setRenderStyle);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const unit = useRoomStore((state) => state.unit);

  const [activeTab, setActiveTab] = useState<'samples' | 'upload'>('samples');
  const [selectedSample, setSelectedSample] = useState<SampleBlueprint>(SAMPLE_BLUEPRINTS[0]);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<PlanRecognitionResult>(
    SAMPLE_BLUEPRINTS[0].result
  );

  // Calibration Controls
  const [referenceSpanMeters, setReferenceSpanMeters] = useState<number>(
    SAMPLE_BLUEPRINTS[0].defaultScaleMeters
  );
  const [wallHeightMeters, setWallHeightMeters] = useState<number>(2.6);
  const [wallThicknessMeters, setWallThicknessMeters] = useState<number>(0.15);
  const [showWireframeOverlay, setShowWireframeOverlay] = useState<boolean>(true);
  const [isExtruding, setIsExtruding] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // When sample blueprint changes
  const handleSelectSample = (sample: SampleBlueprint) => {
    triggerHaptic('light');
    setSelectedSample(sample);
    setRecognitionResult(sample.result);
    setReferenceSpanMeters(sample.defaultScaleMeters);
    setWallHeightMeters(sample.result.suggestedHeight);
    setUploadedImageSrc(null);
  };

  // Handle uploaded blueprint image file
  const handleImageUpload = (file: File) => {
    triggerHaptic('medium');
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      setUploadedImageSrc(src);
      try {
        const detected = await analyzeFloorPlanImage(src, referenceSpanMeters, 80);
        setRecognitionResult(detected);
        setWallHeightMeters(detected.suggestedHeight);
        playMeshDetect();
        triggerHaptic('selection');
      } catch (err) {
        console.error('Plan recognition error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Redo recognition when reference span scale slider changes on uploaded images
  useEffect(() => {
    if (uploadedImageSrc && !isAnalyzing) {
      const timeout = setTimeout(async () => {
        try {
          const detected = await analyzeFloorPlanImage(
            uploadedImageSrc,
            referenceSpanMeters,
            80
          );
          setRecognitionResult(detected);
        } catch {}
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [referenceSpanMeters, uploadedImageSrc]);

  // Render Blueprint Wireframe onto Preview Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark grid background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Architectural grid pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // If an image was uploaded, draw it with opacity
    if (uploadedImageSrc) {
      const img = new Image();
      img.src = uploadedImageSrc;
      if (img.complete) {
        ctx.globalAlpha = 0.45;
        const scale = Math.min(width / img.width, height / img.height) * 0.9;
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1.0;
      }
    }

    if (!showWireframeOverlay) return;

    // Calculate bounding box of detected walls to fit nicely
    const walls = recognitionResult.walls;
    if (walls.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    walls.forEach((w) => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.z, w.end.z);
      maxZ = Math.max(maxZ, w.start.z, w.end.z);
    });

    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const padding = 45;
    const availW = width - padding * 2;
    const availH = height - padding * 2;
    const scale = Math.min(availW / spanX, availH / spanZ);

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const toScreenX = (x: number) => width / 2 + (x - centerX) * scale;
    const toScreenY = (z: number) => height / 2 + (z - centerZ) * scale;

    // 1. Draw detected furniture bounding boxes
    recognitionResult.items.forEach((item) => {
      const ix = toScreenX(item.position.x);
      const iy = toScreenY(item.position.z);
      const iw = item.dimensions.width * scale;
      const ih = item.dimensions.depth * scale;

      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(item.rotation.yaw);

      // Box fill and border
      ctx.fillStyle = 'rgba(99, 102, 241, 0.18)';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-iw / 2, -ih / 2, iw, ih);
      ctx.fillRect(-iw / 2, -ih / 2, iw, ih);

      // Label
      ctx.fillStyle = '#c7d2fe';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(item.name.split(' ')[0], 0, 3);
      ctx.restore();
    });

    // 2. Draw detected walls
    walls.forEach((wall) => {
      const sx = toScreenX(wall.start.x);
      const sy = toScreenY(wall.start.z);
      const ex = toScreenX(wall.end.x);
      const ey = toScreenY(wall.end.z);

      // Wall shadow / glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Main Cyan Wall Stroke
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // End Joint Vertices
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.5;
      [
        { x: sx, y: sy },
        { x: ex, y: ey }
      ].forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 3. Draw Door & Window Openings along the wall
      const wallLen = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
      if (wallLen > 0 && wall.openings && wall.openings.length > 0) {
        wall.openings.forEach((op) => {
          const ratio = op.offset / wallLen;
          const opX = sx + (ex - sx) * ratio;
          const opY = sy + (ey - sy) * ratio;

          if (op.type === 'door') {
            // Door Opening Cut: Green dot and swing arc
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(opX, opY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Swing Arc representation
            ctx.strokeStyle = '#86efac';
            ctx.setLineDash([2, 2]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(opX, opY, op.width * scale * 0.8, 0, Math.PI / 2);
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            // Window Opening Cut: Amber line
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(opX, opY, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    });

    // 4. Calibration Caliper Graphic at bottom
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    const caliperY = height - 16;
    const caliperW = scale * 2.0; // 2 meters bar
    const caliperX = 24;

    ctx.beginPath();
    ctx.moveTo(caliperX, caliperY - 4);
    ctx.lineTo(caliperX, caliperY + 4);
    ctx.moveTo(caliperX, caliperY);
    ctx.lineTo(caliperX + caliperW, caliperY);
    ctx.moveTo(caliperX + caliperW, caliperY - 4);
    ctx.lineTo(caliperX + caliperW, caliperY + 4);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Scale Reference: 2.0m`, caliperX + caliperW + 8, caliperY + 3);
  }, [recognitionResult, uploadedImageSrc, showWireframeOverlay]);

  // Commit and Extrude 2D Plan into 3D Dollhouse
  const handleExtrudeTo3D = () => {
    setIsExtruding(true);
    triggerHaptic('heavy');

    setTimeout(() => {
      // 1. Clear existing canvas / scene
      clearRoom();

      // 2. Set room metadata
      setRoomName(recognitionResult.roomName || 'Extruded 3D Room');
      setCeilingHeight(wallHeightMeters);

      // 3. Map detected wall segments to parametric walls
      recognitionResult.walls.forEach((w, idx) => {
        const newWall: Wall = {
          id: `wall-extruded-${Date.now()}-${idx}`,
          name: `Extruded Wall ${idx + 1}`,
          start: { x: Number(w.start.x.toFixed(3)), z: Number(w.start.z.toFixed(3)) },
          end: { x: Number(w.end.x.toFixed(3)), z: Number(w.end.z.toFixed(3)) },
          height: wallHeightMeters,
          thickness: wallThicknessMeters,
          openings: (w.openings || []).map((op, oIdx) => ({
            id: `op-extruded-${Date.now()}-${idx}-${oIdx}`,
            type: op.type,
            offset: Number(op.offset.toFixed(2)),
            width: Number(op.width.toFixed(2)),
            height: Number(op.height.toFixed(2)),
            elevation: Number(op.elevation.toFixed(2)),
            swingDirection: op.swingDirection
          }))
        };
        addWall(newWall);
      });

      // 4. Map detected furniture items to RoomObjects
      recognitionResult.items.forEach((item, idx) => {
        const newObj: RoomObject = {
          id: `obj-extruded-${Date.now()}-${idx}`,
          category: item.category,
          type: item.type,
          name: item.name,
          position: {
            x: Number(item.position.x.toFixed(3)),
            y: 0,
            z: Number(item.position.z.toFixed(3))
          },
          dimensions: {
            width: Number(item.dimensions.width.toFixed(2)),
            depth: Number(item.dimensions.depth.toFixed(2)),
            height: Number(item.dimensions.height.toFixed(2))
          },
          rotation: { yaw: item.rotation.yaw },
          confidence: 'high',
          materialStyle: 'natural_oak'
        };
        addObject(newObj);
      });

      // 5. Switch directly to 3D Dollhouse view
      setRenderStyle('dollhouse');
      setViewMode('3d');

      // 6. Play audio chime & haptic feedback
      playScanComplete();
      triggerHaptic('heavy');
      setIsExtruding(false);
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  const totalOpenings = recognitionResult.walls.reduce(
    (acc, w) => acc + (w.openings?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-2xl animate-fade-in select-none">
      <div className="vision-panel rounded-3xl border border-white/20 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/30 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-display">
                  2D Plan → 3D Model Extruder
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full font-mono-digits">
                  Auto-Detect
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transform blueprint drawings, scans, or photos into parametric 3D Apple Dollhouse rooms
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Navigation Tabs */}
        <div className="flex items-center gap-2 p-2 border-b border-white/10 bg-black/20">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('samples');
              handleSelectSample(SAMPLE_BLUEPRINTS[0]);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'samples'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg vision-glow-cyan'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Sample Architectural Plans</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('upload');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg vision-glow-cyan'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Image or Take Photo</span>
          </button>
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: SAMPLE BLUEPRINTS CAROUSEL */}
          {activeTab === 'samples' && (
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
                Select Architectural Floor Plan Template:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_BLUEPRINTS.map((sample) => {
                  const isSelected = selectedSample.id === sample.id;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400/80 shadow-lg shadow-cyan-500/20 vision-glow-cyan'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-display">
                          {sample.name}
                        </span>
                        <span className="text-[10px] font-mono-digits px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {sample.areaLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {sample.description}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-400 font-mono-digits">
                        <span>{sample.result.walls.length} Walls</span>
                        <span>•</span>
                        <span>{sample.result.items.length} Furniture</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE / CAMERA CAPTURE */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* File Upload Drop Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
                >
                  <Upload className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform mb-2" />
                  <div className="text-xs font-bold text-white">Choose Blueprint Image</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, Blueprint scans or sketches</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </div>

                {/* Mobile Camera Shutter for Instant Floor Plan Snap */}
                <div
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
                >
                  <Camera className="w-7 h-7 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                  <div className="text-xs font-bold text-white">Snap Photo with Camera</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Capture printed drawings from desk or wall</div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </div>
              </div>

              {isAnalyzing && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center gap-2 text-cyan-300 text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing blueprint lines, detecting room boundaries and door openings...</span>
                </div>
              )}
            </div>
          )}

          {/* INTERACTIVE BLUEPRINT PREVIEW & CALIBRATION STAGE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  2D Detection Overlay & Calibration
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowWireframeOverlay((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                  showWireframeOverlay
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showWireframeOverlay ? 'Overlays Visible' : 'Overlays Hidden'}</span>
              </button>
            </div>

            {/* Interactive Canvas Viewport */}
            <div className="relative w-full h-60 sm:h-72 rounded-2xl overflow-hidden border border-white/15 shadow-inner bg-slate-950 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full h-full object-contain"
              />

              {/* Overlaid Detection Legend */}
              <div className="absolute top-2.5 right-2.5 p-2 bg-slate-950/80 backdrop-blur-md rounded-xl border border-white/15 flex flex-col gap-1 text-[10px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span>Walls ({recognitionResult.walls.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Doors / Swings</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Windows</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <span>Furniture ({recognitionResult.items.length})</span>
                </div>
              </div>
            </div>

            {/* Scale Calibrator & Parametric Adjusters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              {/* Reference Span Caliper */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Reference Scale Span:</span>
                  <span className="font-mono-digits text-cyan-400 font-bold">
                    {referenceSpanMeters.toFixed(1)} {unit}
                  </span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="16.0"
                  step="0.5"
                  value={referenceSpanMeters}
                  onChange={(e) => setReferenceSpanMeters(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="text-[10px] text-slate-400 mt-1">Calibrates overall room dimensions</div>
              </div>

              {/* Wall Height Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Extruded Wall Height:</span>
                  <span className="font-mono-digits text-cyan-400 font-bold">
                    {wallHeightMeters.toFixed(1)} {unit}
                  </span>
                </div>
                <input
                  type="range"
                  min="2.2"
                  max="3.8"
                  step="0.1"
                  value={wallHeightMeters}
                  onChange={(e) => setWallHeightMeters(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="text-[10px] text-slate-400 mt-1">Vertical extrusion ceiling height</div>
              </div>

              {/* Wall Thickness Selector */}
              <div>
                <div className="text-xs font-semibold mb-1 text-slate-300">Wall Thickness:</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '10cm', val: 0.10 },
                    { label: '15cm', val: 0.15 },
                    { label: '20cm', val: 0.20 }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => {
                        triggerHaptic('light');
                        setWallThicknessMeters(item.val);
                      }}
                      className={`py-1 rounded-lg text-xs font-mono-digits transition-all border ${
                        wallThicknessMeters === item.val
                          ? 'bg-cyan-500 text-white font-bold border-cyan-400 shadow-sm'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Interior / exterior wall gauge</div>
              </div>
            </div>

            {/* Extrusion Telemetry Overview */}
            <div className="p-3 bg-gradient-to-r from-blue-950/40 via-cyan-950/40 to-slate-950/40 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200">
                  Ready to Extrude: <strong className="text-white">{recognitionResult.walls.length} Walls</strong>,{' '}
                  <strong className="text-emerald-400">{totalOpenings} Openings</strong>,{' '}
                  <strong className="text-indigo-300">{recognitionResult.items.length} 3D Furnishings</strong>
                </span>
              </div>
              <span className="font-mono-digits text-cyan-300 font-bold">
                ≈ {recognitionResult.detectedAreaSqM} m²
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            Cancel
          </button>

          <button
            id="btn-extrude-to-3d-confirm"
            onClick={handleExtrudeTo3D}
            disabled={isExtruding || recognitionResult.walls.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-extrabold rounded-xl vision-glow-cyan transition-all active:scale-95 shadow-xl shadow-cyan-500/30 disabled:opacity-50"
          >
            {isExtruding ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extruding 3D Geometry...</span>
              </>
            ) : (
              <>
                <Box className="w-4 h-4 animate-pulse" />
                <span>Extrude to 3D Dollhouse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
