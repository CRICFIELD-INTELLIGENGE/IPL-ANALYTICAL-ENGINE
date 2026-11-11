/**
 * IPL Intelligence OS × Beyond XI
 * 3D Wagon Wheel Spatial Engine
 * 
 * Visual Encoding:
 * - Dot balls: Muted Grey (#64748b)
 * - Singles: Cyan (#06b6d4)
 * - Twos: Green (#22c55e)
 * - Threes: Teal (#14b8a6)
 * - Fours: Electric Blue (#38bdf8)
 * - Sixes: Radiant Gold (#fbbf24)
 */

import * as THREE from "three";
import { NormalizedDelivery } from "../../lib/cricket3d/deliveryAdapter";

export function createWagonWheel3D(
  onSelectDelivery: (delivery: NormalizedDelivery) => void
): {
  group: THREE.Group;
  setDeliveries: (deliveries: NormalizedDelivery[]) => void;
  highlightDelivery: (deliveryId: string | null) => void;
  handleClick: (raycaster: THREE.Raycaster) => boolean;
} {
  const group = new THREE.Group();
  group.name = "WagonWheel3D";

  let currentDeliveries: NormalizedDelivery[] = [];
  let markerMeshes: { mesh: THREE.Mesh; delivery: NormalizedDelivery }[] = [];
  let tracerLines: THREE.Line[] = [];

  const getColor = (boundaryType: string): number => {
    switch (boundaryType) {
      case "SIX":
        return 0xfbbf24; // Radiant Gold
      case "FOUR":
        return 0x38bdf8; // Electric Blue
      case "THREE":
        return 0x14b8a6; // Teal
      case "TWO":
        return 0x22c55e; // Green
      case "SINGLE":
        return 0x06b6d4; // Cyan
      default:
        return 0x64748b; // Muted Grey
    }
  };

  const clearWheel = () => {
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) (obj as any).material.dispose();
    }
    markerMeshes = [];
    tracerLines = [];
  };

  const setDeliveries = (deliveries: NormalizedDelivery[]) => {
    clearWheel();
    currentDeliveries = deliveries;

    deliveries.forEach(del => {
      const color = getColor(del.boundaryType);
      const points: THREE.Vector3[] = [];

      // Extract 3D points from trajectory
      del.trajectory.samples.forEach(s => {
        points.push(new THREE.Vector3(s.position.x, s.position.y + 0.05, s.position.z));
      });

      // 1. THREE-DIMENSIONAL TRACER LINE
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color,
        linewidth: del.boundaryType === "SIX" || del.boundaryType === "FOUR" ? 3 : 1.5,
        transparent: true,
        opacity: 0.85,
      });
      const line = new THREE.Line(curveGeo, lineMat);
      line.userData = { deliveryId: del.id };
      group.add(line);
      tracerLines.push(line);

      // 2. LANDING SPATIAL MARKER AT TERMINUS
      const lastPoint = points[points.length - 1];
      const markerRadius = del.boundaryType === "SIX" ? 0.9 : del.boundaryType === "FOUR" ? 0.7 : 0.45;
      const markerGeo = new THREE.SphereGeometry(markerRadius, 16, 16);
      const markerMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.2,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(lastPoint);
      marker.userData = { deliveryId: del.id };

      group.add(marker);
      markerMeshes.push({ mesh: marker, delivery: del });
    });
  };

  const highlightDelivery = (deliveryId: string | null) => {
    markerMeshes.forEach(({ mesh, delivery }) => {
      const isSelected = delivery.id === deliveryId;
      const baseColor = getColor(delivery.boundaryType);
      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (!deliveryId) {
        mat.emissiveIntensity = 0.4;
        mesh.scale.set(1, 1, 1);
      } else if (isSelected) {
        mat.emissiveIntensity = 1.0;
        mesh.scale.set(1.5, 1.5, 1.5);
      } else {
        mat.emissiveIntensity = 0.1;
        mesh.scale.set(0.7, 0.7, 0.7);
      }
    });

    tracerLines.forEach(line => {
      const mat = line.material as THREE.LineBasicMaterial;
      if (!deliveryId) {
        mat.opacity = 0.85;
      } else if (line.userData.deliveryId === deliveryId) {
        mat.opacity = 1.0;
      } else {
        mat.opacity = 0.2;
      }
    });
  };

  const handleClick = (raycaster: THREE.Raycaster): boolean => {
    const meshes = markerMeshes.map(m => m.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const found = markerMeshes.find(m => m.mesh === hitMesh);
      if (found) {
        onSelectDelivery(found.delivery);
        return true;
      }
    }
    return false;
  };

  return { group, setDeliveries, highlightDelivery, handleClick };
}
