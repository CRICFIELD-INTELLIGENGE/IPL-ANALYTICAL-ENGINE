import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { NormalizedDelivery, getDeliveriesForBatter } from '../../lib/cricket3d/deliveryAdapter';
import type { BatterHandedness } from '../../lib/cricket3d/coordinateTransform';
import { CameraMode, CAMERA_PRESETS } from '../../lib/cricket3d/replayController';
import { createCricketGround } from './CricketGround';
import { createBoundaryRope } from './BoundaryRope';
import { createStadiumCrowd } from './StadiumCrowd';
import { createCricketBall } from './CricketBall';
import { createPlayerModels } from './PlayerModels';
import { createWagonWheel3D } from './WagonWheel3D';
import { BoundaryReplayController } from './BoundaryReplay';
import { stadiumAudio } from './StadiumAudio';
import { DeliveryTimeline } from './DeliveryTimeline';
import { DeliveryInfoPanel } from './DeliveryInfoPanel';

interface CricketStadium3DProps {
  batterName?: string;
  batterHandedness?: BatterHandedness;
  teamColorHex?: number;
  oppositionColorHex?: number;
  customDeliveries?: NormalizedDelivery[];
  className?: string;
}

export const CricketStadium3D: React.FC<CricketStadium3DProps> = ({
  batterName = 'Heinrich Klaasen',
  batterHandedness = 'RHB',
  teamColorHex = 0xf97316,
  oppositionColorHex = 0x38bdf8,
  customDeliveries,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Deliveries Dataset
  const [deliveries, setDeliveries] = useState<NormalizedDelivery[]>(() => {
    return customDeliveries || getDeliveriesForBatter(batterName);
  });

  const [selectedDelivery, setSelectedDelivery] = useState<NormalizedDelivery | null>(() => {
    const list = customDeliveries || getDeliveriesForBatter(batterName);
    return list.find(d => d.boundaryType === 'SIX') || list[0] || null;
  });

  // Controls state
  const [cameraMode, setCameraMode] = useState<CameraMode>('BROADCAST');
  const [lightingPreset, setLightingPreset] = useState<'NIGHT' | 'SUNSET' | 'DAY'>('NIGHT');
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [audioMuted, setAudioMuted] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'boundaries' | 'fours' | 'sixes'>('all');
  const [replayPhaseName, setReplayPhaseName] = useState<string>('Ready');

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const replayControllerRef = useRef<BoundaryReplayController | null>(null);
  const wagonWheelRef = useRef<ReturnType<typeof createWagonWheel3D> | null>(null);
  const crowdRef = useRef<ReturnType<typeof createStadiumCrowd> | null>(null);
  const ropeRef = useRef<ReturnType<typeof createBoundaryRope> | null>(null);
  const ballRef = useRef<ReturnType<typeof createCricketBall> | null>(null);
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    dir: THREE.DirectionalLight;
    spots: THREE.SpotLight[];
  } | null>(null);

  // Camera animation interpolation targets
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 38, 68));
  const targetCamLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.5, 0));

  // User Orbit / Drag interaction state
  const isDraggingRef = useRef<boolean>(false);
  const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbitAnglesRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: Math.PI / 4,
    radius: 78,
  });

  // Sync deliveries when batterName changes
  useEffect(() => {
    const list = customDeliveries || getDeliveriesForBatter(batterName);
    setDeliveries(list);
    const initial = list.find(d => d.boundaryType === 'SIX') || list[0] || null;
    setSelectedDelivery(initial);
    if (wagonWheelRef.current) {
      wagonWheelRef.current.setDeliveries(list);
      wagonWheelRef.current.highlightDelivery(initial ? initial.id : null);
    }
  }, [batterName, customDeliveries]);

  // Handle lighting atmosphere update
  useEffect(() => {
    if (!lightsRef.current || !sceneRef.current) return;
    const { ambient, dir, spots } = lightsRef.current;

    if (lightingPreset === 'NIGHT') {
      sceneRef.current.background = new THREE.Color(0x050814);
      sceneRef.current.fog = new THREE.FogExp2(0x050814, 0.0035);
      ambient.color.setHex(0x1e293b);
      ambient.intensity = 0.55;
      dir.color.setHex(0xe2e8f0);
      dir.intensity = 0.7;
      spots.forEach(s => {
        s.intensity = 2.4;
        s.color.setHex(0xf8fafc);
      });
    } else if (lightingPreset === 'SUNSET') {
      sceneRef.current.background = new THREE.Color(0x2a1215);
      sceneRef.current.fog = new THREE.FogExp2(0x2a1215, 0.004);
      ambient.color.setHex(0x7c2d12);
      ambient.intensity = 0.7;
      dir.color.setHex(0xfb923c);
      dir.intensity = 1.3;
      spots.forEach(s => {
        s.intensity = 1.2;
        s.color.setHex(0xfef08a);
      });
    } else {
      // DAY
      sceneRef.current.background = new THREE.Color(0x38bdf8);
      sceneRef.current.fog = new THREE.FogExp2(0xbae6fd, 0.002);
      ambient.color.setHex(0xffffff);
      ambient.intensity = 0.9;
      dir.color.setHex(0xfffbeb);
      dir.intensity = 1.8;
      spots.forEach(s => {
        s.intensity = 0.2;
      });
    }
  }, [lightingPreset]);

  // Handle Camera Mode change
  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraMode];
    if (preset) {
      // CameraPreset stores [x, y, z] tuples (lib/cricket3d/replayController.ts).
      targetCamPosRef.current.set(...preset.position);
      targetCamLookRef.current.set(...preset.target);
    }
  }, [cameraMode]);

  // Select delivery handler
  const handleSelectDelivery = useCallback((delivery: NormalizedDelivery) => {
    setSelectedDelivery(delivery);
    if (wagonWheelRef.current) {
      wagonWheelRef.current.highlightDelivery(delivery.id);
    }
    // Automatically trigger boundary replay on selection if user is in broadcast/ball follow
    if (replayControllerRef.current && (delivery.boundaryType === 'FOUR' || delivery.boundaryType === 'SIX')) {
      replayControllerRef.current.startReplay(delivery, playbackSpeed);
      setIsPlayingReplay(true);
    }
  }, [playbackSpeed]);

  // Play / Pause Replay
  const handlePlayReplay = () => {
    if (!selectedDelivery || !replayControllerRef.current) return;
    replayControllerRef.current.startReplay(selectedDelivery, playbackSpeed);
    setIsPlayingReplay(true);
  };

  const handlePauseReplay = () => {
    if (!replayControllerRef.current) return;
    replayControllerRef.current.pause();
    setIsPlayingReplay(false);
  };

  const handleToggleAudio = () => {
    const muted = stadiumAudio.toggleMute();
    setAudioMuted(muted);
  };

  // Next / Prev ball navigation
  const handleNextDelivery = () => {
    if (!selectedDelivery || deliveries.length === 0) return;
    const idx = deliveries.findIndex(d => d.id === selectedDelivery.id);
    if (idx >= 0 && idx < deliveries.length - 1) {
      handleSelectDelivery(deliveries[idx + 1]);
    }
  };

  const handlePrevDelivery = () => {
    if (!selectedDelivery || deliveries.length === 0) return;
    const idx = deliveries.findIndex(d => d.id === selectedDelivery.id);
    if (idx > 0) {
      handleSelectDelivery(deliveries[idx - 1]);
    }
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 900;
    const height = 540;

    // 1. SCENE & CAMERA
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050814);
    scene.fog = new THREE.FogExp2(0x050814, 0.0035);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 800);
    cameraRef.current = camera;
    camera.position.set(0, 38, 68);
    camera.lookAt(0, 1.5, 0);

    // 2. RENDERER
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. LIGHTING
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe2e8f0, 0.7);
    sunLight.position.set(20, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;
    const d = 75;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 4 Stadium Floodlight Towers Spotlights
    const spots: THREE.SpotLight[] = [];
    const towerCoords = [
      { x: 62, z: 62 },
      { x: -62, z: 62 },
      { x: 62, z: -62 },
      { x: -62, z: -62 },
    ];
    towerCoords.forEach(c => {
      const spot = new THREE.SpotLight(0xf8fafc, 2.2, 140, Math.PI / 4, 0.4, 1);
      spot.position.set(c.x, 34, c.z);
      spot.target.position.set(0, 0, 0);
      scene.add(spot);
      scene.add(spot.target);
      spots.push(spot);
    });

    lightsRef.current = {
      ambient: ambientLight,
      dir: sunLight,
      spots,
    };

    // 4. ADD PROCEDURAL 3D CRICKET STADIUM COMPONENTS
    const ground = createCricketGround();
    scene.add(ground);

    const rope = createBoundaryRope();
    scene.add(rope.group);
    ropeRef.current = rope;

    const crowd = createStadiumCrowd();
    scene.add(crowd.group);
    crowdRef.current = crowd;

    const ball = createCricketBall();
    scene.add(ball.group);
    ballRef.current = ball;

    const players = createPlayerModels(teamColorHex, oppositionColorHex, batterHandedness);
    scene.add(players);

    // 5. 3D WAGON WHEEL SPATIAL OVERLAY
    const wagonWheel = createWagonWheel3D((delivery) => {
      handleSelectDelivery(delivery);
    });
    scene.add(wagonWheel.group);
    wagonWheel.setDeliveries(deliveries);
    if (selectedDelivery) {
      wagonWheel.highlightDelivery(selectedDelivery.id);
    }
    wagonWheelRef.current = wagonWheel;

    // 6. BOUNDARY REPLAY ENGINE
    const replayController = new BoundaryReplayController(
      (pos, rot) => {
        if (ballRef.current) {
          ballRef.current.setPosition(pos, rot);
        }
      },
      (cheering, isSix) => {
        if (crowdRef.current) {
          crowdRef.current.setCheering(cheering, isSix);
        }
      },
      (phase) => {
        const labels: Record<string, string> = {
          IDLE: 'Ready',
          PHASE_1_CONTACT: 'Bat Contact 💥',
          PHASE_2_BALL_TRAVEL: 'Ball in Travel 🏏',
          PHASE_3_BOUNDARY: 'Boundary Crossed! 🚨',
          PHASE_4_CROWD_REACTION: 'Stadium Roar! 🎉',
          PHASE_5_COMPLETE: 'Replay Finished',
        };
        setReplayPhaseName(labels[phase] || phase);
        if (phase === 'PHASE_5_COMPLETE' || phase === 'IDLE') {
          setIsPlayingReplay(false);
        }
      }
    );
    replayControllerRef.current = replayController;

    // Start initial replay if selected delivery exists
    if (selectedDelivery && (selectedDelivery.boundaryType === 'FOUR' || selectedDelivery.boundaryType === 'SIX')) {
      replayController.startReplay(selectedDelivery, playbackSpeed);
      setIsPlayingReplay(true);
    }

    // 7. ANIMATION LOOP
    let animationFrameId: number;
    let lastTime = performance.now();
    const currentLookAt = new THREE.Vector3(0, 1.5, 0);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update LED Perimeter Boards & Stadium Crowd
      if (ropeRef.current) ropeRef.current.updateLED(delta);
      if (crowdRef.current) crowdRef.current.updateCrowd(delta);

      // Update Replay Controller
      if (replayControllerRef.current) {
        replayControllerRef.current.update(delta);
      }

      // Smooth Camera Lerp
      if (cameraRef.current) {
        const cam = cameraRef.current;
        if (!isDraggingRef.current) {
          cam.position.lerp(targetCamPosRef.current, 0.04);
          currentLookAt.lerp(targetCamLookRef.current, 0.05);
          cam.lookAt(currentLookAt);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. RESIZE LISTENER
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = 540;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // CLEANUP
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Raycast interaction on canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current || !wagonWheelRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const hit = wagonWheelRef.current.handleClick(raycaster);
    if (!hit) {
      // Check if user clicked ground sector
      // Can be extended to ground sector queries
    }
  };

  // Drag to Orbit Mouse Listeners
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !cameraRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    orbitAnglesRef.current.theta -= deltaX * 0.008;
    orbitAnglesRef.current.phi = Math.max(
      0.15,
      Math.min(Math.PI / 2.1, orbitAnglesRef.current.phi + deltaY * 0.008)
    );

    const r = orbitAnglesRef.current.radius;
    const x = r * Math.sin(orbitAnglesRef.current.phi) * Math.sin(orbitAnglesRef.current.theta);
    const y = r * Math.cos(orbitAnglesRef.current.phi);
    const z = r * Math.sin(orbitAnglesRef.current.phi) * Math.cos(orbitAnglesRef.current.theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 1.5, 0);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Wheel to Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!cameraRef.current) return;
    const zoomFactor = e.deltaY * 0.05;
    orbitAnglesRef.current.radius = Math.max(20, Math.min(130, orbitAnglesRef.current.radius + zoomFactor));
    const r = orbitAnglesRef.current.radius;
    const x = r * Math.sin(orbitAnglesRef.current.phi) * Math.sin(orbitAnglesRef.current.theta);
    const y = r * Math.cos(orbitAnglesRef.current.phi);
    const z = r * Math.sin(orbitAnglesRef.current.phi) * Math.cos(orbitAnglesRef.current.theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 1.5, 0);
  };

  return (
    <div ref={containerRef} className={`w-full flex flex-col gap-4 font-sans select-none ${className}`}>
      {/* 3D Stadium Canvas Viewport */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 bg-[#050814] shadow-2xl group">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* Floating Broadcast HUD Overlay: Top Left */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#080d19]/85 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-xl shadow-lg pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              3D Stadium Telemetry Engine
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{batterName} ({batterHandedness})</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                {replayPhaseName}
              </span>
            </div>
          </div>
        </div>

        {/* Floating Broadcast HUD Overlay: Top Right Legend */}
        <div className="absolute top-3 right-3 hidden sm:flex items-center gap-2 bg-[#080d19]/85 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-xl shadow-lg pointer-events-none text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-slate-300">6s</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span className="text-slate-300">4s</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">2s</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">1s</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span className="text-slate-400">Dots</span>
          </div>
        </div>

        {/* Floating Gesture Guide: Bottom Left */}
        <div className="absolute bottom-3 left-3 bg-[#080d19]/75 backdrop-blur-sm border border-slate-800/70 px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-400 pointer-events-none">
          🖱️ Drag to rotate 360° • Scroll to zoom • Click shot line for telemetry
        </div>
      </div>

      {/* Ball-by-Ball Timeline Strip */}
      <DeliveryTimeline
        deliveries={deliveries}
        selectedDeliveryId={selectedDelivery?.id || null}
        onSelectDelivery={handleSelectDelivery}
        filterMode={filterMode}
        onFilterChange={setFilterMode}
      />

      {/* Detailed Delivery Telemetry & Replay HUD */}
      <DeliveryInfoPanel
        delivery={selectedDelivery}
        cameraMode={cameraMode}
        onCameraModeChange={setCameraMode}
        lightingPreset={lightingPreset}
        onLightingChange={setLightingPreset}
        isPlayingReplay={isPlayingReplay}
        onPlayReplay={handlePlayReplay}
        onPauseReplay={handlePauseReplay}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        audioMuted={audioMuted}
        onToggleAudio={handleToggleAudio}
        onNextDelivery={handleNextDelivery}
        onPrevDelivery={handlePrevDelivery}
      />
    </div>
  );
};
