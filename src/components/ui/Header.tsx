import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { Box, Compass, Columns2, Download, Camera } from 'lucide-react';
import { ScannerOverlay } from '../scanner/ScannerOverlay';
import { triggerHaptic } from '../../utils/sound';

interface Props {
  onOpenExportModal: () => void;
}

export const Header: React.FC<Props> = ({ onOpenExportModal }) => {
  const viewMode = useRoomStore((state) => state.viewMode);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const unit = useRoomStore((state) => state.unit);
  const setUnit = useRoomStore((state) => state.setUnit);
  const roomName = useRoomStore((state) => state.roomName);
  const openCameraScanner = useRoomStore((state) => state.openCameraScanner);

  return (
    <header className="pt-[calc(var(--sat)+0.5rem)] pb-2 px-4 md:px-6 md:h-16 md:py-0 flex items-center justify-between bg-slate-900/85 backdrop-blur-2xl border-b border-white/10 select-none z-30 relative text-white">
      {/* Brand & Room Title */}
      <div className="flex items-center gap-2.5 md:gap-3.5">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-slate-950/40 rounded-[14px] flex items-center justify-center backdrop-blur-sm">
            <Box className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <h1 className="text-xs md:text-sm font-bold tracking-tight text-white">RoomPlan 3D</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] md:text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
              Mobile
            </span>
          </div>
          <div className="text-[11px] md:text-xs text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[180px]">
            {roomName}
          </div>
        </div>
      </div>

      {/* Desktop View Mode Segmented Switcher (2D Blueprint / 3D Perspective / Split) */}
      <div className="hidden md:flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl shadow-inner">
        <button
          id="btn-view-3d"
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            viewMode === '3d'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D Perspective</span>
        </button>

        <button
          id="btn-view-2d"
          onClick={() => setViewMode('2d')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            viewMode === '2d'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>2D Blueprint</span>
        </button>

        <button
          id="btn-view-split"
          onClick={() => setViewMode('split')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            viewMode === 'split'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>Split View</span>
        </button>
      </div>

      {/* Right Controls: Unit Toggle, Scanner Trigger, Export Button */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Unit Selector (Meters / Feet) */}
        <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-xl text-[11px] md:text-xs font-semibold">
          <button
            onClick={() => setUnit('m')}
            className={`px-2 md:px-2.5 py-1 rounded-lg transition-all ${
              unit === 'm' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            m
          </button>
          <button
            onClick={() => setUnit('ft')}
            className={`px-2 md:px-2.5 py-1 rounded-lg transition-all ${
              unit === 'ft' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            ft
          </button>
        </div>

        {/* DIRECT ON-SPOT CAMERA CAPTURE BUTTON */}
        <button
          id="btn-onspot-camera-header"
          onClick={() => {
            triggerHaptic('heavy');
            openCameraScanner();
          }}
          className="flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[11px] md:text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95"
        >
          <Camera className="w-3.5 h-3.5 md:w-4 md:h-4 animate-pulse text-white" />
          <span className="hidden sm:inline">On-Spot Camera</span>
          <span className="sm:hidden">Camera</span>
        </button>

        {/* Presets & Simulator Trigger */}
        <ScannerOverlay />

        {/* Export Modal Trigger */}
        <button
          id="btn-export-menu"
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold rounded-xl transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
