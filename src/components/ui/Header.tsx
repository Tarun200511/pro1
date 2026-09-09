import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { Box, Compass, Columns2, Download } from 'lucide-react';
import { ScannerOverlay } from '../scanner/ScannerOverlay';

interface Props {
  onOpenExportModal: () => void;
}

export const Header: React.FC<Props> = ({ onOpenExportModal }) => {
  const viewMode = useRoomStore((state) => state.viewMode);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const unit = useRoomStore((state) => state.unit);
  const setUnit = useRoomStore((state) => state.setUnit);
  const roomName = useRoomStore((state) => state.roomName);

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 select-none z-30 relative text-white">
      {/* Brand & Room Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950/40 rounded-[14px] flex items-center justify-center backdrop-blur-sm">
            <Box className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-white">RoomPlan 3D</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
              VisionOS
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium truncate max-w-[180px]">
            {roomName}
          </div>
        </div>
      </div>

      {/* View Mode Segmented Switcher (2D Blueprint / 3D Perspective / Split) */}
      <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl shadow-inner">
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
      <div className="flex items-center gap-3">
        {/* Unit Selector (Meters / Feet) */}
        <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setUnit('m')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              unit === 'm' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Meters (m)
          </button>
          <button
            onClick={() => setUnit('ft')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              unit === 'ft' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Feet (ft)
          </button>
        </div>

        {/* Apple Room Scanner Trigger */}
        <ScannerOverlay />

        {/* Export Modal Trigger */}
        <button
          id="btn-export-menu"
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold rounded-xl transition-all active:scale-95"
        >
          <Download className="w-4 h-4 text-slate-300" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
