/**
 * IPL Intelligence OS × Beyond XI
 * 3D Stadium Grandstands, Tiered Bowl, Floodlights & Instanced Crowd System
 */

import * as THREE from "three";

export function createStadiumCrowd(): {
  group: THREE.Group;
  setCheering: (isCheering: boolean, isSix: boolean) => void;
  updateCrowd: (delta: number) => void;
} {
  const group = new THREE.Group();
  group.name = "StadiumCrowd";

  // 1. TIERED CONCRETE GRANDSTANDS (3 Concourse Tiers)
  const standMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const tier1Geo = new THREE.CylinderGeometry(78, 72, 3.5, 64, 1, true);
  const tier1 = new THREE.Mesh(tier1Geo, standMat);
  tier1.position.y = 1.75;
  group.add(tier1);

  const tier2Geo = new THREE.CylinderGeometry(85, 79, 4.5, 64, 1, true);
  const tier2 = new THREE.Mesh(tier2Geo, standMat);
  tier2.position.y = 5.75;
  group.add(tier2);

  const tier3Geo = new THREE.CylinderGeometry(92, 86, 5.5, 64, 1, true);
  const tier3 = new THREE.Mesh(tier3Geo, standMat);
  tier3.position.y = 10.75;
  group.add(tier3);

  // 2. 4 HIGH-MAST FLOODLIGHT TOWERS (At 4 Quadrants: NE, NW, SE, SW)
  const towerPositions = [
    { x: 75, z: 75 },
    { x: -75, z: 75 },
    { x: 75, z: -75 },
    { x: -75, z: -75 },
  ];

  const towerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
  const lightHeadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  towerPositions.forEach(pos => {
    // Tower Pylon Mast
    const mastGeo = new THREE.CylinderGeometry(0.8, 1.4, 38, 8);
    const mast = new THREE.Mesh(mastGeo, towerMat);
    mast.position.set(pos.x, 19, pos.z);
    group.add(mast);

    // Floodlight Head Gantry
    const gantryGeo = new THREE.BoxGeometry(6, 3, 2);
    const gantry = new THREE.Mesh(gantryGeo, lightHeadMat);
    gantry.position.set(pos.x, 38, pos.z);
    gantry.lookAt(0, 0, 0);
    group.add(gantry);

    // Spotlight pointing at central pitch
    const spot = new THREE.SpotLight(0xf8fafc, 3.5, 180, Math.PI / 4, 0.4, 1.2);
    spot.position.set(pos.x, 38, pos.z);
    spot.target.position.set(0, 0, 0);
    group.add(spot);
    group.add(spot.target);
  });

  // 3. GPU-ACCELERATED INSTANCED SPECTATOR MESH (1,200 Spectators)
  const spectatorCount = 1200;
  const spectatorGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 6);
  const spectatorMat = new THREE.MeshStandardMaterial({
    roughness: 0.7,
    metalness: 0.1,
  });

  const instancedMesh = new THREE.InstancedMesh(spectatorGeo, spectatorMat, spectatorCount);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // Franchise colors: Orange (SRH), Gold (CSK), Blue (MI/DC), Red (RCB), Purple (KKR), Pink (RR), White
  const palette = [
    new THREE.Color(0xf97316),
    new THREE.Color(0xfacc15),
    new THREE.Color(0x38bdf8),
    new THREE.Color(0xef4444),
    new THREE.Color(0xa855f7),
    new THREE.Color(0xec4899),
    new THREE.Color(0xffffff),
    new THREE.Color(0x10b981),
  ];

  const dummy = new THREE.Object3D();
  const spectatorBaseY: number[] = [];
  const spectatorPhases: number[] = [];

  let idx = 0;
  // Distribute across 3 concentric seating rows
  const rowRadii = [75, 82, 89];
  const rowHeights = [3.6, 7.8, 13.2];

  for (let row = 0; row < 3; row++) {
    const r = rowRadii[row];
    const h = rowHeights[row];
    const perRow = spectatorCount / 3;

    for (let i = 0; i < perRow; i++) {
      const angle = (i / perRow) * Math.PI * 2 + (row * 0.1);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      dummy.position.set(x, h, z);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(idx, dummy.matrix);
      instancedMesh.setColorAt(idx, palette[idx % palette.length]);

      spectatorBaseY[idx] = h;
      spectatorPhases[idx] = Math.random() * Math.PI * 2;
      idx++;
    }
  }

  instancedMesh.instanceColor!.needsUpdate = true;
  group.add(instancedMesh);

  let isCrowdCheering = false;
  let isSixEvent = false;
  let animTime = 0;

  const setCheering = (cheering: boolean, six: boolean) => {
    isCrowdCheering = cheering;
    isSixEvent = six;
  };

  const updateCrowd = (delta: number) => {
    animTime += delta;
    if (!isCrowdCheering) return;

    for (let i = 0; i < spectatorCount; i++) {
      instancedMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      const bounceSpeed = isSixEvent ? 12 : 7;
      const bounceHeight = isSixEvent ? 0.6 : 0.3;
      dummy.position.y = spectatorBaseY[i] + Math.abs(Math.sin(animTime * bounceSpeed + spectatorPhases[i])) * bounceHeight;

      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
  };

  return { group, setCheering, updateCrowd };
}
