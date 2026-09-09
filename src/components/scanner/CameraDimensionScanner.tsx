import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import type { Wall, WallOpening, RoomObject, FurnitureType, FurnitureCategory } from '../../types/room';
import { formatDimension, metersToFeet, feetToMeters } from '../../utils/math';
import { playLidarPulse, playMeshDetect, playScanComplete, triggerHaptic } from '../../utils/sound';
import {
  Camera,
  X,
  Crosshair,
  Check,
  RotateCcw,
  Sparkles,
  SwitchCamera,
  DoorOpen,
  AppWindow,
  Box,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2
} from 'lucide-react';

interface PinnedPoint {
  id: string;
  u: number;
  v: number;
  worldX: number;
  worldZ: number;
}

interface DetectedOpening {
  id: string;
  wallIndex: number;
  type: 'door' | 'window';
  offset: number;
  width: number;
  height: number;
  elevation: number;
  swingDirection?: 'left' | 'right' | 'in' | 'out';
}

interface CapturedFurniture {
  id: string;
  type: FurnitureType;
  category: FurnitureCategory;
  name: string;
  worldX: number;
  worldZ: number;
  dimensions: { width: number; depth: number; height: number };
  rotationYaw: number;
  confidence: 'high' | 'medium';
  photoSnapshotUrl?: string;
}

import { APPLE_16_CATEGORIES, type AppleCategoryConfig } from '../../utils/appleCategories';

