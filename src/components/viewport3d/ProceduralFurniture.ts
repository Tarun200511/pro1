import * as THREE from 'three';
import type { RoomObject } from '../../types/room';

// Apple RoomPlan-inspired color palette
export const PALETTES = {
  modern_white: {
    primary: 0xf8f9fa,
    secondary: 0xe9ecef,
    accent: 0xd0d7de,
    dark: 0x24292f,
    cushion: 0xeeeeee
  },
  natural_oak: {
    primary: 0xd4a373,
    secondary: 0xc5925d,
    accent: 0xa97444,
    dark: 0x3d2b1f,
    cushion: 0xe6ccb2
  },
  slate_dark: {
    primary: 0x2b303a,
    secondary: 0x1f242c,
    accent: 0x414856,
    dark: 0x15181e,
    cushion: 0x363d4a
  },
  brushed_aluminum: {
    primary: 0xdde2e6,
    secondary: 0xc8d0d5,
    accent: 0x8a99a8,
    dark: 0x1a1c1e,
    cushion: 0xb0bcc6
  }
};

/**
 * Creates procedural 3D model for any RoomObject
 */
export function createProceduralFurniture(obj: RoomObject, isSelected = false): THREE.Group {
  const group = new THREE.Group();
  group.name = `furniture-${obj.id}`;
  group.userData = { id: obj.id, type: 'object' };

  const { width: W, depth: D, height: H } = obj.dimensions;
  const style = obj.materialStyle || 'modern_white';
  const colors = PALETTES[style] || PALETTES.modern_white;

  const matPrimary = new THREE.MeshStandardMaterial({
    color: colors.primary,
    roughness: 0.45,
    metalness: 0.05
  });

  const matSecondary = new THREE.MeshStandardMaterial({
    color: colors.secondary,
    roughness: 0.5,
    metalness: 0.1
  });

  const matAccent = new THREE.MeshStandardMaterial({
    color: colors.accent,
    roughness: 0.3,
    metalness: 0.4
  });

  const matDark = new THREE.MeshStandardMaterial({
    color: colors.dark,
    roughness: 0.2,
    metalness: 0.8
  });

  const matCushion = new THREE.MeshStandardMaterial({
    color: colors.cushion,
    roughness: 0.7,
    metalness: 0.02
  });

  // Enable shadow casting helper
  const addMesh = (geom: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, rotY = 0) => {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { parentId: obj.id, type: 'object' };
    group.add(mesh);
    return mesh;
  };

  switch (obj.type) {
    case 'sofa': {
      // Base plinth
      const plinthH = 0.12;
      addMesh(new THREE.BoxGeometry(W, plinthH, D), matSecondary, 0, plinthH / 2, 0);

      // Seat Cushions (2 or 3 segments)
      const seatH = 0.28;
      const numCushions = W > 1.8 ? 3 : 2;
      const cushionW = (W - 0.2) / numCushions;
      const cushionD = D - 0.22;
      for (let i = 0; i < numCushions; i++) {
        const cx = -W / 2 + 0.1 + cushionW / 2 + i * cushionW;
        addMesh(
          new THREE.BoxGeometry(cushionW - 0.02, seatH, cushionD),
          matCushion,
          cx,
          plinthH + seatH / 2,
          0.06
        );
      }

      // Backrest
      const backH = H - plinthH;
      const backD = 0.18;
      addMesh(
        new THREE.BoxGeometry(W, backH, backD),
        matPrimary,
        0,
        plinthH + backH / 2,
        -D / 2 + backD / 2
      );

      // Armrests
      const armW = 0.14;
      const armH = seatH + 0.2;
      addMesh(new THREE.BoxGeometry(armW, armH, D), matPrimary, -W / 2 + armW / 2, plinthH + armH / 2, 0);
      addMesh(new THREE.BoxGeometry(armW, armH, D), matPrimary, W / 2 - armW / 2, plinthH + armH / 2, 0);
      break;
    }

    case 'chair':
    case 'armchair': {
      if (obj.type === 'armchair') {
        // Armchair: deep soft chair
        const baseH = 0.1;
        addMesh(new THREE.BoxGeometry(W, baseH, D), matSecondary, 0, baseH / 2, 0);
        const seatH = 0.3;
        addMesh(new THREE.BoxGeometry(W - 0.15, seatH, D - 0.15), matCushion, 0, baseH + seatH / 2, 0.04);
        const backH = H - baseH;
        addMesh(new THREE.BoxGeometry(W, backH, 0.14), matPrimary, 0, baseH + backH / 2, -D / 2 + 0.07);
        addMesh(new THREE.BoxGeometry(0.12, seatH + 0.15, D), matPrimary, -W / 2 + 0.06, baseH + (seatH + 0.15) / 2, 0);
        addMesh(new THREE.BoxGeometry(0.12, seatH + 0.15, D), matPrimary, W / 2 - 0.06, baseH + (seatH + 0.15) / 2, 0);
      } else {
        // Sleek dining/desk chair
        const legR = 0.018;
        const seatY = 0.44;
        const legGeom = new THREE.CylinderGeometry(legR, legR * 0.8, seatY, 12);
        addMesh(legGeom, matDark, -W / 2 + 0.05, seatY / 2, -D / 2 + 0.05);
        addMesh(legGeom, matDark, W / 2 - 0.05, seatY / 2, -D / 2 + 0.05);
        addMesh(legGeom, matDark, -W / 2 + 0.05, seatY / 2, D / 2 - 0.05);
        addMesh(legGeom, matDark, W / 2 - 0.05, seatY / 2, D / 2 - 0.05);

        // Seat
        addMesh(new THREE.BoxGeometry(W, 0.05, D), matPrimary, 0, seatY + 0.025, 0);
        // Minimalist curved backrest
        const backH = H - seatY;
        addMesh(new THREE.BoxGeometry(W * 0.9, backH * 0.7, 0.03), matPrimary, 0, seatY + backH * 0.6, -D / 2 + 0.03);
      }
      break;
    }

    case 'dining_table':
    case 'coffee_table': {
      const topThick = obj.type === 'coffee_table' ? 0.04 : 0.05;
      const legHeight = H - topThick;
      // Top
      addMesh(new THREE.BoxGeometry(W, topThick, D), matPrimary, 0, H - topThick / 2, 0);

      // 4 modern tapered legs
      const legTop = 0.025;
      const legBot = 0.015;
      const legGeom = new THREE.CylinderGeometry(legTop, legBot, legHeight, 16);
      const legX = W / 2 - 0.08;
      const legZ = D / 2 - 0.08;
      addMesh(legGeom, matDark, -legX, legHeight / 2, -legZ);
      addMesh(legGeom, matDark, legX, legHeight / 2, -legZ);
      addMesh(legGeom, matDark, -legX, legHeight / 2, legZ);
      addMesh(legGeom, matDark, legX, legHeight / 2, legZ);
      break;
    }

    case 'desk': {
      // Desktop
      const topThick = 0.04;
      const legH = H - topThick;
      addMesh(new THREE.BoxGeometry(W, topThick, D), matPrimary, 0, H - topThick / 2, 0);

      // Sled / Loop modern legs
      const legThick = 0.04;
      addMesh(new THREE.BoxGeometry(legThick, legH, D * 0.9), matAccent, -W / 2 + legThick / 2 + 0.05, legH / 2, 0);
      addMesh(new THREE.BoxGeometry(legThick, legH, D * 0.9), matAccent, W / 2 - legThick / 2 - 0.05, legH / 2, 0);

      // Rear privacy / cable baffle
      addMesh(new THREE.BoxGeometry(W * 0.8, legH * 0.4, 0.02), matSecondary, 0, legH * 0.7, -D / 2 + 0.04);

      // Styled laptop / workstation mock on top
      const laptopW = 0.32;
      const laptopD = 0.22;
      addMesh(new THREE.BoxGeometry(laptopW, 0.01, laptopD), matDark, 0, H + 0.005, 0.02);
      addMesh(new THREE.BoxGeometry(laptopW, 0.2, 0.01), matDark, 0, H + 0.1, -laptopD / 2 + 0.02, -0.15);
      break;
    }

    case 'wardrobe': {
      // Main body
      addMesh(new THREE.BoxGeometry(W, H, D), matPrimary, 0, H / 2, 0);

      // Vertical door split groove
      addMesh(new THREE.BoxGeometry(0.008, H * 0.94, 0.005), matDark, 0, H / 2, D / 2 + 0.003);

      // Modern vertical handles
      addMesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), matDark, -0.06, H * 0.5, D / 2 + 0.015);
      addMesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), matDark, 0.06, H * 0.5, D / 2 + 0.015);
      break;
    }

    case 'sideboard':
    case 'bookshelf': {
      if (obj.type === 'bookshelf') {
        // Bookshelf with shelves
        const outerThick = 0.03;
        addMesh(new THREE.BoxGeometry(W, outerThick, D), matPrimary, 0, outerThick / 2, 0);
        addMesh(new THREE.BoxGeometry(W, outerThick, D), matPrimary, 0, H - outerThick / 2, 0);
        addMesh(new THREE.BoxGeometry(outerThick, H, D), matPrimary, -W / 2 + outerThick / 2, H / 2, 0);
        addMesh(new THREE.BoxGeometry(outerThick, H, D), matPrimary, W / 2 - outerThick / 2, H / 2, 0);
        // 3 internal shelves
        for (let s = 1; s <= 3; s++) {
          const sy = (H / 4) * s;
          addMesh(new THREE.BoxGeometry(W - outerThick * 2, outerThick, D), matSecondary, 0, sy, 0);
        }
      } else {
        // Sideboard / Credenza
        const legH = 0.14;
        const bodyH = H - legH;
        addMesh(new THREE.BoxGeometry(W, bodyH, D), matPrimary, 0, legH + bodyH / 2, 0);

        // 4 stilt legs
        const legR = 0.016;
        const legGeom = new THREE.CylinderGeometry(legR, legR * 0.7, legH, 12);
        addMesh(legGeom, matDark, -W / 2 + 0.08, legH / 2, -D / 2 + 0.08);
        addMesh(legGeom, matDark, W / 2 - 0.08, legH / 2, -D / 2 + 0.08);
        addMesh(legGeom, matDark, -W / 2 + 0.08, legH / 2, D / 2 - 0.08);
        addMesh(legGeom, matDark, W / 2 - 0.08, legH / 2, D / 2 - 0.08);

        // Subtle door groove
        addMesh(new THREE.BoxGeometry(0.005, bodyH * 0.8, 0.005), matDark, 0, legH + bodyH / 2, D / 2 + 0.003);
      }
      break;
    }

    case 'refrigerator': {
      // Sleek double-door stainless fridge
      addMesh(new THREE.BoxGeometry(W, H, D), matPrimary, 0, H / 2, 0);

      // Horizontal door seam (freezer/fridge split)
      const seamY = H * 0.65;
      addMesh(new THREE.BoxGeometry(W * 0.98, 0.01, 0.005), matDark, 0, seamY, D / 2 + 0.003);

      // Vertical door split on upper portion
      addMesh(new THREE.BoxGeometry(0.008, H - seamY - 0.05, 0.005), matDark, 0, seamY + (H - seamY) / 2, D / 2 + 0.003);

      // Recessed handles
      addMesh(new THREE.BoxGeometry(0.02, 0.35, 0.015), matAccent, -0.06, seamY + 0.25, D / 2 + 0.01);
      addMesh(new THREE.BoxGeometry(0.02, 0.35, 0.015), matAccent, 0.06, seamY + 0.25, D / 2 + 0.01);
      break;
    }

    case 'tv': {
      // OLED ultra-thin TV screen
      const screenH = H * 0.75;
      const screenW = W;
      const screenThick = 0.025;
      const screenCenterY = H - screenH / 2;

      // Bezel
      addMesh(new THREE.BoxGeometry(screenW, screenH, screenThick), matDark, 0, screenCenterY, 0);

      // Glossy OLED display face
      const matScreenFace = new THREE.MeshStandardMaterial({
        color: 0x05070a,
        roughness: 0.1,
        metalness: 0.9
      });
      addMesh(new THREE.BoxGeometry(screenW - 0.03, screenH - 0.03, 0.005), matScreenFace, 0, screenCenterY, screenThick / 2 + 0.002);

      // Desktop Stand
      const standH = H - screenH;
      addMesh(new THREE.BoxGeometry(0.06, standH, 0.04), matAccent, 0, standH / 2, 0);
      addMesh(new THREE.BoxGeometry(screenW * 0.45, 0.015, D * 0.8), matAccent, 0, 0.008, 0);
      break;
    }

    case 'bed': {
      // Bed base plinth
      const plinthH = 0.22;
      addMesh(new THREE.BoxGeometry(W, plinthH, D), matSecondary, 0, plinthH / 2, 0);

      // Mattress
      const matH = 0.28;
      addMesh(new THREE.BoxGeometry(W - 0.06, matH, D - 0.06), matCushion, 0, plinthH + matH / 2, 0.02);

      // Headboard
      const headH = H;
      const headD = 0.12;
      addMesh(new THREE.BoxGeometry(W, headH, headD), matPrimary, 0, headH / 2, -D / 2 + headD / 2);

      // Two plush pillows
      const pillowW = (W - 0.3) / 2;
      const pillowD = 0.38;
      const pillowH = 0.12;
      const pillowY = plinthH + matH + pillowH / 2;
      addMesh(new THREE.BoxGeometry(pillowW, pillowH, pillowD), matCushion, -pillowW / 2 - 0.04, pillowY, -D / 2 + headD + pillowD / 2 + 0.04);
      addMesh(new THREE.BoxGeometry(pillowW, pillowH, pillowD), matCushion, pillowW / 2 + 0.04, pillowY, -D / 2 + headD + pillowD / 2 + 0.04);

      // Folded bed runner / duvet cover
      addMesh(new THREE.BoxGeometry(W - 0.04, 0.04, D * 0.45), matAccent, 0, plinthH + matH + 0.02, D / 2 - D * 0.22);
      break;
    }

    default: {
      // Fallback clean box
      addMesh(new THREE.BoxGeometry(W, H, D), matPrimary, 0, H / 2, 0);
      break;
    }
  }

  // Apple RoomPlan-style Bounding Wireframe (Active when selected or in scanner)
  const boxGeom = new THREE.BoxGeometry(W, H, D);
  const wireGeom = new THREE.EdgesGeometry(boxGeom);
  const wireColor = isSelected ? 0x007aff : 0x8e8e93;
  const wireMat = new THREE.LineBasicMaterial({
    color: wireColor,
    linewidth: isSelected ? 2 : 1,
    transparent: true,
    opacity: isSelected ? 0.95 : 0.25
  });
  const wireMesh = new THREE.LineSegments(wireGeom, wireMat);
  wireMesh.name = 'Wireframe';
  wireMesh.position.set(0, H / 2, 0);
  group.add(wireMesh);

  // Apply object spatial transforms
  group.position.set(obj.position.x, obj.position.y, obj.position.z);
  group.rotation.y = obj.rotation.yaw;

  return group;
}
