import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useRoomStore } from '../../store/useRoomStore';
import { ROOM_PRESETS } from '../../utils/presets';
import { playLidarPulse, playMeshDetect, playScanComplete, triggerHaptic } from '../../utils/sound';
import { Scan, Sparkles, X, ChevronRight, Activity, Layers, Radio, Camera } from 'lucide-react';
import { CameraDimensionScanner } from './CameraDimensionScanner';

export const ScannerOverlay: React.FC = () => {
  const isScanning = useRoomStore((state) => state.isScanning);
  const scanProgress = useRoomStore((state) => state.scanProgress);
  const scanStage = useRoomStore((state) => state.scanStage);
  const selectedPresetId = useRoomStore((state) => state.selectedScanPreset);
  const startScanning = useRoomStore((state) => state.startScanning);
  const setScanProgress = useRoomStore((state) => state.setScanProgress);
  const finishScanning = useRoomStore((state) => state.finishScanning);
  const cancelScanning = useRoomStore((state) => state.cancelScanning);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);

  // Animate LiDAR particles and sweep laser
  useEffect(() => {
    if (!isScanning) return;
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Generate spatial points
    const points: Array<{ x: number; y: number; z: number; size: number; alpha: number }> = [];
    for (let i = 0; i < 160; i++) {
      points.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 400,
        z: Math.random() * 500,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    const render = () => {
      time += 0.025;
      const w = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
      const h = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

      ctx.clearRect(0, 0, w, h);

      // Center
      const cx = w / 2;
      const cy = h / 2;

      // Sweeping LiDAR Laser Wave (horizontal beam moving vertically)
      const beamY = cy + Math.sin(time * 2) * (h * 0.35);
      const beamGrad = ctx.createLinearGradient(0, beamY - 40, 0, beamY + 40);
      beamGrad.addColorStop(0, 'rgba(0, 122, 255, 0)');
      beamGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
      beamGrad.addColorStop(1, 'rgba(0, 122, 255, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, beamY - 40, w, 80);

      // Laser line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, beamY);
      ctx.lineTo(w, beamY);
      ctx.stroke();

      // Render 3D Point Cloud particles
      points.forEach((pt) => {
        const perspective = 400 / (400 + pt.z);
        const px = cx + pt.x * perspective;
        const py = cy + pt.y * perspective;

        // Particle pulse
        const distFromBeam = Math.abs(py - beamY);
        const isNearBeam = distFromBeam < 30;

        ctx.fillStyle = isNearBeam ? '#38bdf8' : '#3b82f6';
        ctx.globalAlpha = isNearBeam ? 1 : pt.alpha * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, isNearBeam ? pt.size * 1.5 : pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isScanning]);

  // Handle Scanning Simulation Process
  useEffect(() => {
    if (!isScanning) return;

    // Trigger initial LiDAR chirp
    playLidarPulse();

    const stages = [
      { progress: 15, stage: 'Calibrating Apple LiDAR sensor...' },
      { progress: 35, stage: 'Extracting planar surfaces & corners...' },
      { progress: 60, stage: 'Classifying wall boundaries & openings...' },
      { progress: 85, stage: 'Recognizing spatial furniture geometry...' },
      { progress: 100, stage: 'Assembling Apple RoomPlan model...' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < stages.length) {
        setScanProgress(stages[currentStep].progress, stages[currentStep].stage);
        if (currentStep % 2 === 1) {
          playMeshDetect();
        } else {
          playLidarPulse();
        }
      } else {
        clearInterval(interval);
        playScanComplete();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          finishScanning();
        }, 600);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [isScanning, setScanProgress, finishScanning]);

  return (
    <>
      {/* Top Bar Trigger Button if modal closed */}
      <button
        id="btn-scan-room"
        onClick={() => {
          triggerHaptic('light');
          setIsModalOpen(true);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] sm:text-xs font-semibold rounded-full transition-all active:scale-95"
        title="Simulated Room Scanner Presets"
      >
        <Scan className="w-3.5 h-3.5 text-slate-300" />
        <span className="hidden sm:inline">Presets</span>
      </button>

      {/* Preset Selector Modal */}
      {isModalOpen && !isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto vision-panel border border-white/15 rounded-3xl p-5 md:p-7 shadow-2xl text-white backdrop-blur-3xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 vision-glow-cyan">
                  <Scan className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight font-display">Simulated Room Scanner</h3>
                  <p className="text-xs text-slate-400">Powered by Apple RoomPlan ARKit simulation</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Camera Real Dimension Scanner Card */}
            <div className="mt-5 space-y-3">
              <div
                id="btn-open-camera-scanner"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsCameraScannerOpen(true);
                }}
                className="group relative overflow-hidden p-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/20 hover:from-blue-600/40 hover:to-indigo-600/30 border border-blue-400/50 hover:border-blue-400 rounded-2xl cursor-pointer transition-all active:scale-[0.99] shadow-lg shadow-blue-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-blue-500 text-white rounded-xl shadow-md shadow-blue-500/30">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">
                          Live Camera Dimension Scanner
                        </h4>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md">
                          Exact Scale
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-sm leading-relaxed">
                        Use your real device camera, calibrate with a known reference, pin room corners, and measure exact walls in real time.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Or Scan Procedural Presets
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {ROOM_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    setIsModalOpen(false);
                    startScanning(preset.id);
                  }}
                  className="group flex items-center justify-between p-3.5 bg-white/5 hover:bg-blue-600/15 border border-white/10 hover:border-blue-500/40 rounded-2xl cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 bg-slate-800 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold group-hover:text-blue-300 transition-colors">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-xs">{preset.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                        <span>{preset.walls.length} Walls</span>
                        <span>•</span>
                        <span>{preset.objects.length} Items</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                LiDAR Sensor Emulation Ready
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen AR Camera Viewfinder Overlay when Scanning */}
      {isScanning && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between p-6 bg-black/75 backdrop-blur-sm select-none">
          {/* LiDAR Particle Field Canvas */}
          <canvas ref={particlesCanvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />

          {/* Viewfinder Top HUD */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl shadow-xl">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div className="text-left">
                <div className="text-xs font-bold tracking-wider uppercase text-white">Apple RoomPlan AR</div>
                <div className="text-[10px] text-slate-400 font-mono">LiDAR Precision • 60 FPS</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-300 px-4 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                <span>Confidence: 99.2%</span>
              </div>
              <span>|</span>
              <span>Distance: 2.1m</span>
            </div>

            <button
              onClick={cancelScanning}
              className="p-2.5 bg-slate-900/80 hover:bg-white/20 backdrop-blur-xl border border-white/15 rounded-2xl text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder Center Reticle & Corner Brackets */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto pointer-events-none">
            <div className="relative w-80 h-80 sm:w-96 sm:h-96 border border-white/15 rounded-3xl flex items-center justify-center">
              {/* Corner Tracking Brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-2xl"></div>

              {/* Center Crosshair */}
              <div className="w-6 h-6 border border-blue-400/80 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              </div>

              {/* Surface Tracking Guide */}
              <div className="absolute -bottom-10 text-center">
                <span className="text-xs font-medium tracking-wide uppercase px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30 backdrop-blur-md">
                  Scanning Vertical & Horizontal Planes
                </span>
              </div>
            </div>
          </div>

          {/* Viewfinder Bottom Progress HUD */}
          <div className="relative z-10 max-w-md mx-auto w-full bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                {scanStage}
              </span>
              <span className="font-mono font-bold text-blue-400">{scanProgress}%</span>
            </div>

            {/* Apple Style Progress Bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>Preset: {ROOM_PRESETS.find((p) => p.id === selectedPresetId)?.name || 'Custom'}</span>
              <span className="text-blue-400">Synthesizing USDZ Mesh...</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Real Dimension AR Scanner */}
      <CameraDimensionScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
      />
    </>
  );
};
