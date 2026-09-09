import type { UnitType } from '../types/room';

export const SNAP_GRID_METERS = 0.1; // 10 cm snapping

export function snapToGrid(value: number, step: number = SNAP_GRID_METERS): number {
  return Math.round(value / step) * step;
}

export function distance2D(p1: { x: number; z: number }, p2: { x: number; z: number }): number {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  return Math.hypot(dx, dz);
}

export function angle2D(p1: { x: number; z: number }, p2: { x: number; z: number }): number {
  return Math.atan2(p2.z - p1.z, p2.x - p1.x);
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function feetToMeters(feet: number): number {
  return feet / 3.28084;
}

export function formatDimension(meters: number, unit: UnitType = 'm', decimals: number = 2): string {
  if (unit === 'ft') {
    const feet = metersToFeet(meters);
    return `${feet.toFixed(decimals)} ft`;
  }
  return `${meters.toFixed(decimals)} m`;
}

export function formatArea(sqMeters: number, unit: UnitType = 'm'): string {
  if (unit === 'ft') {
    const sqFeet = sqMeters * 10.7639;
    return `${sqFeet.toFixed(1)} sq ft`;
  }
  return `${sqMeters.toFixed(1)} m²`;
}

/**
 * Calculates point projected onto line segment (start -> end).
 * Returns { point, t, dist } where t is normalized [0, 1] along segment.
 */
export function projectPointToSegment(
  p: { x: number; z: number },
  start: { x: number; z: number },
  end: { x: number; z: number }
): { point: { x: number; z: number }; t: number; dist: number } {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    return { point: { ...start }, t: 0, dist: distance2D(p, start) };
  }

  const t = Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.z - start.z) * dz) / lenSq));
  const proj = {
    x: start.x + t * dx,
    z: start.z + t * dz
  };
  return {
    point: proj,
    t,
    dist: distance2D(p, proj)
  };
}

/**
 * Calculates convex or simple room area given an array of connected walls
 */
export function calculateRoomArea(walls: Array<{ start: { x: number; z: number }; end: { x: number; z: number } }>): number {
  if (walls.length < 3) return 0;
  // Collect unique polygon vertices in order
  const vertices: Array<{ x: number; z: number }> = [];
  walls.forEach(w => {
    if (!vertices.some(v => Math.hypot(v.x - w.start.x, v.z - w.start.z) < 0.05)) {
      vertices.push(w.start);
    }
  });

  if (vertices.length < 3) return 0;

  // Shoelace formula
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].z;
    area -= vertices[j].x * vertices[i].z;
  }
  return Math.abs(area) / 2;
}
