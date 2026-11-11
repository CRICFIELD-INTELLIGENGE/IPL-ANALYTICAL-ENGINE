/**
 * IPL Intelligence OS × Beyond XI
 * 3D Textured Cricket Ball & Shadow Model
 */

import * as THREE from "three";
import { Vector3D } from "../../lib/cricket3d/coordinateTransform";

export function createCricketBall(): {
  group: THREE.Group;
  setPosition: (pos: Vector3D, rot: Vector3D) => void;
  setVisible: (visible: boolean) => void;
} {
  const group = new THREE.Group();
  group.name = "CricketBall";

  // Regulation cricket ball radius scaled appropriately (~0.25 units for crisp visual fidelity in 3D stadium)
  const ballGeo = new THREE.SphereGeometry(0.24, 24, 24);

  // Procedural Kookaburra White / Pink / Red leather ball texture with seam
  const ballCanvas = document.createElement("canvas");
  ballCanvas.width = 256;
  ballCanvas.height = 256;
  const ctx = ballCanvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff"; // White Kookaburra ball for IPL Night Matches
    ctx.fillRect(0, 0, 256, 256);
    // Dark stitched seam around equator
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 124, 256, 8);
    // Stitch dots
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 256; i += 12) {
      ctx.fillRect(i, 126, 4, 4);
    }
  }

  const ballTexture = new THREE.CanvasTexture(ballCanvas);
  const ballMat = new THREE.MeshStandardMaterial({
    map: ballTexture,
    roughness: 0.3,
    metalness: 0.1,
  });

  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  group.add(ballMesh);

  // Dynamic Ground Shadow Plane directly underneath the ball
  const shadowGeo = new THREE.CircleGeometry(0.35, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.04;
  group.add(shadowMesh);

  const setPosition = (pos: Vector3D, rot: Vector3D) => {
    ballMesh.position.set(pos.x, pos.y, pos.z);
    ballMesh.rotation.set(rot.x, rot.y, rot.z);

    // Shadow moves on ground plane right below ball, fading with height
    shadowMesh.position.set(pos.x, 0.04, pos.z);
    const heightFactor = Math.max(0.1, 1 - (pos.y / 24));
    shadowMesh.scale.set(1 + pos.y * 0.06, 1 + pos.y * 0.06, 1);
    shadowMat.opacity = 0.45 * heightFactor;
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
  };

  return { group, setPosition, setVisible };
}
