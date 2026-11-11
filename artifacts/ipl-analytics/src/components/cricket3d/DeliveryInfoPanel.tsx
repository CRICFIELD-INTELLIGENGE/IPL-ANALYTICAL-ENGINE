import React from 'react';
import { NormalizedDelivery } from '../../lib/cricket3d/deliveryAdapter';
import { CameraMode } from '../../lib/cricket3d/replayController';

interface DeliveryInfoPanelProps {
  delivery: NormalizedDelivery | null;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  lightingPreset: 'NIGHT' | 'SUNSET' | 'DAY';
  onLightingChange: (preset: 'NIGHT' | 'SUNSET' | 'DAY') => void;
  isPlayingReplay: boolean;
  onPlayReplay: () => void;
  onPauseReplay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  audioMuted: boolean;
  onToggleAudio: () => void;
  onNextDelivery?: () => void;
  onPrevDelivery?: () => void;
}

export const DeliveryInfoPanel: React.FC<DeliveryInfoPanelProps> = ({
  delivery,
  cameraMode,
  onCameraModeChange,
  lightingPreset,
  onLightingChange,
  isPlayingReplay,
  onPlayReplay,
  onPauseReplay,
  playbackSpeed,
  onSpeedChange,
  audioMuted,
  onToggleAudio,
  onNextDelivery,
  onPrevDelivery,
}) => {
  if (!delivery) {
    return (
      <div className="bg-[#080d19]/90 border border-slate-800/80 rounded-xl p-4 text-center text-slate-400 text-xs">
        Select a delivery from the timeline or click a shot on the 3D wagon wheel to view telemetry.
      </div>
    );
  }

  const isSix = delivery.boundaryType === 'SIX';
  const isFour = delivery.boundaryType === 'FOUR';

  const confidenceBadge = {
    VERIFIED_TRACKING: {
      label: 'VERIFIED TRACKING',
      desc: 'Synchronized with broadcast ball-tracking telemetry',
      bg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
      dot: 'bg-emerald-400',
    },
    SECTOR_RECORDED: {
      label: 'SECTOR RECORDED',
      desc: 'Zone & boundary validated via live match commentary',
      bg: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
      dot: 'bg-amber-400',
    },
    EVENT_RECONSTRUCTION: {
      label: 'EVENT RECONSTRUCTION',
      desc: 'Scorecard verified; physics trajectory reconstructed',
      bg: 'bg-sky-950/80 border-sky-500/60 text-sky-300',
      dot: 'bg-sky-400',
    },
  }[delivery.coordinateConfidence];

  return (
    <div className="bg-[#080d19]/95 border border-slate-800/90 rounded-xl p-4 backdrop-blur-md shadow-2xl flex flex-col gap-3 text-slate-200">
      {/* Top Banner: Match & Over */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            IPL {delivery.season}
          </span>
          <span className="text-xs font-semibold text-slate-300">
            Over {delivery.over}.{delivery.ball} (Inn {delivery.innings})
          </span>
          <span className="text-[11px] text-slate-400">
            {delivery.battingTeam} vs {delivery.bowlingTeam}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onPrevDelivery && (
            <button
              onClick={onPrevDelivery}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 font-mono transition"
              title="Previous Ball"
            >
              ◀ Prev
            </button>
          )}
          {onNextDelivery && (
            <button
              onClick={onNextDelivery}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 font-mono transition"
              title="Next Ball"
            >
              Next ▶
            </button>
          )}
        </div>
      </div>

      {/* Main Delivery Telemetry Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Column 1: Batter & Bowler */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Striker</div>
            <div className="text-sm font-bold text-white flex items-center justify-between">
              <span>{delivery.batterName}</span>
              <span className={`text-base font-black px-2 py-0.5 rounded ${
                isSix ? 'bg-amber-500 text-black' : isFour ? 'bg-sky-500 text-black' : 'bg-slate-700 text-white'
              }`}>
                {isSix ? '6 RUNS' : isFour ? '4 RUNS' : `${delivery.runsOffBat} RUN`}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <div className="text-[10px] font-mono uppercase text-slate-400">Bowler</div>
            <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>{delivery.bowlerName}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {delivery.bowlerType} {delivery.speedKmh ? `• ${delivery.speedKmh} km/h` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Trajectory & Direction */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Shot Sector</div>
            <div className="text-sm font-bold text-cyan-300 flex items-center justify-between">
              <span>{delivery.shotDirection}</span>
              <span className="text-xs font-mono text-slate-400">{delivery.shotAngleDeg}°</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">Shot Distance</div>
              <div className="text-xs font-mono font-bold text-white">
                {delivery.distanceMeters.toFixed(1)} meters
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-slate-400">Phase</div>
              <div className="text-xs font-mono font-medium text-slate-300">
                {delivery.phase}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Data Confidence & Telemetry Source */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Data Confidence</div>
            <div className={`px-2 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1.5 ${confidenceBadge.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${confidenceBadge.dot} animate-pulse`}></span>
              <span>{confidenceBadge.label}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 leading-tight">
              {confidenceBadge.desc}
            </div>
          </div>
          <div className="mt-2 text-[9px] font-mono text-slate-500">
            Source: {delivery.dataSource}
          </div>
        </div>
      </div>

      {/* Commentary text if present */}
      {delivery.commentary && (
        <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-2 text-xs text-slate-300 italic flex items-center gap-2">
          <span className="text-blue-400 not-italic font-bold text-[10px] font-mono uppercase">Live Call:</span>
          <span>"{delivery.commentary}"</span>
        </div>
      )}

      {/* Control Strip: Camera Mode & Lighting & Playback */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Replay Play/Pause & Speed */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPlayingReplay ? onPauseReplay : onPlayReplay}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
              isPlayingReplay
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <span>{isPlayingReplay ? '⏸ Pause Replay' : '▶ Replay Boundary'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
            {[0.5, 1.0, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-1 rounded transition ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-1.5 rounded-lg border text-xs transition ${
              audioMuted
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-cyan-950 border-cyan-700 text-cyan-300'
            }`}
            title={audioMuted ? 'Unmute Stadium Audio' : 'Mute Stadium Audio'}
          >
            {audioMuted ? '🔇 Audio Off' : '🔊 Audio On'}
          </button>
        </div>

        {/* Camera Views Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
          <span className="text-slate-500 px-2 uppercase font-semibold">Camera:</span>
          {(['BROADCAST', 'BATTER_POV', 'AERIAL_WAGON_WHEEL', 'BALL_FOLLOW', 'BOUNDARY_CAM'] as CameraMode[]).map((mode) => {
            const labels: Record<CameraMode, string> = {
              BROADCAST: 'Broadcast',
              BATTER_POV: 'Batter POV',
              AERIAL_WAGON_WHEEL: 'Wagon 360°',
              BALL_FOLLOW: 'Ball Chase',
              BOUNDARY_CAM: 'Boundary Rope',
              STADIUM_REVEAL: 'Reveal',
            };
            return (
              <button
                key={mode}
                onClick={() => onCameraModeChange(mode)}
                className={`px-2 py-1 rounded transition ${
                  cameraMode === mode
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {/* Lighting Atmosphere Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
          <span className="text-slate-500 px-2 uppercase font-semibold">Lighting:</span>
          {(['NIGHT', 'SUNSET', 'DAY'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onLightingChange(preset)}
              className={`px-2 py-1 rounded transition ${
                lightingPreset === preset
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset === 'NIGHT' ? '🌙 Floodlit' : preset === 'SUNSET' ? '🌅 Twilight' : '☀️ Day'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
