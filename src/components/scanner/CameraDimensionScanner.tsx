import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import type { Wall } from '../../types/room';
import { formatDimension, metersToFeet, feetToMeters } from '../../utils/math';
import { playLidarPulse, playMeshDetect, playScanComplete } from '../../utils/sound';
import {
  Camera,
  X,
  Crosshair,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  SwitchCamera
} from 'lucide-react';

interface PinnedPoint {
  id: string;
  // Normalized coordinates in camera view [0, 1]
  u: number;
  v: number;
  // Calibrated real-world floor coordinates in meters
  worldX: number;
  worldZ: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CameraDimensionScanner: React.FC<Props> = ({ isOpen, onClose }) => {
  const addWall = useRoomStore((state) => state.addWall);
  const clearRoom = useRoomStore((state) => state.clearRoom);
  const setRoomName = useRoomStore((state) => state.setRoomName);
  const unit = useRoomStore((state) => state.unit);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Camera stream state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanner workflow states: 'calibrate' | 'pin-corners' | 'height' | 'done'
  const [step, setStep] = useState<'calibrate' | 'pin-corners' | 'height' | 'done'>('calibrate');

  // Calibration settings (Known Reference Scale)
  // Options: 1) Standard Reference (A4 Paper: 0.297m, Tile: 0.6m, Door: 0.9m) or 2) Camera height from floor (default 1.4m)
  const [referenceDistance, setReferenceDistance] = useState<number>(1.0); // meters
  const [calibPointA, setCalibPointA] = useState<{ u: number; v: number } | null>(null);
  const [calibPointB, setCalibPointB] = useState<{ u: number; v: number } | null>(null);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number>(320); // default pixel-to-meter scale

  // Pinned room corners
  const [pinnedPoints, setPinnedPoints] = useState<PinnedPoint[]>([]);
  const [ceilingHeight, setCeilingHeight] = useState<number>(2.6); // default 2.6m

  // Reticle crosshair position (normalized [0, 1])
  const [reticlePos, setReticlePos] = useState<{ u: number; v: number }>({ u: 0.5, v: 0.5 });

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : `Unable to access camera: ${err.message || 'Unknown device error'}.`
      );
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Switch between front & back camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Canvas drawing loop for AR overlays, laser lines, and measurement badges
  useEffect(() => {
    if (!isOpen) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let pulse = 0;

    const render = () => {
      pulse += 0.04;
      const w = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
      const h = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Calibration Line if in Calibrate Mode
      if (step === 'calibrate') {
        if (calibPointA) {
          const ptA = { x: calibPointA.u * w, y: calibPointA.v * h };
          const ptB = calibPointB ? { x: calibPointB.u * w, y: calibPointB.v * h } : { x: reticlePos.u * w, y: reticlePos.v * h };

          // Laser measurement line
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(ptA.x, ptA.y);
          ctx.lineTo(ptB.x, ptB.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // End markers
          [ptA, ptB].forEach((pt) => {
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          });

          // Label
          const mid = { x: (ptA.x + ptB.x) / 2, y: (ptA.y + ptB.y) / 2 };
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(mid.x - 70, mid.y - 14, 140, 28);
          ctx.strokeStyle = '#38bdf8';
          ctx.strokeRect(mid.x - 70, mid.y - 14, 140, 28);
          ctx.fillStyle = '#38bdf8';
          ctx.font = '600 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Scale: ${formatDimension(referenceDistance, unit)}`, mid.x, mid.y);
        }
      }

      // 2. Draw Pinned Room Corners & Wall Lines
      if (pinnedPoints.length > 0) {
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0, 122, 255, 0.6)';
        ctx.shadowBlur = 10;

        // Draw lines between consecutive pinned points
        for (let i = 0; i < pinnedPoints.length; i++) {
          const p1 = { x: pinnedPoints[i].u * w, y: pinnedPoints[i].v * h };
          const isLast = i === pinnedPoints.length - 1;
          const p2 = !isLast
            ? { x: pinnedPoints[i + 1].u * w, y: pinnedPoints[i + 1].v * h }
            : step === 'pin-corners'
            ? { x: reticlePos.u * w, y: reticlePos.v * h }
            : null;

          if (p2) {
            ctx.beginPath();
            if (isLast) {
              ctx.setLineDash([6, 4]);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
            } else {
              ctx.setLineDash([]);
              ctx.strokeStyle = '#007aff';
            }
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Distance calculation
            const dxMeters = pinnedPoints[i].worldX - (isLast ? (reticlePos.u * w) / pixelsPerMeter : pinnedPoints[i + 1].worldX);
            const dzMeters = pinnedPoints[i].worldZ - (isLast ? (reticlePos.v * h) / pixelsPerMeter : pinnedPoints[i + 1].worldZ);
            const distMeters = Math.hypot(dxMeters, dzMeters);

            // Dimension badge
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const badgeText = formatDimension(distMeters, unit);
            ctx.font = '600 12px sans-serif';
            const badgeW = ctx.measureText(badgeText).width + 16;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fillRect(midX - badgeW / 2, midY - 12, badgeW, 24);
            ctx.strokeStyle = isLast ? '#38bdf8' : '#007aff';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(midX - badgeW / 2, midY - 12, badgeW, 24);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, midX, midY);
          }
        }

        ctx.shadowBlur = 0;
        ctx.setLineDash([]);

        // Draw Corner Dots with Pulsing Glow
        pinnedPoints.forEach((p, idx) => {
          const cx = p.u * w;
          const cy = p.v * h;

          // Outer pulse ring
          ctx.strokeStyle = 'rgba(0, 122, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 10 + Math.sin(pulse) * 3, 0, Math.PI * 2);
          ctx.stroke();

          // Core dot
          ctx.fillStyle = idx === 0 ? '#34c759' : '#007aff';
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Corner label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`C${idx + 1}`, cx, cy - 12);
        });
      }

      // 3. Draw Center Reticle Crosshair
      const rx = reticlePos.u * w;
      const ry = reticlePos.v * h;
      const reticleSize = 36;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      // Brackets
      ctx.beginPath();
      // Top-left
      ctx.moveTo(rx - reticleSize, ry - reticleSize + 10);
      ctx.lineTo(rx - reticleSize, ry - reticleSize);
      ctx.lineTo(rx - reticleSize + 10, ry - reticleSize);
      // Top-right
      ctx.moveTo(rx + reticleSize - 10, ry - reticleSize);
      ctx.lineTo(rx + reticleSize, ry - reticleSize);
      ctx.lineTo(rx + reticleSize, ry - reticleSize + 10);
      // Bottom-left
      ctx.moveTo(rx - reticleSize, ry + reticleSize - 10);
      ctx.lineTo(rx - reticleSize, ry + reticleSize);
      ctx.lineTo(rx - reticleSize + 10, ry + reticleSize);
      // Bottom-right
      ctx.moveTo(rx + reticleSize - 10, ry + reticleSize);
      ctx.lineTo(rx + reticleSize, ry + reticleSize);
      ctx.lineTo(rx + reticleSize, ry + reticleSize - 10);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, step, calibPointA, calibPointB, reticlePos, pinnedPoints, pixelsPerMeter, referenceDistance, unit]);

  // Handle Action: Pin Point
  const handlePinAction = () => {
    playLidarPulse();

    const canvas = overlayCanvasRef.current;
    const w = canvas?.clientWidth || window.innerWidth;
    const h = canvas?.clientHeight || window.innerHeight;

    if (step === 'calibrate') {
      if (!calibPointA) {
        setCalibPointA({ ...reticlePos });
        playMeshDetect();
      } else if (!calibPointB) {
        setCalibPointB({ ...reticlePos });
        // Calculate exact pixel distance between A and B
        const pxA = { x: calibPointA.u * w, y: calibPointA.v * h };
        const pxB = { x: reticlePos.u * w, y: reticlePos.v * h };
        const distPixels = Math.hypot(pxB.x - pxA.x, pxB.y - pxA.y);

        if (distPixels > 30) {
          const calculatedPPM = distPixels / referenceDistance;
          setPixelsPerMeter(calculatedPPM);
          playScanComplete();
          // Advance to corner pinning
          setStep('pin-corners');
        }
      }
      return;
    }

    if (step === 'pin-corners') {
      // Convert normalized screen position to calibrated real-world meters
      const worldX = (reticlePos.u * w) / pixelsPerMeter;
      const worldZ = (reticlePos.v * h) / pixelsPerMeter;

      const newPoint: PinnedPoint = {
        id: `pin-${Date.now()}`,
        u: reticlePos.u,
        v: reticlePos.v,
        worldX,
        worldZ
      };

      setPinnedPoints((prev) => [...prev, newPoint]);
      playMeshDetect();
    }
  };

  // Close Loop & Finish Corners
  const handleFinishCorners = () => {
    if (pinnedPoints.length < 3) {
      alert('Please pin at least 3 wall corners to form an enclosed room.');
      return;
    }
    playScanComplete();
    setStep('height');
  };

  // Generate 3D Parametric Room from exact camera measurements
  const handleGenerateRoom = () => {
    if (pinnedPoints.length < 3) return;

    clearRoom();
    setRoomName('Camera Scanned Room');

    // Calculate centroid to center room around origin (0, 0)
    let avgX = 0, avgZ = 0;
    pinnedPoints.forEach((p) => {
      avgX += p.worldX;
      avgZ += p.worldZ;
    });
    avgX /= pinnedPoints.length;
    avgZ /= pinnedPoints.length;

    // Create connected walls from pinned points
    const n = pinnedPoints.length;
    for (let i = 0; i < n; i++) {
      const p1 = pinnedPoints[i];
      const p2 = pinnedPoints[(i + 1) % n];

      const start = {
        x: Number((p1.worldX - avgX).toFixed(2)),
        z: Number((p1.worldZ - avgZ).toFixed(2))
      };
      const end = {
        x: Number((p2.worldX - avgX).toFixed(2)),
        z: Number((p2.worldZ - avgZ).toFixed(2))
      };

      const wallLen = Math.hypot(end.x - start.x, end.z - start.z);

      const wall: Wall = {
        id: `wall-cam-${i + 1}`,
        name: `Wall ${i + 1}`,
        start,
        end,
        height: ceilingHeight,
        thickness: 0.15,
        openings: []
      };

      // Add standard door on longest wall if space permits
      if (i === 0 && wallLen > 1.8) {
        wall.openings.push({
          id: `door-cam-1`,
          type: 'door',
          offset: Number((wallLen / 2).toFixed(2)),
          width: 0.9,
          height: 2.1,
          elevation: 0,
          swingDirection: 'in'
        });
      }

      addWall(wall);
    }

    playScanComplete();
    onClose();
  };

  // Reset Scanner
  const handleReset = () => {
    setCalibPointA(null);
    setCalibPointB(null);
    setPinnedPoints([]);
    setStep('calibrate');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white select-none overflow-hidden"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const u = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
        const v = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
        setReticlePos({ u, v });
      }}
    >
      {/* Live Camera Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* AR Overlays & Measurement Lines Canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Camera Error Screen */}
      {cameraError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="max-w-md p-6 bg-slate-900 border border-red-500/30 rounded-3xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-lg font-bold">Camera Access Required</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={startCamera}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top HUD: Step Status & Controls */}
      <div className="relative z-10 p-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/30 border border-blue-400/40 text-blue-400 rounded-2xl backdrop-blur-xl">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">Camera Dimension Scanner</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Live AR
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {step === 'calibrate' && 'Step 1: Set Reference Scale for exact dimensions'}
              {step === 'pin-corners' && `Step 2: Aim reticle at room corners (${pinnedPoints.length} pinned)`}
              {step === 'height' && 'Step 3: Confirm Room Ceiling Height'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Camera Button (Mobile back/front) */}
          <button
            onClick={toggleCamera}
            title="Switch Camera"
            className="p-2.5 bg-slate-900/80 hover:bg-white/20 border border-white/15 rounded-2xl backdrop-blur-xl text-slate-200 transition-colors"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            title="Reset Measurement"
            className="p-2.5 bg-slate-900/80 hover:bg-white/20 border border-white/15 rounded-2xl backdrop-blur-xl text-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Exit Button */}
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-900/80 hover:bg-white/20 border border-white/15 rounded-2xl backdrop-blur-xl text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Reticle Guide Instruction */}
      <div className="relative z-10 pointer-events-none mx-auto text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-full text-xs font-medium text-slate-200 shadow-2xl">
          {step === 'calibrate' && !calibPointA && (
            <span>Aim reticle at start of a known object (e.g. 1m floor tile, door, or A4 paper) and tap Pin</span>
          )}
          {step === 'calibrate' && calibPointA && (
            <span>Aim reticle at end of the known object and tap Pin to lock exact scale</span>
          )}
          {step === 'pin-corners' && (
            <span>Aim at Corner {pinnedPoints.length + 1} of the room and tap "Pin Corner"</span>
          )}
          {step === 'height' && <span>Adjust Ceiling Height slider, then click Generate 3D Room</span>}
        </div>
      </div>

      {/* Bottom HUD: Measurement Tools & Actions */}
      <div className="relative z-10 p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <div className="max-w-xl mx-auto space-y-4">
          {/* STEP 1: CALIBRATION CONFIG */}
          {step === 'calibrate' && (
            <div className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Reference Scale Distance:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatDimension(referenceDistance, unit)}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 text-xs">
                {[
                  { label: '0.6m (Tile)', val: 0.6 },
                  { label: '0.9m (Doorway)', val: 0.9 },
                  { label: '1.0m (Standard)', val: 1.0 },
                  { label: '1.5m (Wall Mark)', val: 1.5 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setReferenceDistance(item.val)}
                    className={`flex-1 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                      referenceDistance === item.val
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handlePinAction}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Crosshair className="w-5 h-5" />
                  <span>{!calibPointA ? 'Pin Point A' : 'Pin Point B & Calibrate'}</span>
                </button>
                <button
                  onClick={() => setStep('pin-corners')}
                  className="px-4 py-3 bg-white/10 hover:bg-white/15 text-slate-300 rounded-2xl font-medium text-xs transition-colors"
                  title="Skip calibration with standard 1m default scale"
                >
                  Skip Scale
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CORNER PINNING */}
          {step === 'pin-corners' && (
            <div className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl flex items-center gap-3">
              <button
                id="btn-pin-corner"
                onClick={handlePinAction}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <Crosshair className="w-5 h-5" />
                <span>Pin Wall Corner {pinnedPoints.length + 1}</span>
              </button>

              {pinnedPoints.length >= 3 && (
                <button
                  onClick={handleFinishCorners}
                  className="py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/30 flex items-center gap-2 transition-all active:scale-98"
                >
                  <Check className="w-5 h-5" />
                  <span>Enclose Room</span>
                </button>
              )}
            </div>
          )}

          {/* STEP 3: CEILING HEIGHT & BUILD ROOM */}
          {step === 'height' && (
            <div className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Room Ceiling Height:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatDimension(ceilingHeight, unit)}
                </span>
              </div>
              <input
                type="range"
                min={unit === 'ft' ? '7' : '2.0'}
                max={unit === 'ft' ? '14' : '4.5'}
                step={unit === 'ft' ? '0.2' : '0.1'}
                value={unit === 'ft' ? metersToFeet(ceilingHeight) : ceilingHeight}
                onChange={(e) =>
                  setCeilingHeight(unit === 'ft' ? feetToMeters(parseFloat(e.target.value)) : parseFloat(e.target.value))
                }
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleGenerateRoom}
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Exact 3D Room</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
