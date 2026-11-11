/**
 * IPL Intelligence OS × Beyond XI
 * 3D Cricket Ground, Outfield, Pitch & Stumps
 */

import * as THREE from "three";

export function createCricketGround(): THREE.Group {
  const group = new THREE.Group();
  group.name = "CricketGround";

  // 1. PROCEDURAL MOWING PATTERN TEXTURE
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Rich turf green base
    ctx.fillStyle = "#15803d";
    ctx.fillRect(0, 0, 1024, 1024);

    // Radial mowing concentric grass bands
    const center = 512;
    for (let r = 500; r > 0; r -= 40) {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.fillStyle = (r / 40) % 2 === 0 ? "#166534" : "#15803d";
      ctx.fill();
    }

    // Light radial grass sheen stripes
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, 512, angle, angle + Math.PI / 36);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "rgba(22, 163, 74, 0.15)" : "rgba(20, 83, 45, 0.15)";
      ctx.fill();
    }
  }

  const turfTexture = new THREE.CanvasTexture(canvas);
  turfTexture.wrapS = THREE.ClampToEdgeWrapping;
  turfTexture.wrapT = THREE.ClampToEdgeWrapping;

  // 2. OUTFIELD PLAYING SURFACE (Radius ~72m)
  const outfieldGeo = new THREE.CircleGeometry(72, 64);
  const outfieldMat = new THREE.MeshStandardMaterial({
    map: turfTexture,
    roughness: 0.85,
    metalness: 0.05,
  });
  const outfieldMesh = new THREE.Mesh(outfieldGeo, outfieldMat);
  outfieldMesh.rotation.x = -Math.PI / 2;
  outfieldMesh.receiveShadow = true;
  group.add(outfieldMesh);

  // 3. 30-YARD INNER FIELD CIRCLE (Radius 27.4m)
  const circleGeo = new THREE.RingGeometry(27.2, 27.5, 64);
  const circleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const innerCircle = new THREE.Mesh(circleGeo, circleMat);
  innerCircle.rotation.x = -Math.PI / 2;
  innerCircle.position.y = 0.02;
  group.add(innerCircle);

  // 15 FIELDING DISC MARKERS ON 30-YARD CIRCLE
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const discGeo = new THREE.CircleGeometry(0.35, 16);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(Math.cos(angle) * 27.35, 0.025, Math.sin(angle) * 27.35);
    group.add(disc);
  }

  // 4. CENTRAL CRICKET PITCH (20.12m x 3.05m x 0.04m)
  const pitchGeo = new THREE.PlaneGeometry(3.05, 20.12);
  const pitchMat = new THREE.MeshStandardMaterial({
    color: 0x9a6a38, // Real clay soil hue
    roughness: 0.9,
    metalness: 0.0,
  });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.position.set(0, 0.03, 0);
  pitchMesh.receiveShadow = true;
  group.add(pitchMesh);

  // CREASE LINES (Popping creases at Z = 8.9 and Z = -8.9)
  const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const poppingCreaseGeo = new THREE.PlaneGeometry(2.6, 0.08);

  // Striker's popping crease
  const strikerCrease = new THREE.Mesh(poppingCreaseGeo, creaseMat);
  strikerCrease.rotation.x = -Math.PI / 2;
  strikerCrease.position.set(0, 0.035, 8.9);
  group.add(strikerCrease);

  // Bowler's popping crease
  const bowlerCrease = new THREE.Mesh(poppingCreaseGeo, creaseMat);
  bowlerCrease.rotation.x = -Math.PI / 2;
  bowlerCrease.position.set(0, 0.035, -8.9);
  group.add(bowlerCrease);

  // 5. THREE-DIMENSIONAL STUMPS & BAILS
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6 });
  const bailMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });

  const createStumps = (zPos: number) => {
    const stumpsGroup = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const stumpGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.71, 12);
      const stump = new THREE.Mesh(stumpGeo, stumpMat);
      stump.position.set(i * 0.11, 0.355, zPos);
      stump.castShadow = true;
      stumpsGroup.add(stump);
    }
    // Bails
    const bailGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8);
    const bail = new THREE.Mesh(bailGeo, bailMat);
    bail.rotation.z = Math.PI / 2;
    bail.position.set(0, 0.72, zPos);
    stumpsGroup.add(bail);
    return stumpsGroup;
  };

  group.add(createStumps(10.0)); // Batting End
  group.add(createStumps(-10.0)); // Bowling End

  return group;
}
