import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import type { Wall } from '../../types/room';
import { snapToGrid, distance2D, angle2D, formatDimension, formatArea, calculateRoomArea } from '../../utils/math';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface DragState {
  type: 'wall-start' | 'wall-end' | 'wall-body' | 'object' | 'object-rotate' | 'pan';
  targetId: string;
  startX: number;
  startY: number;
  initialPos?: { x: number; z: number };
  initialRotation?: number;
}

export const FloorPlanCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store state
  const walls = useRoomStore((state) => state.walls);
  const objects = useRoomStore((state) => state.objects);
  const selectedId = useRoomStore((state) => state.selectedId);
  const selectedType = useRoomStore((state) => state.selectedType);
  const activeTool = useRoomStore((state) => state.activeTool);
  const gridSnap = useRoomStore((state) => state.gridSnap);
  const unit = useRoomStore((state) => state.unit);
  const selectElement = useRoomStore((state) => state.selectElement);
  const clearSelection = useRoomStore((state) => state.clearSelection);
  const updateWall = useRoomStore((state) => state.updateWall);
  const addWall = useRoomStore((state) => state.addWall);
  const updateObject = useRoomStore((state) => state.updateObject);
  const setActiveTool = useRoomStore((state) => state.setActiveTool);

  // Canvas Viewport transform (pan & zoom)
  const [zoom, setZoom] = useState<number>(65); // pixels per meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive interaction states
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [wallDraftStart, setWallDraftStart] = useState<{ x: number; z: number } | null>(null);
  const [hoveredEndpoint, setHoveredEndpoint] = useState<{ wallId: string; point: 'start' | 'end' } | null>(null);

  // Convert World Coordinates (meters) to Canvas Coordinates (pixels)
  const worldToCanvas = useCallback(
    (wx: number, wz: number, width: number, height: number) => {
      const cx = width / 2 + pan.x + wx * zoom;
      const cy = height / 2 + pan.y + wz * zoom;
      return { x: cx, y: cy };
    },
    [pan, zoom]
  );

  // Convert Canvas Coordinates (pixels) to World Coordinates (meters)
  const canvasToWorld = useCallback(
    (cx: number, cy: number, width: number, height: number) => {
      const wx = (cx - width / 2 - pan.x) / zoom;
      const wz = (cy - height / 2 - pan.y) / zoom;
      return { x: wx, z: wz };
    },
    [pan, zoom]
  );

  // Center view on room
  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(65);
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Blueprint Background
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, width, height);

    // 2. Architectural Grid
    const meterStep = 1.0; // 1m major lines
    const subStep = 0.1; // 0.1m minor lines
    const topLeft = canvasToWorld(0, 0, width, height);
    const bottomRight = canvasToWorld(width, height, width, height);

    // Minor 0.1m grid (only when zoomed in enough)
    if (zoom > 40) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      const startSubX = Math.floor(topLeft.x / subStep) * subStep;
      const endSubX = Math.ceil(bottomRight.x / subStep) * subStep;
      const startSubZ = Math.floor(topLeft.z / subStep) * subStep;
      const endSubZ = Math.ceil(bottomRight.z / subStep) * subStep;

      ctx.beginPath();
      for (let x = startSubX; x <= endSubX; x += subStep) {
        const p1 = worldToCanvas(x, topLeft.z, width, height);
        const p2 = worldToCanvas(x, bottomRight.z, width, height);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      for (let z = startSubZ; z <= endSubZ; z += subStep) {
        const p1 = worldToCanvas(topLeft.x, z, width, height);
        const p2 = worldToCanvas(bottomRight.x, z, width, height);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();
    }

    // Major 1m grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1;
    const startX = Math.floor(topLeft.x / meterStep) * meterStep;
    const endX = Math.ceil(bottomRight.x / meterStep) * meterStep;
    const startZ = Math.floor(topLeft.z / meterStep) * meterStep;
    const endZ = Math.ceil(bottomRight.z / meterStep) * meterStep;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += meterStep) {
      const p1 = worldToCanvas(x, topLeft.z, width, height);
      const p2 = worldToCanvas(x, bottomRight.z, width, height);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    for (let z = startZ; z <= endZ; z += meterStep) {
      const p1 = worldToCanvas(topLeft.x, z, width, height);
      const p2 = worldToCanvas(bottomRight.x, z, width, height);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // Origin crosshair (0,0)
    const origin = worldToCanvas(0, 0, width, height);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.x - 12, origin.y);
    ctx.lineTo(origin.x + 12, origin.y);
    ctx.moveTo(origin.x, origin.y - 12);
    ctx.lineTo(origin.x, origin.y + 12);
    ctx.stroke();

    // 3. Room Interior Fill (Semi-transparent tone for enclosed floor)
    if (walls.length >= 3) {
      ctx.beginPath();
      walls.forEach((w, idx) => {
        const p = worldToCanvas(w.start.x, w.start.z, width, height);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fill();
    }

    // 4. Render Furniture Objects
    objects.forEach((obj) => {
      const isSelected = selectedId === obj.id && selectedType === 'object';
      const p = worldToCanvas(obj.position.x, obj.position.z, width, height);
      const wPx = obj.dimensions.width * zoom;
      const dPx = obj.dimensions.depth * zoom;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-obj.rotation.yaw); // match 3D rotation orientation

      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // Object Body Fill
      ctx.fillStyle = isSelected ? '#1e293b' : '#141a24';
      ctx.strokeStyle = isSelected ? '#007aff' : '#475569';
      ctx.lineWidth = isSelected ? 2 : 1.2;

      // Rounded rectangle body
      const r = 4;
      ctx.beginPath();
      ctx.roundRect(-wPx / 2, -dPx / 2, wPx, dPx, r);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';

      // Architectural Furniture Details inside 2D CAD symbol
      ctx.strokeStyle = isSelected ? 'rgba(0, 122, 255, 0.5)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      if (obj.type === 'sofa') {
        // Backrest line
        ctx.strokeRect(-wPx / 2 + 4, -dPx / 2 + 4, wPx - 8, dPx * 0.28);
        // Armrests
        ctx.strokeRect(-wPx / 2 + 4, -dPx / 2 + 4, wPx * 0.14, dPx - 8);
        ctx.strokeRect(wPx / 2 - 4 - wPx * 0.14, -dPx / 2 + 4, wPx * 0.14, dPx - 8);
      } else if (obj.type === 'bed') {
        // Pillows
        const pillowW = (wPx - 16) / 2;
        const pillowH = dPx * 0.22;
        ctx.strokeRect(-wPx / 2 + 6, -dPx / 2 + 6, pillowW, pillowH);
        ctx.strokeRect(6, -dPx / 2 + 6, pillowW, pillowH);
        // Folded Duvet Line
        ctx.beginPath();
        ctx.moveTo(-wPx / 2 + 4, dPx * 0.1);
        ctx.lineTo(wPx / 2 - 4, dPx * 0.1);
        ctx.stroke();
      } else if (obj.type === 'tv') {
        // Screen edge
        ctx.strokeRect(-wPx / 2 + 2, -dPx / 2 + 2, wPx - 4, 3);
      } else if (obj.type === 'dining_table' || obj.type === 'desk') {
        // Subtle diagonal corner accents
        ctx.strokeRect(-wPx / 2 + 3, -dPx / 2 + 3, wPx - 6, dPx - 6);
      }

      // Front directional indicator tick
      ctx.fillStyle = isSelected ? '#007aff' : '#64748b';
      ctx.beginPath();
      ctx.arc(0, dPx / 2 + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Furniture Name Label
      ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.name, 0, 0);

      // Rotation Handle when Selected
      if (isSelected) {
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, dPx / 2);
        ctx.lineTo(0, dPx / 2 + 22);
        ctx.stroke();

        ctx.fillStyle = '#007aff';
        ctx.beginPath();
        ctx.arc(0, dPx / 2 + 22, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    });

    // 5. Render Walls
    walls.forEach((wall) => {
      const isSelected = selectedId === wall.id && selectedType === 'wall';
      const p1 = worldToCanvas(wall.start.x, wall.start.z, width, height);
      const p2 = worldToCanvas(wall.end.x, wall.end.z, width, height);
      const len = distance2D(wall.start, wall.end);
      const angle = angle2D(wall.start, wall.end);
      const wallThickPx = (wall.thickness || 0.15) * zoom;

      ctx.save();
      ctx.translate(p1.x, p1.y);
      ctx.rotate(angle);

      // Wall Main Core (Solid White/Slate Architectural Wall)
      ctx.fillStyle = isSelected ? '#3b82f6' : '#f8fafc';
      ctx.fillRect(0, -wallThickPx / 2, len * zoom, wallThickPx);

      // Wall Outer Outlines
      ctx.strokeStyle = isSelected ? '#60a5fa' : '#334155';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0, -wallThickPx / 2, len * zoom, wallThickPx);

      // Render Openings on Wall (Doors & Windows)
      wall.openings.forEach((op) => {
        const opX = (op.offset - op.width / 2) * zoom;
        const opWPx = op.width * zoom;

        // Clear out wall opening segment
        ctx.fillStyle = '#0f1117';
        ctx.fillRect(opX, -wallThickPx / 2 - 1, opWPx, wallThickPx + 2);

        if (op.type === 'window') {
          // Window architectural symbol (double pane)
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(opX, -wallThickPx * 0.2);
          ctx.lineTo(opX + opWPx, -wallThickPx * 0.2);
          ctx.moveTo(opX, wallThickPx * 0.2);
          ctx.lineTo(opX + opWPx, wallThickPx * 0.2);
          ctx.stroke();

          // Jamb ticks
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.strokeRect(opX, -wallThickPx / 2, opWPx, wallThickPx);
        } else if (op.type === 'door') {
          // Door leaf & swing arc
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.2;
          // Leaf
          ctx.beginPath();
          ctx.moveTo(opX, 0);
          ctx.lineTo(opX, opWPx);
          ctx.stroke();

          // 90° Swing Arc (Quarter circle)
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
          ctx.beginPath();
          ctx.arc(opX, 0, opWPx, 0, Math.PI / 2, false);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Wall Length Dimension Label
      const midXPx = (len * zoom) / 2;
      ctx.fillStyle = isSelected ? '#60a5fa' : '#cbd5e1';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Slight offset away from wall
      const labelText = formatDimension(len, unit);
      ctx.save();
      ctx.translate(midXPx, -wallThickPx / 2 - 4);
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        ctx.rotate(Math.PI);
      }
      // Text pill background
      const textMetrics = ctx.measureText(labelText);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-textMetrics.width / 2 - 4, -14, textMetrics.width + 8, 16);
      ctx.fillStyle = isSelected ? '#60a5fa' : '#e2e8f0';
      ctx.fillText(labelText, 0, 0);
      ctx.restore();

      ctx.restore();

      // Wall Endpoints (Grab Handles)
      [
        { pt: p1, name: 'start' as const },
        { pt: p2, name: 'end' as const }
      ].forEach(({ pt, name }) => {
        const isHovered = hoveredEndpoint?.wallId === wall.id && hoveredEndpoint?.point === name;
        ctx.fillStyle = isSelected || isHovered ? '#007aff' : '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    });

    // 6. Wall Drawing Draft (when activeTool === 'wall')
    if (activeTool === 'wall' && wallDraftStart) {
      const p1 = worldToCanvas(wallDraftStart.x, wallDraftStart.z, width, height);
      const p2 = worldToCanvas(mouseWorld.x, mouseWorld.z, width, height);
      const draftLen = distance2D(wallDraftStart, mouseWorld);

      // Draft line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Length indicator badge
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      ctx.fillStyle = '#3b82f6';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const draftText = formatDimension(draftLen, unit);
      const textW = ctx.measureText(draftText).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(mid.x - textW / 2 - 6, mid.y - 12, textW + 12, 24);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(mid.x - textW / 2 - 6, mid.y - 12, textW + 12, 24);
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(draftText, mid.x, mid.y);
    }
  }, [
    walls,
    objects,
    selectedId,
    selectedType,
    activeTool,
    unit,
    zoom,
    pan,
    mouseWorld,
    wallDraftStart,
    hoveredEndpoint,
    canvasToWorld,
    worldToCanvas
  ]);

  // Handle Mouse Down on 2D Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const world = canvasToWorld(cx, cy, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

    // Middle click or space+click = Pan canvas
    if (e.button === 1 || e.shiftKey) {
      setDragState({
        type: 'pan',
        targetId: '',
        startX: e.clientX,
        startY: e.clientY
      });
      return;
    }

    // 1. If Drawing Wall
    if (activeTool === 'wall') {
      const snapVal = gridSnap ? 0.1 : 0.01;
      const snappedPt = {
        x: Number(snapToGrid(world.x, snapVal).toFixed(2)),
        z: Number(snapToGrid(world.z, snapVal).toFixed(2))
      };

      if (!wallDraftStart) {
        setWallDraftStart(snappedPt);
      } else {
        // Complete current wall segment
        const dist = distance2D(wallDraftStart, snappedPt);
        if (dist > 0.3) {
          const newWall: Wall = {
            id: `wall-${Date.now()}`,
            name: `Wall ${walls.length + 1}`,
            start: wallDraftStart,
            end: snappedPt,
            height: 2.6,
            thickness: 0.15,
            openings: []
          };
          addWall(newWall);
          setWallDraftStart(snappedPt); // chain continuous walls
        }
      }
      return;
    }

    // 2. Check Click on Furniture Object or its Rotation Handle
    for (const obj of objects) {
      const isSelected = selectedId === obj.id;
      const p = worldToCanvas(obj.position.x, obj.position.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      const wPx = obj.dimensions.width * zoom;
      const dPx = obj.dimensions.depth * zoom;

      // Rotation handle check if selected
      if (isSelected) {
        const handleDist = Math.hypot(cx - p.x, cy - (p.y + dPx / 2 + 22));
        if (handleDist <= 12) {
          setDragState({
            type: 'object-rotate',
            targetId: obj.id,
            startX: cx,
            startY: cy,
            initialRotation: obj.rotation.yaw
          });
          return;
        }
      }

      // Check object bounding box
      const dx = cx - p.x;
      const dy = cy - p.y;
      // Undo rotation to check local box
      const cos = Math.cos(obj.rotation.yaw);
      const sin = Math.sin(obj.rotation.yaw);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      if (Math.abs(localX) <= wPx / 2 && Math.abs(localY) <= dPx / 2) {
        selectElement(obj.id, 'object');
        setDragState({
          type: 'object',
          targetId: obj.id,
          startX: cx,
          startY: cy,
          initialPos: { x: obj.position.x, z: obj.position.z }
        });
        return;
      }
    }

    // 3. Check Wall Endpoints
    for (const wall of walls) {
      const p1 = worldToCanvas(wall.start.x, wall.start.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      const p2 = worldToCanvas(wall.end.x, wall.end.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

      if (Math.hypot(cx - p1.x, cy - p1.y) <= 12) {
        selectElement(wall.id, 'wall');
        setDragState({
          type: 'wall-start',
          targetId: wall.id,
          startX: cx,
          startY: cy
        });
        return;
      }

      if (Math.hypot(cx - p2.x, cy - p2.y) <= 12) {
        selectElement(wall.id, 'wall');
        setDragState({
          type: 'wall-end',
          targetId: wall.id,
          startX: cx,
          startY: cy
        });
        return;
      }
    }

    // 4. Check Wall Body
    for (const wall of walls) {
      const p1 = worldToCanvas(wall.start.x, wall.start.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      const p2 = worldToCanvas(wall.end.x, wall.end.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

      // Point-to-segment distance in pixels
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0) {
        const t = Math.max(0, Math.min(1, ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const distPx = Math.hypot(cx - projX, cy - projY);

        if (distPx <= Math.max(8, (wall.thickness * zoom) / 2 + 4)) {
          selectElement(wall.id, 'wall');
          return;
        }
      }
    }

    // Clicked empty background: start pan or clear selection
    clearSelection();
    setDragState({
      type: 'pan',
      targetId: '',
      startX: e.clientX,
      startY: e.clientY
    });
  };

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const world = canvasToWorld(cx, cy, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

    const snapVal = gridSnap ? 0.1 : 0.01;
    const snappedWorld = {
      x: Number(snapToGrid(world.x, snapVal).toFixed(2)),
      z: Number(snapToGrid(world.z, snapVal).toFixed(2))
    };
    setMouseWorld(snappedWorld);

    // If Dragging
    if (dragState) {
      if (dragState.type === 'pan') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragState((prev) => (prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null));
        return;
      }

      if (dragState.type === 'object' && dragState.initialPos) {
        updateObject(dragState.targetId, {
          position: {
            x: snappedWorld.x,
            y: 0,
            z: snappedWorld.z
          }
        });
        return;
      }

      if (dragState.type === 'object-rotate') {
        const obj = objects.find((o) => o.id === dragState.targetId);
        if (obj) {
          const p = worldToCanvas(obj.position.x, obj.position.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
          const angle = Math.atan2(cy - p.y, cx - p.x);
          // Snap angle to 15 degrees if gridSnap
          const snapAngle = gridSnap ? Math.round(angle / (Math.PI / 12)) * (Math.PI / 12) : angle;
          updateObject(dragState.targetId, {
            rotation: { yaw: Number(snapAngle.toFixed(3)) }
          });
        }
        return;
      }

      if (dragState.type === 'wall-start') {
        updateWall(dragState.targetId, {
          start: snappedWorld
        });
        return;
      }

      if (dragState.type === 'wall-end') {
        updateWall(dragState.targetId, {
          end: snappedWorld
        });
        return;
      }
    }

    // Hover endpoint detection
    let foundHover: { wallId: string; point: 'start' | 'end' } | null = null;
    for (const wall of walls) {
      const p1 = worldToCanvas(wall.start.x, wall.start.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      const p2 = worldToCanvas(wall.end.x, wall.end.z, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

      if (Math.hypot(cx - p1.x, cy - p1.y) <= 12) {
        foundHover = { wallId: wall.id, point: 'start' };
        break;
      }
      if (Math.hypot(cx - p2.x, cy - p2.y) <= 12) {
        foundHover = { wallId: wall.id, point: 'end' };
        break;
      }
    }
    setHoveredEndpoint(foundHover);
  };

  // Mouse Up
  const handleMouseUp = () => {
    setDragState(null);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(25, Math.min(180, prev * zoomFactor)));
  };

  // Cancel wall draft with Escape key or double click
  const handleDoubleClick = () => {
    setWallDraftStart(null);
    setActiveTool('select');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWallDraftStart(null);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool]);

  // Compute live area of room
  const roomArea = calculateRoomArea(walls);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#0f1117]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Floating 2D Controls Pill */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1.5 bg-slate-900/75 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <button
          onClick={() => setZoom((z) => Math.min(180, z * 1.15))}
          title="Zoom In"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(25, z * 0.85))}
          title="Zoom Out"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          title="Reset Canvas View"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/15 mx-1" />

        <div className="flex items-center gap-2 px-2 text-xs font-medium text-slate-300">
          <span className="text-slate-400">Scale:</span>
          <span className="font-mono text-blue-400">{Math.round(zoom)} px/m</span>
        </div>

        {activeTool === 'wall' && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/15 text-xs text-amber-400 font-medium">
            <span>Drawing Wall (Esc or Dbl-Click to Finish)</span>
          </div>
        )}
      </div>

      {/* Blueprint Live Area Badge */}
      <div className="absolute bottom-4 left-4 pointer-events-none flex items-center gap-3 bg-slate-950/70 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400">Area:</span>
          <span className="font-semibold text-white">{formatArea(roomArea, unit)}</span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400">Walls:</span>
          <span className="font-semibold text-white">{walls.length}</span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400">Objects:</span>
          <span className="font-semibold text-white">{objects.length}</span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1 text-blue-400 font-mono text-[11px]">
          X: {mouseWorld.x.toFixed(1)}m, Z: {mouseWorld.z.toFixed(1)}m
        </div>
      </div>
    </div>
  );
};
