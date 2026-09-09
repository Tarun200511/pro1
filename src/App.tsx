import { useState, useEffect } from 'react';
import { useRoomStore } from './store/useRoomStore';
import { Header } from './components/ui/Header';
import { Toolbar } from './components/ui/Toolbar';
import { InspectorPanel } from './components/ui/InspectorPanel';
import { FurnitureDrawer } from './components/ui/FurnitureDrawer';
import { MobileBottomBar } from './components/ui/MobileBottomBar';
import { ExportModal } from './components/ui/ExportModal';
import { ThreeViewport } from './components/viewport3d/ThreeViewport';
import { FloorPlanCanvas } from './components/canvas2d/FloorPlanCanvas';
import { CameraDimensionScanner } from './components/scanner/CameraDimensionScanner';
import { Box, Compass } from 'lucide-react';

export function App() {
  const viewMode = useRoomStore((state) => state.viewMode);
  const selectedId = useRoomStore((state) => state.selectedId);
  const selectedType = useRoomStore((state) => state.selectedType);
  const removeObject = useRoomStore((state) => state.removeObject);
  const removeWall = useRoomStore((state) => state.removeWall);
  const duplicateObject = useRoomStore((state) => state.duplicateObject);
  const clearSelection = useRoomStore((state) => state.clearSelection);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const setActiveTool = useRoomStore((state) => state.setActiveTool);
  const isCameraScannerOpen = useRoomStore((state) => state.isCameraScannerOpen);
  const closeCameraScanner = useRoomStore((state) => state.closeCameraScanner);

  const [isFurnitureDrawerOpen, setIsFurnitureDrawerOpen] = useState(false);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Auto-open mobile inspector when an element is selected on mobile
  useEffect(() => {
    if (selectedId) {
      setIsMobileInspectorOpen(true);
    }
  }, [selectedId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'w' || e.key === 'W') {
        setActiveTool('wall');
      } else if (e.key === 'Escape') {
        clearSelection();
        setIsFurnitureDrawerOpen(false);
        setIsMobileInspectorOpen(false);
      }

      // Delete action
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          if (selectedType === 'object') {
            removeObject(selectedId);
          } else if (selectedType === 'wall') {
            removeWall(selectedId);
          }
        }
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedId && selectedType === 'object') {
          duplicateObject(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedType, removeObject, removeWall, duplicateObject, clearSelection, undo, redo, setActiveTool]);

  return (
    <div className="relative w-screen h-[100dvh] flex flex-col bg-[#0b0d13] text-white overflow-hidden select-none">
      {/* Top VisionOS Header */}
      <Header onOpenExportModal={() => setIsExportModalOpen(true)} />

      {/* Main Viewport Container */}
      <main className="relative flex-1 w-full h-[calc(100dvh-4rem)] overflow-hidden pb-16 md:pb-0">
        {/* 3D Mode */}
        {viewMode === '3d' && (
          <div className="w-full h-full">
            <ThreeViewport />
          </div>
        )}

        {/* 2D Mode */}
        {viewMode === '2d' && (
          <div className="w-full h-full">
            <FloorPlanCanvas />
          </div>
        )}

        {/* Synchronized Split Mode (Desktop Only) */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 w-full h-full divide-y md:divide-y-0 md:divide-x divide-white/10">
            {/* Left: 2D Floor Plan */}
            <div className="relative w-full h-full">
              <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full text-[11px] font-semibold tracking-wide text-slate-300">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>2D Architectural Blueprint</span>
              </div>
              <FloorPlanCanvas />
            </div>

            {/* Right: 3D WebGL */}
            <div className="relative w-full h-full">
              <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full text-[11px] font-semibold tracking-wide text-slate-300">
                <Box className="w-3.5 h-3.5 text-blue-400" />
                <span>3D Spatial Perspective</span>
              </div>
              <ThreeViewport />
            </div>
          </div>
        )}

        {/* Floating Left Toolbar Dock (Desktop Only) */}
        <div className="hidden md:block absolute top-4 left-4 z-30">
          <Toolbar
            onToggleFurnitureDrawer={() => setIsFurnitureDrawerOpen((prev) => !prev)}
            isFurnitureDrawerOpen={isFurnitureDrawerOpen}
          />
        </div>

        {/* Slide-out Furniture Catalog Drawer */}
        <FurnitureDrawer
          isOpen={isFurnitureDrawerOpen}
          onClose={() => setIsFurnitureDrawerOpen(false)}
        />

        {/* Floating Right Inspector Panel (Desktop floating, Mobile bottom-sheet) */}
        <div className="md:absolute md:top-4 md:right-4 z-30 pointer-events-auto">
          <InspectorPanel
            isOpenOnMobile={isMobileInspectorOpen}
            onCloseMobile={() => setIsMobileInspectorOpen(false)}
          />
        </div>
      </main>

      {/* Mobile Bottom Navigation & Quick Actions Dock */}
      <MobileBottomBar
        onToggleFurnitureDrawer={() => {
          setIsFurnitureDrawerOpen((prev) => !prev);
          if (!isFurnitureDrawerOpen) setIsMobileInspectorOpen(false);
        }}
        isFurnitureDrawerOpen={isFurnitureDrawerOpen}
        onToggleInspector={() => {
          setIsMobileInspectorOpen((prev) => !prev);
          if (!isMobileInspectorOpen) setIsFurnitureDrawerOpen(false);
        }}
        isInspectorOpen={isMobileInspectorOpen}
      />

      {/* Export & Import Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Live AR Camera Dimension & On-Spot Scanner */}
      {isCameraScannerOpen && (
        <CameraDimensionScanner
          isOpen={isCameraScannerOpen}
          onClose={closeCameraScanner}
        />
      )}
    </div>
  );
}

export default App;
