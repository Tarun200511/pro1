import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { Box, Download, Camera, Layers } from 'lucide-react';
import { ScannerOverlay } from '../scanner/ScannerOverlay';
import { DynamicIsland } from './DynamicIsland';
import { triggerHaptic } from '../../utils/sound';

interface Props {
  onOpenExportModal: () => void;
}

export const Header: React.FC<Props> = ({ onOpenExportModal }) => {
  const roomName = useRoomStore((state) => state.roomName);
  const openCameraScanner = useRoomStore((state) => state.openCameraScanner);
  const openPlan2DModal = useRoomStore((state) => state.openPlan2DModal);

  return (
    <header className="pt-[calc(var(--sat)+0.6rem)] pb-2 px-3 sm:px-5 md:h-18 md:py-0 flex items-center justify-between vision-panel border-b border-white/10 select-none z-40 relative text-white">
      {/* Brand & Room Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-600 p-0.5 shadow-xl shadow-cyan-500/20 flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-slate-950/70 rounded-[14px] flex items-center justify-center backdrop-blur-md">
            <Box className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white font-display">
              RoomPlan 3D
            </h1>
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-full font-mono-digits">
              Spatial
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium truncate max-w-[140px] md:max-w-[200px]">
            {roomName}
          </div>
        </div>
      </div>

      {/* Floating Dynamic Island Centerpiece */}
      <div className="flex-1 flex justify-center px-1 sm:px-4">
        <DynamicIsland />
      </div>

      {/* Right Action Tools: 2D->3D Extruder, Direct Camera Shutter, Templates, Export */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* 2D PLAN TO 3D EXTRUDER HERO BUTTON */}
        <button
          id="btn-plan-2d-to-3d-header"
          onClick={() => {
            triggerHaptic('medium');
            openPlan2DModal();
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-gradient-to-r from-indigo-500/30 to-purple-600/30 hover:from-indigo-500/50 hover:to-purple-600/50 border border-indigo-400/40 text-indigo-200 hover:text-white text-[11px] sm:text-xs font-bold rounded-full transition-all active:scale-95 shadow-md shadow-indigo-500/20"
          title="Extrude 2D Floor Plan Blueprint into 3D Model"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
          <span className="hidden sm:inline">2D → 3D</span>
        </button>

        {/* HERO ON-SPOT CAMERA BUTTON */}
        <button
          id="btn-onspot-camera-header"
          onClick={() => {
            triggerHaptic('heavy');
            openCameraScanner();
          }}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[11px] sm:text-xs font-bold rounded-full vision-glow-cyan transition-all active:scale-95 shadow-lg"
          title="Start Live LiDAR Camera Scan"
        >
          <Camera className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="hidden sm:inline">Camera</span>
        </button>

        {/* Presets & Simulator Trigger */}
        <ScannerOverlay />

        {/* Export 3D & Blueprint Trigger */}
        <button
          id="btn-export-menu"
          onClick={() => {
            triggerHaptic('light');
            onOpenExportModal();
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-full transition-all active:scale-95"
          title="Export USDZ, GLTF, OBJ, or Blueprint"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden md:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
