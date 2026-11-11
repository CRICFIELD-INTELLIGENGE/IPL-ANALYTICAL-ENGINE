/**
 * IPL Intelligence OS × Beyond XI
 * 3D Boundary Rope & Perimeter LED Advertising Boards
 */

import * as THREE from "three";

export function createBoundaryRope(): { group: THREE.Group; updateLED: (delta: number) => void } {
  const group = new THREE.Group();
  group.name = "BoundaryRope";

  const boundaryRadius = 68;

  // 1. THREE-DIMENSIONAL BOUNDARY ROPE (Torus geometry at turf surface)
  const ropeGeo = new THREE.TorusGeometry(boundaryRadius, 0.12, 16, 128);
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
  ropeMesh.rotation.x = Math.PI / 2;
  ropeMesh.position.y = 0.08;
  ropeMesh.receiveShadow = true;
  group.add(ropeMesh);

  // 2. PERIMETER LED ADVERTISING BOARDS (Concentric ring beyond boundary)
  const ledCanvas = document.createElement("canvas");
  ledCanvas.width = 2048;
  ledCanvas.height = 128;
  const ctx = ledCanvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(0, 0, 2048, 128);

    // Glowing electronic sponsor boards
    const banners = [
      "IPL 2026 OFFICIAL INTEL",
      "BEYOND XI",
      "POWERPLAY RADAR",
      "DECISION INTELLIGENCE",
      "HAWKEYE TRACKER",
      "TATA IPL",
      "QUANT ANALYTICS",
      "BEYOND XI",
    ];
    ctx.font = "bold 44px monospace";
    ctx.textBaseline = "middle";
    banners.forEach((banner, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? "#facc15" : "#38bdf8";
      ctx.fillText(banner, idx * 256 + 20, 64);
    });
  }

  const ledTexture = new THREE.CanvasTexture(ledCanvas);
  ledTexture.wrapS = THREE.RepeatWrapping;
  ledTexture.repeat.set(12, 1);

  const boardGeo = new THREE.CylinderGeometry(70.2, 70.2, 1.2, 128, 1, true);
  const boardMat = new THREE.MeshBasicMaterial({
    map: ledTexture,
    side: THREE.DoubleSide,
  });
  const boardsMesh = new THREE.Mesh(boardGeo, boardMat);
  boardsMesh.position.y = 0.6;
  group.add(boardsMesh);

  // Update animation ticker
  const updateLED = (delta: number) => {
    ledTexture.offset.x += delta * 0.04;
  };

  return { group, updateLED };
}
