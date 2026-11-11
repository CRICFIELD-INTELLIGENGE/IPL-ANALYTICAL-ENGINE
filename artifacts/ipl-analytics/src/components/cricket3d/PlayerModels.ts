/**
 * IPL Intelligence OS × Beyond XI
 * 3D Procedural Cricketer Models & Fielding Positions
 */

import * as THREE from "three";
import { BatterHandedness } from "../../lib/cricket3d/coordinateTransform";

export function createPlayerModels(
  teamColorHex: number = 0xf97316,
  oppositionColorHex: number = 0x38bdf8,
  handedness: BatterHandedness = "RHB"
): THREE.Group {
  const group = new THREE.Group();
  group.name = "PlayerModels";

  const battingMat = new THREE.MeshStandardMaterial({ color: teamColorHex, roughness: 0.6 });
  const bowlingMat = new THREE.MeshStandardMaterial({ color: oppositionColorHex, roughness: 0.6 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const batWoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2a76f, roughness: 0.8 });

  // Helper to build a clean low-poly athletic cricketer model
  const createCricketer = (
    isBatter: boolean = false,
    batHandedness: BatterHandedness = "RHB"
  ): THREE.Group => {
    const player = new THREE.Group();

    // Torso / Jersey
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.9, 8);
    const torso = new THREE.Mesh(torsoGeo, isBatter ? battingMat : bowlingMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    player.add(torso);

    // Head / Helmet
    const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const head = new THREE.Mesh(headGeo, isBatter ? battingMat : skinMat);
    head.position.y = 1.78;
    head.castShadow = true;
    player.add(head);

    // Legs / Pads
    for (let side = -1; side <= 1; side += 2) {
      const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.75, 8);
      const leg = new THREE.Mesh(legGeo, isBatter ? padMat : bowlingMat);
      leg.position.set(side * 0.18, 0.38, 0);
      leg.castShadow = true;
      player.add(leg);
    }

    // If batter, add cricket bat
    if (isBatter) {
      const batGeo = new THREE.BoxGeometry(0.12, 0.85, 0.05);
      const bat = new THREE.Mesh(batGeo, batWoodMat);
      const flip = batHandedness === "LHB" ? -1 : 1;
      bat.position.set(flip * 0.38, 0.45, 0.15);
      bat.rotation.set(0.2, 0, flip * -0.4);
      bat.castShadow = true;
      player.add(bat);
    }

    return player;
  };

  // 1. STRIKER BATTER (At batting crease: X=0, Z=9.2)
  const striker = createCricketer(true, handedness);
  striker.position.set(0, 0, 9.2);
  striker.lookAt(0, 0, -10); // Facing the incoming bowler
  group.add(striker);

  // 2. NON-STRIKER BATTER (At bowling crease: X=1.2, Z=-9.2)
  const nonStriker = createCricketer(true, "RHB");
  nonStriker.position.set(1.2, 0, -9.2);
  nonStriker.lookAt(0, 0, 10);
  group.add(nonStriker);

  // 3. WICKETKEEPER (Behind stumps: X=0, Z=12.2)
  const keeper = createCricketer(false);
  keeper.position.set(0, 0, 12.2);
  keeper.lookAt(0, 0, 9);
  group.add(keeper);

  // 4. BOWLER (At bowling end: X=0, Z=-11.2)
  const bowler = createCricketer(false);
  bowler.position.set(0, 0, -11.2);
  bowler.lookAt(0, 0, 10);
  group.add(bowler);

  // 5. REGULATION FIELDING POSITIONS
  const fieldingPositions = [
    { name: "First Slip", x: -2.8, z: 12.8 },
    { name: "Point", x: -22, z: 4 },
    { name: "Cover", x: -26, z: -8 },
    { name: "Mid-off", x: -14, z: -18 },
    { name: "Mid-on", x: 14, z: -18 },
    { name: "Mid-wicket", x: 24, z: -6 },
    { name: "Square Leg", x: 22, z: 8 },
    { name: "Deep Fine Leg", x: 38, z: 42 },
    { name: "Deep Third Man", x: -36, z: 44 },
  ];

  fieldingPositions.forEach(pos => {
    const fielder = createCricketer(false);
    fielder.position.set(pos.x, 0, pos.z);
    fielder.lookAt(0, 0, 9.2); // All fielders watching the striker
    group.add(fielder);
  });

  return group;
}