type ScanStage = 'floor' | 'walls' | 'openings' | 'furniture' | 'summary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CameraDimensionScanner: React.FC<Props> = ({ isOpen, onClose }) => {
  const addWall = useRoomStore((state) => state.addWall);
  const addObject = useRoomStore((state) => state.addObject);
  const clearRoom = useRoomStore((state) => state.clearRoom);
  const setRoomName = useRoomStore((state) => state.setRoomName);
  const setRenderStyle = useRoomStore((state) => state.setRenderStyle);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const setCeilingHeight = useRoomStore((state) => state.setCeilingHeight);
  const unit = useRoomStore((state) => state.unit);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera stream state
  const [, setIsStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Apple 4-Stage Workflow: floor -> walls -> openings -> furniture -> summary
  const [stage, setStage] = useState<ScanStage>('floor');

  // Calibrated scale (default ~320 px/m)
  const [pixelsPerMeter] = useState<number>(320);

  // Stage 1: Floor Corners
  const [pinnedPoints, setPinnedPoints] = useState<PinnedPoint[]>([]);

  // Stage 2: Wall Height
  const [roomHeight, setRoomHeight] = useState<number>(2.6);

  // Stage 3: Openings
  const [openings, setOpenings] = useState<DetectedOpening[]>([]);
  const [selectedWallIndex, setSelectedWallIndex] = useState<number>(0);
  const [openingOffset, setOpeningOffset] = useState<number>(1.0);
  const [openingType, setOpeningType] = useState<'door' | 'window'>('door');
  const [doorSwing, setDoorSwing] = useState<'in' | 'out' | 'left' | 'right'>('in');

  // Stage 4: Furniture Classification
  const [selectedCategory, setSelectedCategory] = useState<AppleCategoryConfig>(APPLE_16_CATEGORIES[0]);
  const [furnitureDim, setFurnitureDim] = useState<{ width: number; depth: number; height: number }>(
    APPLE_16_CATEGORIES[0].defaultDim
  );
  const [furnitureRotation, setFurnitureRotation] = useState<number>(0);
  const [capturedFurniture, setCapturedFurniture] = useState<CapturedFurniture[]>([]);

  // Reticle crosshair position (normalized [0, 1])
  const [reticlePos, setReticlePos] = useState<{ u: number; v: number }>({ u: 0.5, v: 0.5 });

  // Real-time audio/haptic guidance prompt
  const [coachingCue, setCoachingCue] = useState<string>('Scan floor plane slowly. Aim reticle at room corners.');

  // On-Spot Photo Snapshot State
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [flash, setFlash] = useState<boolean>(false);

  // Request Android OS native camera permissions via @capacitor/camera
  const requestNativeCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { Camera: CapCamera } = await import('@capacitor/camera');
      if (CapCamera) {
        const check = await CapCamera.checkPermissions();
        if (check.camera !== 'granted') {
          const res = await CapCamera.requestPermissions({ permissions: ['camera'] });
          return res.camera === 'granted';
        }
        return true;
      }
    } catch (e) {
      console.warn('Native camera permission request skipped or not in Capacitor context:', e);
    }
    return true;
  }, []);

  const takeOnSpotPhoto = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setLastSnapshot(dataUrl);

    playMeshDetect();
    triggerHaptic('heavy');
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    return dataUrl;
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Explicitly trigger Android OS system camera permission prompt
      await requestNativeCameraPermission();

      let newStream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (highResErr) {
        console.warn('High-resolution camera constraints failed, attempting fallback constraints:', highResErr);
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false
        });
      }

      streamRef.current = newStream;
      setIsStreamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      const isDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.toLowerCase().includes('permission') ||
        err.message?.toLowerCase().includes('denied');

      setCameraError(
        isDenied
          ? 'Camera permission was not granted. Tap "Grant Camera Permission" below or enable camera in your Android device settings.'
          : `Camera error: ${err.message || 'Unable to access video stream'}`
      );
    }
  }, [facingMode, requestNativeCameraPermission]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsStreamActive(false);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, startCamera]);

  const toggleCamera = () => {
    triggerHaptic('light');
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Keep furniture dimensions in sync with selected category
  const handleSelectCategory = (cat: AppleCategoryConfig) => {
    triggerHaptic('selection');
    setSelectedCategory(cat);
    setFurnitureDim(cat.defaultDim);
  };

  // Auto-detect floor perimeter preset helper (simulated rapid LiDAR perimeter scan)
  const handleAutoDetectPerimeter = () => {
    triggerHaptic('medium');
    playLidarPulse();
    const pts: PinnedPoint[] = [
      { id: 'p1', u: 0.28, v: 0.72, worldX: -2.0, worldZ: -1.8 },
      { id: 'p2', u: 0.72, v: 0.72, worldX: 2.0, worldZ: -1.8 },
      { id: 'p3', u: 0.78, v: 0.38, worldX: 2.0, worldZ: 1.8 },
      { id: 'p4', u: 0.22, v: 0.38, worldX: -2.0, worldZ: 1.8 }
    ];
    setPinnedPoints(pts);
    playScanComplete();
    setCoachingCue('Perimeter locked: 4 walls identified. Tap Calibrate Walls to proceed.');
  };

  // Canvas drawing loop: renders spatial LiDAR point field, wireframe walls, and 3D AR isometric bounding boxes
  useEffect(() => {
    if (!isOpen) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let pulse = 0;

    // Simulated LiDAR spatial particles
    const particleCount = 42;
    const particles = Array.from({ length: particleCount }, (_, idx) => ({
      x: 0.15 + (idx % 7) * 0.12 + (Math.random() - 0.5) * 0.05,
      y: 0.35 + Math.floor(idx / 7) * 0.1 + (Math.random() - 0.5) * 0.05,
      phase: Math.random() * Math.PI * 2,
      speed: 0.03 + Math.random() * 0.04
    }));

    const render = () => {
      pulse += 0.04;
      const w = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
      const h = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

      ctx.clearRect(0, 0, w, h);

      // 1. Apple LiDAR Sweeping Particle Field (Floors & Walls)
      if (stage === 'floor' || stage === 'walls') {
        particles.forEach((p) => {
          const px = p.x * w;
          const py = p.y * h + Math.sin(pulse * p.speed * 20 + p.phase) * 6;
          const alpha = 0.35 + Math.sin(pulse * 2 + p.phase) * 0.3;
          ctx.fillStyle = `rgba(0, 240, 255, ${Math.max(0.08, alpha)})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. Render Pinned Floor Perimeter & Wall Outlines
      if (pinnedPoints.length > 0) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
        ctx.shadowBlur = 10;

        for (let i = 0; i < pinnedPoints.length; i++) {
          const p1 = { x: pinnedPoints[i].u * w, y: pinnedPoints[i].v * h };
          const isLast = i === pinnedPoints.length - 1;
          const p2 = !isLast
            ? { x: pinnedPoints[i + 1].u * w, y: pinnedPoints[i + 1].v * h }
            : stage === 'floor'
            ? { x: reticlePos.u * w, y: reticlePos.v * h }
            : { x: pinnedPoints[0].u * w, y: pinnedPoints[0].v * h };

          if (p2) {
            ctx.beginPath();
            if (isLast && stage === 'floor') {
              ctx.setLineDash([8, 6]);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
            } else {
              ctx.setLineDash([]);
              ctx.strokeStyle = '#00f0ff';
            }
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Calculate length in meters
            const nextPt = !isLast ? pinnedPoints[i + 1] : pinnedPoints[0];
            const dx = pinnedPoints[i].worldX - (isLast && stage === 'floor' ? (reticlePos.u * w) / pixelsPerMeter : nextPt.worldX);
            const dz = pinnedPoints[i].worldZ - (isLast && stage === 'floor' ? (reticlePos.v * h) / pixelsPerMeter : nextPt.worldZ);
            const distMeters = Math.hypot(dx, dz);

            // Dimension Badge
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const badgeText = formatDimension(distMeters, unit);

            ctx.font = '600 11px monospace';
            const badgeW = ctx.measureText(badgeText).width + 16;
            ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
            ctx.fillRect(midX - badgeW / 2, midY - 11, badgeW, 22);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(midX - badgeW / 2, midY - 11, badgeW, 22);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, midX, midY);
          }
        }

        ctx.shadowBlur = 0;
        ctx.setLineDash([]);

        // Pinned Floor Corner Nodes
        pinnedPoints.forEach((p, idx) => {
          const cx = p.u * w;
          const cy = p.v * h;

          ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 11 + Math.sin(pulse + idx) * 3, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = idx === 0 ? '#34c759' : '#00f0ff';
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`C${idx + 1}`, cx, cy - 10);
        });

        // 3. Extruded 3D Wall Preview in 'walls' & 'openings' stage
        if ((stage === 'walls' || stage === 'openings') && pinnedPoints.length >= 3) {
          const wallHeightPx = roomHeight * (pixelsPerMeter * 0.35);
          for (let i = 0; i < pinnedPoints.length; i++) {
            const nextIdx = (i + 1) % pinnedPoints.length;
            const b1 = { x: pinnedPoints[i].u * w, y: pinnedPoints[i].v * h };
            const b2 = { x: pinnedPoints[nextIdx].u * w, y: pinnedPoints[nextIdx].v * h };
            const t1 = { x: b1.x, y: b1.y - wallHeightPx };
            const t2 = { x: b2.x, y: b2.y - wallHeightPx };

            // Wall translucent face
            ctx.fillStyle = i === selectedWallIndex && stage === 'openings'
              ? 'rgba(0, 240, 255, 0.24)'
              : 'rgba(56, 189, 248, 0.12)';
            ctx.beginPath();
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.closePath();
            ctx.fill();

            // Wall wireframe ceiling line
            ctx.strokeStyle = i === selectedWallIndex && stage === 'openings' ? '#00f0ff' : 'rgba(0, 240, 255, 0.6)';
            ctx.lineWidth = i === selectedWallIndex && stage === 'openings' ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.moveTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.stroke();

            // Vertical corner seam
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.stroke();
          }

          // Render Openings along walls
          openings.forEach((op) => {
            const i = op.wallIndex;
            if (i < pinnedPoints.length) {
              const nextIdx = (i + 1) % pinnedPoints.length;
              const b1 = { x: pinnedPoints[i].u * w, y: pinnedPoints[i].v * h };
              const b2 = { x: pinnedPoints[nextIdx].u * w, y: pinnedPoints[nextIdx].v * h };
              const t = Math.min(0.85, Math.max(0.15, op.offset / 3.0));
              const opX = b1.x + (b2.x - b1.x) * t;
              const opY = b1.y + (b2.y - b1.y) * t;

              // Door / window opening frame
              ctx.strokeStyle = op.type === 'door' ? '#f59e0b' : '#38bdf8';
              ctx.lineWidth = 2.5;
              const frameW = 28;
              const frameH = op.type === 'door' ? 52 : 32;
              const frameY = op.type === 'door' ? opY - frameH : opY - frameH - 15;
              ctx.strokeRect(opX - frameW / 2, frameY, frameW, frameH);

              // Door swing arc
              if (op.type === 'door') {
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(opX - frameW / 2, opY, frameW, 0, Math.PI / 2);
                ctx.stroke();
                ctx.setLineDash([]);
              }

              // Label
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(op.type.toUpperCase(), opX, frameY - 6);
            }
          });
        }
      }

      // 4. Render 3D Isometric Bounding Box Overlay for Furniture (Stage 4)
      if (stage === 'furniture') {
        const rx = reticlePos.u * w;
        const ry = reticlePos.v * h;

        // Compute 3D Isometric Projection of Bounding Box
        const scale = pixelsPerMeter * 0.45;
        const bw = furnitureDim.width * scale * 0.5;
        const bd = furnitureDim.depth * scale * 0.5;
        const bh = furnitureDim.height * scale;

        // Isometric offset axes
        const isoX = Math.cos(Math.PI / 6);
        const isoY = Math.sin(Math.PI / 6);

        // 8 3D Vertices projected to 2D
        // Bottom 4: b00, b10, b11, b01
        const b0 = { x: rx - bw * isoX + bd * isoX, y: ry + bw * isoY + bd * isoY };
        const b1 = { x: rx + bw * isoX + bd * isoX, y: ry - bw * isoY + bd * isoY };
        const b2 = { x: rx + bw * isoX - bd * isoX, y: ry - bw * isoY - bd * isoY };
        const b3 = { x: rx - bw * isoX - bd * isoX, y: ry + bw * isoY - bd * isoY };

        // Top 4: elevated by bh
        const t0 = { x: b0.x, y: b0.y - bh };
        const t1 = { x: b1.x, y: b1.y - bh };
        const t2 = { x: b2.x, y: b2.y - bh };
        const t3 = { x: b3.x, y: b3.y - bh };

        // Draw translucent isometric faces
        ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
        // Top Face
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.closePath();
        ctx.fill();

        // Front Face
        ctx.beginPath();
        ctx.moveTo(b0.x, b0.y);
        ctx.lineTo(b1.x, b1.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.lineTo(t0.x, t0.y);
        ctx.closePath();
        ctx.fill();

        // Draw 12 Wireframe Edges
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
        ctx.shadowBlur = 8;

        const edges = [
          [b0, b1], [b1, b2], [b2, b3], [b3, b0], // Bottom loop
          [t0, t1], [t1, t2], [t2, t3], [t3, t0], // Top loop
          [b0, t0], [b1, t1], [b2, t2], [b3, t3]  // Vertical pillars
        ];

        edges.forEach(([pA, pB]) => {
          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.stroke();
        });

        // Glowing Spatial Corner Brackets (Apple RoomPlan style)
        [b0, b1, b2, b3, t0, t1, t2, t3].forEach((pt) => {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.shadowBlur = 0;

        // Classification Header Card above 3D Bounding Box
        const tagText = `${selectedCategory.label} • High Confidence`;
        const dimText = `${formatDimension(furnitureDim.width, unit)} × ${formatDimension(
          furnitureDim.depth,
          unit
        )} × ${formatDimension(furnitureDim.height, unit)}`;

        ctx.font = 'bold 12px sans-serif';
        const tagW = Math.max(ctx.measureText(tagText).width, ctx.measureText(dimText).width) + 24;
        const tagX = rx;
        const tagY = t2.y - 32;

        ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
        ctx.fillRect(tagX - tagW / 2, tagY, tagW, 36);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(tagX - tagW / 2, tagY, tagW, 36);

        ctx.fillStyle = '#00f0ff';
        ctx.textAlign = 'center';
        ctx.fillText(tagText, tagX, tagY + 14);

        ctx.font = '500 10px monospace';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(dimText, tagX, tagY + 28);

        // Render previously captured furniture objects
        capturedFurniture.forEach((item) => {
          const itemPx = ((item.worldX * pixelsPerMeter) / 4 + w / 2);
          const itemPy = ((item.worldZ * pixelsPerMeter) / 4 + h / 2);

          ctx.strokeStyle = 'rgba(52, 199, 89, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(itemPx - 18, itemPy - 18, 36, 36);

          ctx.fillStyle = 'rgba(52, 199, 89, 0.2)';
          ctx.fillRect(itemPx - 18, itemPy - 18, 36, 36);

          ctx.fillStyle = '#34c759';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.name, itemPx, itemPy + 4);
        });
      }

      // 5. Center Reticle Crosshair (Stages: floor, openings)
      if (stage === 'floor' || stage === 'openings') {
        const rx = reticlePos.u * w;
        const ry = reticlePos.v * h;
        const reticleSize = 34;

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;

        // Brackets
        ctx.beginPath();
        ctx.moveTo(rx - reticleSize, ry - reticleSize + 8);
        ctx.lineTo(rx - reticleSize, ry - reticleSize);
        ctx.lineTo(rx - reticleSize + 8, ry - reticleSize);

        ctx.moveTo(rx + reticleSize - 8, ry - reticleSize);
        ctx.lineTo(rx + reticleSize, ry - reticleSize);
        ctx.lineTo(rx + reticleSize, ry - reticleSize + 8);

        ctx.moveTo(rx - reticleSize, ry + reticleSize - 8);
        ctx.lineTo(rx - reticleSize, ry + reticleSize);
        ctx.lineTo(rx - reticleSize + 8, ry + reticleSize);

        ctx.moveTo(rx + reticleSize - 8, ry + reticleSize);
        ctx.lineTo(rx + reticleSize, ry + reticleSize);
        ctx.lineTo(rx + reticleSize, ry + reticleSize - 8);
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    isOpen,
    stage,
    reticlePos,
    pinnedPoints,
    roomHeight,
    openings,
    selectedWallIndex,
    selectedCategory,
    furnitureDim,
    capturedFurniture,
    pixelsPerMeter,
    unit
  ]);

  // Stage 1 Action: Pin Room Corner
  const handlePinCorner = () => {
    triggerHaptic('medium');
    playMeshDetect();

    const canvas = overlayCanvasRef.current;
    const w = canvas?.clientWidth || window.innerWidth;
    const h = canvas?.clientHeight || window.innerHeight;

    const worldX = ((reticlePos.u - 0.5) * w) / pixelsPerMeter;
    const worldZ = ((reticlePos.v - 0.5) * h) / pixelsPerMeter;

    const newPt: PinnedPoint = {
      id: `pt-${Date.now()}`,
      u: reticlePos.u,
      v: reticlePos.v,
      worldX: Number(worldX.toFixed(2)),
      worldZ: Number(worldZ.toFixed(2))
    };

    setPinnedPoints((prev) => [...prev, newPt]);

    if (pinnedPoints.length + 1 >= 3) {
      setCoachingCue(`${pinnedPoints.length + 1} corners pinned. Tap "Calibrate Walls" or pin more corners.`);
    } else {
      setCoachingCue(`Corner ${pinnedPoints.length + 1} pinned. Move to next room corner.`);
    }
  };

  // Stage 3 Action: Add Opening (Door/Window)
  const handleAddOpening = () => {
    triggerHaptic('medium');
    playMeshDetect();

    const newOpening: DetectedOpening = {
      id: `op-${Date.now()}`,
      wallIndex: selectedWallIndex,
      type: openingType,
      offset: openingOffset,
      width: openingType === 'door' ? 0.9 : 1.2,
      height: openingType === 'door' ? 2.1 : 1.2,
      elevation: openingType === 'door' ? 0 : 0.9,
      swingDirection: openingType === 'door' ? doorSwing : undefined
    };

    setOpenings((prev) => [...prev, newOpening]);
    setCoachingCue(`${openingType === 'door' ? 'Door' : 'Window'} placed on Wall ${selectedWallIndex + 1}.`);
  };

  // Stage 4 Action: Classify & Place 3D Bounding Box
  const handleClassifyFurniture = () => {
    triggerHaptic('heavy');
    playMeshDetect();

    const photoUrl = takeOnSpotPhoto();

    const canvas = overlayCanvasRef.current;
    const w = canvas?.clientWidth || window.innerWidth;
    const h = canvas?.clientHeight || window.innerHeight;

    const worldX = ((reticlePos.u - 0.5) * w) / pixelsPerMeter;
    const worldZ = ((reticlePos.v - 0.5) * h) / pixelsPerMeter;

    const newObj: CapturedFurniture = {
      id: `captured-${Date.now()}`,
      type: selectedCategory.type,
      category: selectedCategory.category,
      name: selectedCategory.label,
      worldX: Number(worldX.toFixed(2)),
      worldZ: Number(worldZ.toFixed(2)),
      dimensions: { ...furnitureDim },
      rotationYaw: furnitureRotation,
      confidence: 'high',
      photoSnapshotUrl: photoUrl || undefined
    };

    setCapturedFurniture((prev) => [...prev, newObj]);
    setCoachingCue(`Classified: ${selectedCategory.label} with on-spot 3D bounding box.`);
  };

  // Remove Captured Furniture
  const handleRemoveCapturedFurniture = (id: string) => {
    triggerHaptic('light');
    setCapturedFurniture((prev) => prev.filter((item) => item.id !== id));
  };

  // Final Action: Commit Captured RoomPlan to useRoomStore and Enter 3D Dollhouse
  const handleCompleteRoomPlan = () => {
    if (pinnedPoints.length < 3) return;

    triggerHaptic('success');
    playScanComplete();

    clearRoom();
    setRoomName('Captured Room');
    setCeilingHeight(roomHeight);

    // Compute centroid
    let avgX = 0, avgZ = 0;
    pinnedPoints.forEach((p) => {
      avgX += p.worldX;
      avgZ += p.worldZ;
    });
    avgX /= pinnedPoints.length;
    avgZ /= pinnedPoints.length;

    // Create connected walls
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

      // Associated openings for this wall
      const wallOpenings: WallOpening[] = openings
        .filter((op) => op.wallIndex === i)
        .map((op) => ({
          id: op.id,
          type: op.type,
          offset: op.offset,
          width: op.width,
          height: op.height,
          elevation: op.elevation,
          swingDirection: op.swingDirection
        }));

      const wall: Wall = {
        id: `wall-scan-${i + 1}`,
        name: `Wall ${i + 1}`,
        start,
        end,
        height: roomHeight,
        thickness: 0.15,
        openings: wallOpenings
      };

      addWall(wall);
    }

    // Add classified furniture objects
    capturedFurniture.forEach((item, idx) => {
      const roomObj: RoomObject = {
        id: `captured-obj-${idx + 1}-${Date.now()}`,
        category: item.category,
        type: item.type,
        name: item.name,
        position: {
          x: Number((item.worldX - avgX).toFixed(2)),
          y: 0,
          z: Number((item.worldZ - avgZ).toFixed(2))
        },
        dimensions: { ...item.dimensions },
        rotation: { yaw: item.rotationYaw },
        confidence: item.confidence,
        materialStyle: 'modern_white',
        photoSnapshotUrl: item.photoSnapshotUrl
      };

      addObject(roomObj);
    });

    // Switch to signature Apple Dollhouse view
    setRenderStyle('dollhouse');
    setViewMode('3d');
    onClose();
  };

  // Reset Scanner
  const handleReset = () => {
    triggerHaptic('medium');
    setPinnedPoints([]);
    setOpenings([]);
    setCapturedFurniture([]);
    setStage('floor');
    setCoachingCue('Scan floor plane slowly. Aim reticle at room corners.');
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
      {/* Live Camera Stream Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* AR Overlays, Wireframes & 3D Bounding Boxes Canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Camera Shutter Flash Animation */}
      {flash && (
        <div className="absolute inset-0 z-40 bg-white/80 pointer-events-none transition-opacity duration-150" />
      )}

      {/* Floating On-Spot Camera Shutter Button */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5">
        <button
          id="btn-onspot-shutter"
          onClick={() => {
            takeOnSpotPhoto();
            setCoachingCue('On-spot photo snapped!');
          }}
          title="Snap On-Spot Photo"
          className="w-13 h-13 rounded-full border-2 border-white/90 bg-white/20 backdrop-blur-md p-1 active:scale-90 transition-all flex items-center justify-center shadow-2xl hover:bg-white/30"
        >
          <div className="w-full h-full rounded-full bg-white shadow-inner flex items-center justify-center text-slate-950">
            <Camera className="w-5 h-5" />
          </div>
        </button>
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
          Snap
        </span>

        {lastSnapshot && (
          <div className="mt-1 w-11 h-11 rounded-xl overflow-hidden border border-cyan-400/60 shadow-lg relative animate-fade-in">
            <img src={lastSnapshot} alt="Snapshot" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Camera Error / Permission Request Screen */}
      {cameraError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md">
          <div className="max-w-md w-full p-6 bg-slate-900 border border-cyan-500/30 rounded-3xl text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Camera className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Camera Permission Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-2">{cameraError}</p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                id="btn-grant-camera-permission"
                onClick={async () => {
                  triggerHaptic('heavy');
                  await requestNativeCameraPermission();
                  startCamera();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Grant Camera Permission & Start
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    startCamera();
                  }}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-semibold text-slate-200 active:scale-95 transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-400 hover:text-white active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top HUD: Step Indicators & Device Actions */}
      <div className="relative z-10 p-4 md:p-5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/30 border border-cyan-400/50 text-cyan-400 rounded-2xl backdrop-blur-xl shadow-lg shadow-cyan-500/20">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">Apple RoomCapture</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full">
                LiDAR Live
              </span>
            </div>
            {/* Stage Progress Badges */}
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-300">
              <span className={stage === 'floor' ? 'text-cyan-400 font-bold underline' : 'opacity-60'}>1. Floor</span>
              <span>•</span>
              <span className={stage === 'walls' ? 'text-cyan-400 font-bold underline' : 'opacity-60'}>2. Walls</span>
              <span>•</span>
              <span className={stage === 'openings' ? 'text-cyan-400 font-bold underline' : 'opacity-60'}>3. Openings</span>
              <span>•</span>
              <span className={stage === 'furniture' ? 'text-cyan-400 font-bold underline' : 'opacity-60'}>4. Objects</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Camera */}
          <button
            onClick={toggleCamera}
            title="Switch Camera"
            className="p-2.5 bg-slate-900/80 hover:bg-white/20 border border-white/15 rounded-2xl backdrop-blur-xl text-slate-200 transition-colors active:scale-95"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            title="Reset Scan"
            className="p-2.5 bg-slate-900/80 hover:bg-white/20 border border-white/15 rounded-2xl backdrop-blur-xl text-slate-200 transition-colors active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Exit */}
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-900/80 hover:bg-white/20 border border-white/15 rounded-2xl backdrop-blur-xl text-white transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Apple Audio/Haptic Coaching Banner */}
      <div className="relative z-10 pointer-events-none mx-auto text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950/85 backdrop-blur-2xl border border-cyan-400/30 rounded-full text-xs font-semibold text-cyan-300 shadow-2xl animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{coachingCue}</span>
        </div>
      </div>

      {/* Bottom HUD: Contextual Controls per Stage */}
      <div className="relative z-10 p-4 md:p-5 bg-gradient-to-t from-black/95 via-black/75 to-transparent">
        <div className="max-w-xl mx-auto space-y-3">
          {/* STAGE 1: FLOOR & PERIMETER */}
          {stage === 'floor' && (
            <div className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Floor Perimeter ({pinnedPoints.length} corners pinned)
                </span>
                <button
                  onClick={handleAutoDetectPerimeter}
                  className="px-2.5 py-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 rounded-xl transition-all"
                >
                  ⚡ Auto-Detect Bounds
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-pin-corner"
                  onClick={handlePinCorner}
                  className="flex-1 py-3.5 bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white rounded-2xl font-bold text-sm shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Crosshair className="w-5 h-5" />
                  <span>Pin Floor Corner {pinnedPoints.length + 1}</span>
                </button>

                {pinnedPoints.length >= 3 && (
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      playScanComplete();
                      setStage('walls');
                      setCoachingCue('Perimeter locked. Adjust room ceiling height.');
                    }}
                    className="py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/30 flex items-center gap-1.5 transition-all active:scale-98"
                  >
                    <span>Next: Walls</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 2: WALLS & HEIGHT CALIBRATION */}
          {stage === 'walls' && (
            <div className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Ceiling Height Calibration:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {formatDimension(roomHeight, unit)}
                </span>
              </div>

              {/* Height Slider */}
              <input
                type="range"
                min={unit === 'ft' ? '7' : '2.0'}
                max={unit === 'ft' ? '14' : '4.5'}
                step={unit === 'ft' ? '0.2' : '0.1'}
                value={unit === 'ft' ? metersToFeet(roomHeight) : roomHeight}
                onChange={(e) =>
                  setRoomHeight(unit === 'ft' ? feetToMeters(parseFloat(e.target.value)) : parseFloat(e.target.value))
                }
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />

              {/* Height Presets */}
              <div className="flex items-center gap-2">
                {[
                  { label: '2.4m (Standard)', val: 2.4 },
                  { label: '2.6m (Modern)', val: 2.6 },
                  { label: '2.8m (Spacious)', val: 2.8 },
                  { label: '3.0m (High Ceiling)', val: 3.0 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setRoomHeight(item.val)}
                    className={`flex-1 py-1 rounded-xl border text-[11px] font-medium transition-all ${
                      Math.abs(roomHeight - item.val) < 0.05
                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setStage('floor')}
                  className="px-4 py-3 bg-white/10 hover:bg-white/15 text-slate-300 rounded-2xl font-medium text-xs transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    playScanComplete();
                    setStage('openings');
                    setCoachingCue('Aim at doors and windows to mark wall openings.');
                  }}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>Confirm Height & Mark Openings</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: OPENINGS (DOORS & WINDOWS) */}
          {stage === 'openings' && (
            <div className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl space-y-3">
              {/* Wall Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {pinnedPoints.map((_, idx) => (
                  <button
                    key={`wall-btn-${idx}`}
                    onClick={() => setSelectedWallIndex(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedWallIndex === idx
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Wall {idx + 1}
                  </button>
                ))}
              </div>

              {/* Type Toggle & Swing Direction */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOpeningType('door')}
                  className={`py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    openingType === 'door'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <DoorOpen className="w-4 h-4" />
                  <span>Door (0.9m)</span>
                </button>
                <button
                  onClick={() => setOpeningType('window')}
                  className={`py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    openingType === 'window'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <AppWindow className="w-4 h-4" />
                  <span>Window (1.2m)</span>
                </button>
              </div>

              {openingType === 'door' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="text-[11px] font-semibold text-slate-400">Swing:</span>
                  {(['in', 'out', 'left', 'right'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setDoorSwing(dir)}
                      className={`flex-1 py-1 rounded-lg text-[10px] uppercase font-bold border transition-all ${
                        doorSwing === dir
                          ? 'bg-amber-600/30 border-amber-400 text-amber-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              )}

              {/* Position Offset Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Wall Offset Position:</span>
                  <span className="font-mono text-cyan-400">{formatDimension(openingOffset, unit)}</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="3.5"
                  step="0.1"
                  value={openingOffset}
                  onChange={(e) => setOpeningOffset(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddOpening}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Place Opening on Wall {selectedWallIndex + 1}</span>
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    playScanComplete();
                    setStage('furniture');
                    setCoachingCue('Aim reticle at furniture. Select Apple category & tap Classify.');
                  }}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-xs shadow-lg flex items-center gap-1 transition-all active:scale-98"
                >
                  <span>Next: Furniture</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: FURNITURE CLASSIFICATION & 3D AR BOUNDING BOX */}
          {stage === 'furniture' && (
            <div className="p-4 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl space-y-3">
              {/* Apple 16 Category Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Apple 16 Object Classification:</span>
                  <span className="text-cyan-400 font-bold">{selectedCategory.label}</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {APPLE_16_CATEGORIES.map((cat) => (
                    <button
                      key={cat.type}
                      onClick={() => handleSelectCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                        selectedCategory.type === cat.type
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimension & Rotation Adjustment Sliders */}
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>W</span>
                    <span className="font-mono text-white">{formatDimension(furnitureDim.width, unit)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.05"
                    value={furnitureDim.width}
                    onChange={(e) => setFurnitureDim((prev) => ({ ...prev, width: parseFloat(e.target.value) }))}
                    className="w-full accent-cyan-400 h-1 bg-slate-700 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>D</span>
                    <span className="font-mono text-white">{formatDimension(furnitureDim.depth, unit)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2.5"
                    step="0.05"
                    value={furnitureDim.depth}
                    onChange={(e) => setFurnitureDim((prev) => ({ ...prev, depth: parseFloat(e.target.value) }))}
                    className="w-full accent-cyan-400 h-1 bg-slate-700 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>H</span>
                    <span className="font-mono text-white">{formatDimension(furnitureDim.height, unit)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2.4"
                    step="0.05"
                    value={furnitureDim.height}
                    onChange={(e) => setFurnitureDim((prev) => ({ ...prev, height: parseFloat(e.target.value) }))}
                    className="w-full accent-cyan-400 h-1 bg-slate-700 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Rot</span>
                    <span className="font-mono text-white">{Math.round((furnitureRotation * 180) / Math.PI)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-3.14"
                    max="3.14"
                    step="0.1"
                    value={furnitureRotation}
                    onChange={(e) => setFurnitureRotation(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-slate-700 rounded"
                  />
                </div>
              </div>

              {/* Captured Items Pill Strip */}
              {capturedFurniture.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Captured:</span>
                  {capturedFurniture.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-[11px] shrink-0"
                    >
                      <Box className="w-3 h-3" />
                      <span>{item.name}</span>
                      <button
                        onClick={() => handleRemoveCapturedFurniture(item.id)}
                        className="hover:text-red-400 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleClassifyFurniture}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white rounded-2xl font-bold text-xs shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Box className="w-4 h-4" />
                  <span>Classify & Place 3D Bounding Box</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    playScanComplete();
                    setStage('summary');
                  }}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-2xl font-bold text-xs shadow-xl shadow-emerald-500/30 flex items-center gap-1 transition-all"
                >
                  <span>Review</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 5: SUMMARY & ENTER 3D DOLLHOUSE */}
          {stage === 'summary' && (
            <div className="p-4 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Apple RoomCapture Complete</h3>
                  <p className="text-[11px] text-slate-300">Ready to build parametric dollhouse model</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-white/5 rounded-2xl border border-white/5 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Walls</div>
                  <div className="text-base font-bold text-cyan-400">{pinnedPoints.length}</div>
                </div>
                <div className="p-2.5 bg-white/5 rounded-2xl border border-white/5 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Openings</div>
                  <div className="text-base font-bold text-amber-400">{openings.length}</div>
                </div>
                <div className="p-2.5 bg-white/5 rounded-2xl border border-white/5 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Objects</div>
                  <div className="text-base font-bold text-emerald-400">{capturedFurniture.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setStage('furniture')}
                  className="px-4 py-3 bg-white/10 hover:bg-white/15 text-slate-300 rounded-2xl font-medium text-xs transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Edit Scan</span>
                </button>
                <button
                  onClick={handleCompleteRoomPlan}
                  className="flex-1 py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Enter 3D Apple Dollhouse</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
