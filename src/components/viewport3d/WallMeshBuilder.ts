import * as THREE from 'three';
import type { Wall, UnitType, WallStyle, RenderStyle } from '../../types/room';
import { distance2D, angle2D, formatDimension } from '../../utils/math';
import { createBrickTexture } from '../../utils/textures';

/**
 * Creates a 3D Sprite with crisp text label (e.g. "4.00 m")
 */
export function createTextSprite(text: string, bgColor = 'rgba(28, 28, 30, 0.85)', textColor = '#ffffff'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pill background
    ctx.fillStyle = bgColor;
    const r = 16;
    const w = canvas.width - 8;
    const h = canvas.height - 8;
    const x = 4;
    const y = 4;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = textColor;
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(0.8, 0.2, 1);
  return sprite;
}

/**
 * Procedurally builds a parametric wall mesh with door/window openings
 */
export function buildWallMesh(
  wall: Wall,
  isSelected = false,
  unit: UnitType = 'm',
  wallStyle: WallStyle = 'white_plaster',
  customWallUrl?: string,
  renderStyle: RenderStyle = 'dollhouse'
): THREE.Group {
  const group = new THREE.Group();
  group.name = `wall-${wall.id}`;
  group.userData = { id: wall.id, type: 'wall' };

  const len = distance2D(wall.start, wall.end);
  if (len < 0.01) return group;

  const H = wall.height || 2.6;
  const T = wall.thickness || 0.15;
  const isDollhouse = renderStyle === 'dollhouse';

  // Apple RoomPlan Signature Frosted Glass Acrylic Material
  const dollhouseMat = new THREE.MeshPhysicalMaterial({
    color: isSelected ? 0x93c5fd : 0xdbeafe,
    transmission: 0.65,
    transparent: true,
    opacity: 0.86,
    roughness: 0.2,
    metalness: 0.06,
    ior: 1.45,
    thickness: T
  });

  const dollhouseEdgeMat = new THREE.LineBasicMaterial({
    color: isSelected ? 0x38bdf8 : 0x0ea5e9,
    transparent: true,
    opacity: isSelected ? 0.95 : 0.6
  });

  let wallTexture: THREE.Texture | null = null;
  let wallColor = isSelected ? 0xe2e8f0 : 0xf8fafc;

  if (wallStyle === 'brick') {
    wallTexture = createBrickTexture();
  } else if (wallStyle === 'warm_beige') {
    wallColor = isSelected ? 0xe6dfd5 : 0xf5ebe0;
  } else if (wallStyle === 'slate_grey') {
    wallColor = isSelected ? 0x475569 : 0x334155;
  } else if (wallStyle === 'custom_photo' && customWallUrl) {
    const tex = new THREE.TextureLoader().load(customWallUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    wallTexture = tex;
  }

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallTexture ? 0xffffff : wallColor,
    map: wallTexture,
    roughness: 0.85,
    metalness: 0.02
  });

  const selectedBorderMat = new THREE.LineBasicMaterial({
    color: 0x007aff,
    linewidth: 2
  });

  const frameMat = isDollhouse
    ? new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.2 })
    : new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.2 });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transmission: 0.85,
    opacity: 0.6,
    transparent: true,
    roughness: 0.1,
    ior: 1.5
  });

  // Local wall container (oriented along local X axis, centered at start)
  const wallContent = new THREE.Group();

  // Helper to add local box
  const addBlock = (w: number, h: number, d: number, cx: number, cy: number, cz: number, mat = isDollhouse ? dollhouseMat : wallMat) => {
    if (w <= 0.005 || h <= 0.005) return;
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { parentId: wall.id, type: 'wall' };
    wallContent.add(mesh);

    if (isDollhouse) {
      const edges = new THREE.EdgesGeometry(geom);
      const wire = new THREE.LineSegments(edges, dollhouseEdgeMat);
      wire.position.set(cx, cy, cz);
      wallContent.add(wire);
    }
  };

  // Sort openings by offset along wall
  const sortedOpenings = [...(wall.openings || [])].sort((a, b) => a.offset - b.offset);

  let currentX = 0;

  sortedOpenings.forEach(op => {
    const opLeft = Math.max(0, op.offset - op.width / 2);
    const opRight = Math.min(len, op.offset + op.width / 2);
    const actualOpW = opRight - opLeft;

    // 1. Solid wall before opening
    if (opLeft > currentX) {
      const segW = opLeft - currentX;
      addBlock(segW, H, T, currentX + segW / 2, H / 2, 0);
    }

    // 2. Below opening (sill)
    if (op.elevation > 0) {
      addBlock(actualOpW, op.elevation, T, opLeft + actualOpW / 2, op.elevation / 2, 0);
    }

    // 3. Above opening (lintel)
    const lintelH = H - (op.elevation + op.height);
    if (lintelH > 0) {
      addBlock(actualOpW, lintelH, T, opLeft + actualOpW / 2, H - lintelH / 2, 0);
    }

    // 4. Opening detail: window pane or door frame
    if (op.type === 'window') {
      // Glass pane
      const glassH = op.height - 0.06;
      const glassW = actualOpW - 0.06;
      addBlock(glassW, glassH, 0.02, opLeft + actualOpW / 2, op.elevation + op.height / 2, 0, glassMat);

      // Window sill/casing
      addBlock(actualOpW, 0.03, T + 0.04, opLeft + actualOpW / 2, op.elevation + 0.015, 0, frameMat);
      addBlock(actualOpW, 0.03, T + 0.02, opLeft + actualOpW / 2, op.elevation + op.height - 0.015, 0, frameMat);
    } else {
      // Door frame lining
      const frameThick = 0.04;
      addBlock(frameThick, op.height, T + 0.02, opLeft + frameThick / 2, op.height / 2, 0, frameMat);
      addBlock(frameThick, op.height, T + 0.02, opRight - frameThick / 2, op.height / 2, 0, frameMat);
      addBlock(actualOpW, frameThick, T + 0.02, opLeft + actualOpW / 2, op.height - frameThick / 2, 0, frameMat);
    }

    currentX = opRight;
  });

  // Remaining wall segment after all openings
  if (currentX < len) {
    const segW = len - currentX;
    addBlock(segW, H, T, currentX + segW / 2, H / 2, 0);
  }

  // Baseboard trim at bottom of wall for premium finish
  addBlock(len, 0.08, T + 0.015, len / 2, 0.04, 0, frameMat);

  // If selected, add high-tech dimension guide line & measurement badge
  if (isSelected) {
    // Dimension line along top of wall
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, H + 0.15, 0),
      new THREE.Vector3(len, H + 0.15, 0)
    ]);
    const lineMesh = new THREE.Line(lineGeom, selectedBorderMat);
    lineMesh.name = 'DimensionLine';
    wallContent.add(lineMesh);

    // End ticks
    const tickL = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, H + 0.05, 0),
        new THREE.Vector3(0, H + 0.25, 0)
      ]),
      selectedBorderMat
    );
    const tickR = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(len, H + 0.05, 0),
        new THREE.Vector3(len, H + 0.25, 0)
      ]),
      selectedBorderMat
    );
    wallContent.add(tickL);
    wallContent.add(tickR);

    // Dimension label sprite
    const label = createTextSprite(formatDimension(len, unit), 'rgba(0, 122, 255, 0.9)');
    label.position.set(len / 2, H + 0.35, 0);
    label.name = 'DimensionLabel';
    wallContent.add(label);
  }

  // Position and orient the wall in world space
  const angle = angle2D(wall.start, wall.end);
  group.position.set(wall.start.x, 0, wall.start.z);
  group.rotation.y = -angle; // Three.js Y-rotation is counter-clockwise

  group.add(wallContent);
  return group;
}
