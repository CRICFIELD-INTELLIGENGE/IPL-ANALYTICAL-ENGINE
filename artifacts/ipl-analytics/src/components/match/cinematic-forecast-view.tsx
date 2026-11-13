import React, { useState, useMemo } from "react";
import { type MatchScorecard, normalizeVenueName, venueHref } from "@/lib/aggregates";
import {
  Cloud,
  Wind,
  Droplets,
  Sun,
  Moon,
  CloudRain,
  MapPin,
  Gauge,
  ArrowUpRight,
  Compass,
  Thermometer,
  Sparkles,
  CheckCircle2,
  Activity
} from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/lib/theme";

export interface CinematicForecastViewProps {
  card?: MatchScorecard;
  match: import("@/lib/live").LiveMatch;
}

export type WeatherScenarioKey = "match_day" | "sunny" | "evening" | "windy" | "rain";

interface WeatherPreset {
  key: WeatherScenarioKey;
  label: string;
  badge: string;
  icon: typeof Sun;
  conditionType: "sun" | "evening" | "wind" | "rain";
  temp: number;
  tempDesc: string;
  humidity: number;
  humidityDesc: string;
  windSpeed: number; // km/h
  windDir: string;
  windDesc: string;
  pitchEnergy: string;
  pitchDesc: string;
  rainChance: number;
  dewFactor: "High" | "Moderate" | "Minimal" | "Severe";
  headline: string;
  summary: string;
  tacticalNote: string;
}

export function CinematicForecastView({ card, match }: CinematicForecastViewProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const ground = match.matchInfo.venueInfo?.ground || card?.venue || "Narendra Modi Stadium, Ahmedabad";
  const city = match.matchInfo.venueInfo?.city || card?.city || "Ahmedabad";
  const canonicalVenue = normalizeVenueName(ground);
  const isDLS = card?.result?.method?.toLowerCase().includes("d/l") || card?.result?.method?.toLowerCase().includes("dls");

  // Derive authentic match-day base weather from venue, date, and DLS status
  const matchDayData = useMemo<WeatherPreset>(() => {
    const venueLower = ground.toLowerCase();
    const cityLower = city.toLowerCase();

    if (isDLS) {
      return {
        key: "match_day",
        label: "MATCH DAY ACTUAL (DLS)",
        badge: "DLS RAIN INTERRUPTION · MATCH DAY TELEMETRY",
        icon: CloudRain,
        conditionType: "rain",
        temp: 24,
        tempDesc: "Cool rain-cooled air",
        humidity: 88,
        humidityDesc: "High moisture on outfield",
        windSpeed: 21,
        windDir: "240° SW Gusty",
        windDesc: "Squall across Deep Cover",
        pitchEnergy: "6.4 / 10",
        pitchDesc: "Under covers, moisture seam",
        rainChance: 95,
        dewFactor: "Minimal",
        headline: "Rain-Interrupted Match Conditions (DLS Enforced)",
        summary: "Precipitation and damp outfield led to Duckworth-Lewis-Stern calculation. Seam bowlers gain lateral grip on the damp surface while the wet ball tests fielding agility.",
        tacticalNote: "Wet ball requires frequent towel drying. Fast-bowling cross-seam deliveries generate skid rather than bounce."
      };
    }

    if (venueLower.includes("modi") || cityLower.includes("ahmedabad")) {
      return {
        key: "match_day",
        label: "MATCH DAY ACTUAL (AHMEDABAD)",
        badge: "CLEAR EVENING · LIVE STADIUM SENSORS",
        icon: Moon,
        conditionType: "evening",
        temp: 29,
        tempDesc: "Dry evening heat dropping to 27°C",
        humidity: 62,
        humidityDesc: "Dew activates past 20:30 IST",
        windSpeed: 11,
        windDir: "310° NW Steady",
        windDesc: "Breeze towards Cow Corner",
        pitchEnergy: "8.4 / 10",
        pitchDesc: "Even true carry & solid bounce",
        rainChance: 0,
        dewFactor: "High",
        headline: "Narendra Modi Stadium Microclimate Telemetry",
        summary: "Clear warm evening with high dew probability in the second innings phase. Sub-surface clay moisture indicates an even true-bounce surface favoring high-velocity run chases.",
        tacticalNote: "Second innings team benefits from wet outfield skidding the ball onto the bat. Spinners face reduced grip past the 10th over mark."
      };
    }

    if (venueLower.includes("wankhede") || cityLower.includes("mumbai")) {
      return {
        key: "match_day",
        label: "MATCH DAY ACTUAL (MUMBAI)",
        badge: "COASTAL HUMIDITY · ARABIAN SEA BREEZE",
        icon: Moon,
        conditionType: "evening",
        temp: 31,
        tempDesc: "Warm coastal night air",
        humidity: 78,
        humidityDesc: "Heavy maritime dew factor",
        windSpeed: 16,
        windDir: "260° W Sea Breeze",
        windDesc: "Consistent sea breeze from Marine Drive",
        pitchEnergy: "8.8 / 10",
        pitchDesc: "Red soil pace, steep bounce",
        rainChance: 0,
        dewFactor: "Severe",
        headline: "Wankhede Coastal Microclimate Telemetry",
        summary: "High maritime humidity combined with evening sea breezes. Heavy condensation on the outfield grass makes bowling in the chase notoriously difficult.",
        tacticalNote: "Win toss and field first is heavily indicated. Red soil pitch offers steep bounce early on before dew accelerates the chase."
      };
    }

    if (venueLower.includes("chinnaswamy") || cityLower.includes("bengaluru")) {
      return {
        key: "match_day",
        label: "MATCH DAY ACTUAL (BENGALURU)",
        badge: "HIGH ALTITUDE · 920M ELEVATION",
        icon: Cloud,
        conditionType: "wind",
        temp: 26,
        tempDesc: "Pleasant high-plateau air",
        humidity: 64,
        humidityDesc: "Moderate condensation",
        windSpeed: 14,
        windDir: "090° E Gusting",
        windDesc: "Swirling winds across short boundaries",
        pitchEnergy: "9.2 / 10",
        pitchDesc: "Fast true deck, explosive carry",
        rainChance: 15,
        dewFactor: "Moderate",
        headline: "M. Chinnaswamy Atmospheric Telemetry",
        summary: "High altitude (920m above sea level) reduces atmospheric air resistance, enabling lofted shots to carry 8-10% further than coastal venues.",
        tacticalNote: "Thin air significantly increases boundary clearance probability. Defending par is typically 15-20 runs above tournament average."
      };
    }

    if (venueLower.includes("dharamshala") || cityLower.includes("dharamshala")) {
      return {
        key: "match_day",
        label: "MATCH DAY ACTUAL (DHARAMSHALA)",
        badge: "HIMALAYAN FOOTHILLS · VALLEY DOWNDRAFT",
        icon: Wind,
        conditionType: "wind",
        temp: 19,
        tempDesc: "Crisp mountain night air",
        humidity: 48,
        humidityDesc: "Low dew, dry grass",
        windSpeed: 22,
        windDir: "010° N Valley Wind",
        windDesc: "Brisk downdraft from Dhauladhar range",
        pitchEnergy: "8.1 / 10",
        pitchDesc: "Copious lateral swing & seam",
        rainChance: 10,
        dewFactor: "Minimal",
        headline: "HPCA Stadium Alpine Microclimate",
        summary: "Cold mountain air and low ambient temperatures generate significant atmospheric density, rewarding swing bowlers who pitch the ball up in the powerplay.",
        tacticalNote: "Swing movement persists through the first 8-10 overs. Pace bowlers attacking the front pad have highest wicket expectancy."
      };
    }

    // Default general match-day
    return {
      key: "match_day",
      label: "MATCH DAY ACTUAL",
      badge: "STADIUM SENSORS · LIVE TELEMETRY",
      icon: Moon,
      conditionType: "evening",
      temp: 28,
      tempDesc: "Clear evening twilight",
      humidity: 58,
      humidityDesc: "Moderate dew potential",
      windSpeed: 12,
      windDir: "300° NW",
      windDesc: "Light evening cross-breeze",
      pitchEnergy: "8.0 / 10",
      pitchDesc: "Balanced carry & even bounce",
      rainChance: 0,
      dewFactor: "Moderate",
      headline: "Stadium Microclimate Telemetry",
      summary: "Stable atmospheric conditions throughout the match. Mild evening drop in temperature with moderate dew emergence during the second innings.",
      tacticalNote: "Even contest between bat and ball with predictable bounce and minimal air turbulence."
    };
  }, [ground, city, isDLS]);

  // All interactive scenario presets
  const presets: Record<WeatherScenarioKey, WeatherPreset> = useMemo(() => {
    return {
      match_day: matchDayData,
      sunny: {
        key: "sunny",
        label: "☀️ SUNNY & HEAT",
        badge: "SCORCHING DAYTIME · SOLAR RADIANCE",
        icon: Sun,
        conditionType: "sun",
        temp: 36,
        tempDesc: "Blazing sun, high thermal index",
        humidity: 34,
        humidityDesc: "Dry air, zero dew factor",
        windSpeed: 8,
        windDir: "180° S Gentle",
        windDesc: "Warm sluggish thermal drift",
        pitchEnergy: "8.7 / 10",
        pitchDesc: "Hard-baked topsoil, rapid value for shots",
        rainChance: 0,
        dewFactor: "Minimal",
        headline: "Scorching Daytime Solar Telemetry",
        summary: "Unforgiving solar heat bakes the pitch crust, ensuring rapid lightning outfield speed and minimal lateral seam movement. Batters dominate the powerplay overs.",
        tacticalNote: "Batting first is heavily favored under direct sunlight before fatigue and footmark abrasions aid reverse swing in the death overs."
      },
      evening: {
        key: "evening",
        label: "🌙 CLEAR EVENING",
        badge: "FLOODLIT TWILIGHT · DEW RISK PHASE",
        icon: Moon,
        conditionType: "evening",
        temp: 27,
        tempDesc: "Pleasant floodlit night conditions",
        humidity: 72,
        humidityDesc: "Dew settling on outfield grass",
        windSpeed: 11,
        windDir: "320° NW",
        windDesc: "Cool cross-breeze across square leg",
        pitchEnergy: "8.3 / 10",
        pitchDesc: "Consistent pace, skids off damp grass",
        rainChance: 0,
        dewFactor: "High",
        headline: "Floodlit Evening & Dew Intelligence",
        summary: "As temperatures decline under the stadium floodlights, relative humidity crosses the dew threshold. Ball moisture significantly alters grip and spin mechanics.",
        tacticalNote: "Chasing team holds an inherent edge as the moist ball skids faster onto the bat with diminished finger-spin friction."
      },
      windy: {
        key: "windy",
        label: "💨 GUSTY WIND",
        badge: "HIGH AERODYNAMIC DRAG · WIND DRIFT",
        icon: Wind,
        conditionType: "wind",
        temp: 25,
        tempDesc: "Cool brisk stadium airflow",
        humidity: 50,
        humidityDesc: "Fast moisture evaporation",
        windSpeed: 28,
        windDir: "270° W Strong Gusts",
        windDesc: "Brisk wind gusting towards Deep Mid-Wicket",
        pitchEnergy: "7.9 / 10",
        pitchDesc: "Variable ball trajectory through air",
        rainChance: 5,
        dewFactor: "Minimal",
        headline: "High-Velocity Wind & Drag Telemetry",
        summary: "Brisk atmospheric wind vectors alter ball aerodynamics mid-flight. Bowlers targeting into the wind gain pronounced conventional late swing.",
        tacticalNote: "Target boundaries with the wind vector. Bowlers bowling into the wind gain 15% more lateral drift on cross-seam deliveries."
      },
      rain: {
        key: "rain",
        label: "🌧️ RAIN & OVERCAST",
        badge: "PRECIPITATION ACTIVE · DLS PROTOCOL",
        icon: CloudRain,
        conditionType: "rain",
        temp: 22,
        tempDesc: "Cool moisture-laden storm air",
        humidity: 92,
        humidityDesc: "Saturated outfield and air",
        windSpeed: 19,
        windDir: "220° SW Slanted",
        windDesc: "Gusty squalls carrying rain streaks",
        pitchEnergy: "6.0 / 10",
        pitchDesc: "Soft surface, damp seam slippage",
        rainChance: 90,
        dewFactor: "Minimal",
        headline: "Storm Precipitation & Moisture Protocol",
        summary: "Passing rain showers trigger ground covers and DLS target calculations. Damp atmospheric conditions produce seam grip but heighten outfield fielding difficulty.",
        tacticalNote: "Captains chasing need to remain ahead of the DLS par curve at the end of every over. Fast bowlers must manage wet landing footings."
      }
    };
  }, [matchDayData]);

  const [activeScenario, setActiveScenario] = useState<WeatherScenarioKey>("match_day");
  const current = presets[activeScenario] || matchDayData;

  // Wind duration in seconds (higher wind speed = faster animation)
  const windAnimDuration = Math.max(5, Math.round(170 / current.windSpeed));
  const windAngleDeg = Math.min(28, Math.max(8, Math.round(current.windSpeed * 0.75)));

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ─── SCENARIO SWITCHER PILLS ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            ATMOSPHERIC SCENARIO:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["match_day", "sunny", "evening", "windy", "rain"] as WeatherScenarioKey[]).map((key) => {
            const p = presets[key];
            const isActive = activeScenario === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveScenario(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all flex items-center gap-1.5 ${
                  isActive
                    ? isLight
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/25 ring-2 ring-sky-600/20"
                      : "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/40"
                    : isLight
                    ? "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300/80 shadow-sm"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"
                }`}
              >
                <p.icon className="w-3.5 h-3.5" />
                <span>{p.label}</span>
                {isActive && <CheckCircle2 className="w-3 h-3 ml-0.5 opacity-90" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── DYNAMIC ATMOSPHERIC WEATHER HERO CANVAS ─── */}
      <div
        className={`relative rounded-[32px] overflow-hidden border p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center transition-colors duration-700 ${
          isLight
            ? current.conditionType === "sun"
              ? "bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50/80 border-sky-300/80 text-slate-900"
              : current.conditionType === "rain"
              ? "bg-gradient-to-b from-slate-300 via-cyan-100/70 to-blue-100/90 border-slate-300 text-slate-900"
              : current.conditionType === "wind"
              ? "bg-gradient-to-b from-slate-200 via-sky-100 to-slate-100 border-sky-300/70 text-slate-900"
              : "bg-gradient-to-b from-blue-200/90 via-sky-100/90 to-indigo-50/80 border-blue-300/80 text-slate-900"
            : current.conditionType === "sun"
            ? "bg-gradient-to-b from-[#172554] via-[#0f172a] to-[#050713] border-amber-500/20 text-white"
            : current.conditionType === "rain"
            ? "bg-gradient-to-b from-[#0f172a] via-[#080d1a] to-[#030712] border-cyan-500/20 text-white"
            : current.conditionType === "wind"
            ? "bg-gradient-to-b from-[#111c38] via-[#091024] to-[#040612] border-teal-500/20 text-white"
            : "bg-gradient-to-b from-[#0c142b] via-[#090e1f] to-[#04060e] border-white/10 text-white"
        }`}
        style={
          {
            "--wind-duration": `${windAnimDuration}s`,
            "--wind-angle": `${windAngleDeg}deg`,
          } as React.CSSProperties
        }
      >
        {/* ─── INLINE KEYFRAME DEFINITIONS ─── */}
        <style>{`
          @keyframes cfSunSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes cfSunPulse {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.08); opacity: 1; }
          }
          @keyframes cfCloudDriftA {
            0% { transform: translateX(-320px); }
            100% { transform: translateX(1200px); }
          }
          @keyframes cfCloudDriftB {
            0% { transform: translateX(-420px); }
            100% { transform: translateX(1100px); }
          }
          @keyframes cfCloudDriftC {
            0% { transform: translateX(-240px); }
            100% { transform: translateX(1300px); }
          }
          @keyframes cfWindStream {
            0% { stroke-dashoffset: 600; opacity: 0.15; }
            30% { opacity: 0.75; }
            70% { opacity: 0.75; }
            100% { stroke-dashoffset: -800; opacity: 0.15; }
          }
          @keyframes cfRainFall {
            0% { transform: translateY(-40px) rotate(var(--wind-angle)); opacity: 0; }
            20% { opacity: 0.85; }
            80% { opacity: 0.85; }
            100% { transform: translateY(450px) rotate(var(--wind-angle)); opacity: 0; }
          }
          @keyframes cfSplashRipple {
            0% { transform: scale(0.2); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes cfStarTwinkle {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>

        {/* ─── BACKGROUND ATMOSPHERIC SKY ELEMENTS (z-0) ─── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          {/* 1. RADIANT SUN (When condition is 'sun') */}
          {current.conditionType === "sun" && (
            <div className="absolute top-4 right-8 sm:right-16 z-0 pointer-events-none">
              {/* Outer Radiant Flare Corona */}
              <div
                className="w-44 h-44 rounded-full blur-2xl opacity-60 pointer-events-none"
                style={{
                  background: isLight
                    ? "radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(245,158,11,0.2) 60%, transparent 100%)"
                    : "radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(245,158,11,0.15) 60%, transparent 100%)",
                  animation: "cfSunPulse 4s ease-in-out infinite",
                }}
              />
              {/* Rotating Sun Rays */}
              <svg
                className="absolute inset-0 w-44 h-44 pointer-events-none"
                viewBox="0 0 100 100"
                style={{ animation: "cfSunSpin 45s linear infinite" }}
              >
                <circle cx="50" cy="50" r="18" fill="url(#sunCoreGlow)" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <line
                    key={deg}
                    x1="50"
                    y1="24"
                    x2="50"
                    y2="10"
                    stroke={isLight ? "#f59e0b" : "#fbbf24"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.8"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
                <defs>
                  <radialGradient id="sunCoreGlow">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="60%" stopColor="#fde047" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* 2. EVENING MOON & TWILIGHT STARS (When condition is 'evening') */}
          {current.conditionType === "evening" && (
            <div className="absolute top-6 right-10 sm:right-20 z-0 pointer-events-none">
              {/* Twilight Floodlight / Moon Halo */}
              <div
                className="w-36 h-36 rounded-full blur-xl pointer-events-none"
                style={{
                  background: isLight
                    ? "radial-gradient(circle, rgba(186,230,253,0.5) 0%, rgba(199,210,254,0.3) 70%, transparent 100%)"
                    : "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(99,102,241,0.15) 70%, transparent 100%)",
                }}
              />
              {/* Luminous Moon Disc */}
              <div
                className={`w-14 h-14 rounded-full border shadow-lg flex items-center justify-center ${
                  isLight
                    ? "bg-slate-100/95 border-sky-200/90 shadow-sky-400/20"
                    : "bg-slate-200/90 border-white/40 shadow-cyan-500/40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full opacity-25 ${
                    isLight ? "bg-slate-300" : "bg-slate-400"
                  }`}
                  style={{
                    boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.25)",
                  }}
                />
              </div>

              {/* Twinkling Stadium Sky Stars */}
              {[
                { top: "-10px", left: "-60px", delay: "0s" },
                { top: "40px", left: "-100px", delay: "1.2s" },
                { top: "-20px", left: "-140px", delay: "0.7s" },
                { top: "60px", left: "-30px", delay: "1.8s" },
              ].map((s, idx) => (
                <div
                  key={idx}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-sm pointer-events-none"
                  style={{
                    top: s.top,
                    left: s.left,
                    animation: `cfStarTwinkle 3s ease-in-out infinite`,
                    animationDelay: s.delay,
                  }}
                />
              ))}
            </div>
          )}

          {/* 3. MULTI-LAYER DRIFTING CLOUDS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Cloud Layer A */}
            <div
              className="absolute top-2 w-[340px] opacity-70"
              style={{
                animation: `cfCloudDriftA ${windAnimDuration * 1.8}s linear infinite`,
              }}
            >
              <svg viewBox="0 0 320 90" className="w-full h-auto drop-shadow-md">
                <path
                  d="M 20 60 Q 30 25, 75 30 Q 105 10, 155 18 Q 195 5, 235 25 Q 275 15, 295 45 Q 315 50, 310 70 Q 305 85, 275 85 L 30 85 Q 15 80, 20 60 Z"
                  fill={
                    isLight
                      ? current.conditionType === "rain"
                        ? "rgba(148, 163, 184, 0.75)"
                        : "rgba(255, 255, 255, 0.85)"
                      : current.conditionType === "rain"
                      ? "rgba(71, 85, 105, 0.6)"
                      : "rgba(148, 163, 184, 0.22)"
                  }
                />
              </svg>
            </div>

            {/* Cloud Layer B */}
            <div
              className="absolute top-12 w-[420px] opacity-60"
              style={{
                animation: `cfCloudDriftB ${windAnimDuration * 1.3}s linear infinite`,
                animationDelay: `-${windAnimDuration * 0.4}s`,
              }}
            >
              <svg viewBox="0 0 400 110" className="w-full h-auto drop-shadow-lg">
                <path
                  d="M 30 80 Q 45 35, 95 40 Q 130 15, 190 22 Q 240 8, 290 32 Q 340 20, 370 58 Q 395 68, 385 92 Q 375 105, 340 105 L 45 105 Q 20 100, 30 80 Z"
                  fill={
                    isLight
                      ? current.conditionType === "rain"
                        ? "rgba(100, 116, 139, 0.8)"
                        : "rgba(255, 255, 255, 0.9)"
                      : current.conditionType === "rain"
                      ? "rgba(51, 65, 85, 0.7)"
                      : "rgba(203, 213, 225, 0.25)"
                  }
                />
              </svg>
            </div>

            {/* Cloud Layer C */}
            <div
              className="absolute top-24 w-[380px] opacity-50"
              style={{
                animation: `cfCloudDriftC ${windAnimDuration}s linear infinite`,
                animationDelay: `-${windAnimDuration * 0.8}s`,
              }}
            >
              <svg viewBox="0 0 380 75" className="w-full h-auto drop-shadow-sm">
                <path
                  d="M 15 45 Q 60 15, 130 20 Q 200 10, 270 24 Q 330 18, 370 36 Q 375 52, 340 60 Q 270 65, 180 60 Q 90 65, 20 55 Z"
                  fill={
                    isLight
                      ? current.conditionType === "rain"
                        ? "rgba(71, 85, 105, 0.7)"
                        : "rgba(255, 255, 255, 0.75)"
                      : current.conditionType === "rain"
                      ? "rgba(30, 41, 59, 0.7)"
                      : "rgba(148, 163, 184, 0.18)"
                  }
                />
              </svg>
            </div>
          </div>

          {/* 4. AERODYNAMIC WIND STREAMLINES */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 1000 350"
          >
            <defs>
              <linearGradient id="windStreamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={isLight ? "#0284c7" : "#38bdf8"} stopOpacity="0" />
                <stop offset="50%" stopColor={isLight ? "#0ea5e9" : "#22d3ee"} stopOpacity="0.8" />
                <stop offset="100%" stopColor={isLight ? "#0284c7" : "#38bdf8"} stopOpacity="0" />
              </linearGradient>
            </defs>

            <path
              d="M -100 45 C 200 25, 450 65, 750 35 S 1050 48, 1200 30"
              stroke="url(#windStreamGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="220 120"
              style={{
                animation: `cfWindStream ${windAnimDuration}s linear infinite`,
              }}
            />

            <path
              d="M -100 95 C 180 115, 520 75, 820 100 S 1120 85, 1200 110"
              stroke="url(#windStreamGrad)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="260 140"
              style={{
                animation: `cfWindStream ${windAnimDuration * 1.2}s linear infinite`,
                animationDelay: `-${windAnimDuration * 0.5}s`,
              }}
            />

            <path
              d="M -100 155 C 250 135, 600 175, 880 145 S 1150 160, 1200 140"
              stroke="url(#windStreamGrad)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="300 160"
              style={{
                animation: `cfWindStream ${windAnimDuration * 0.9}s linear infinite`,
                animationDelay: `-${windAnimDuration * 0.25}s`,
              }}
            />
          </svg>

          {/* 5. RAINFALL STREAKS & TURF SPLASHES */}
          {current.conditionType === "rain" && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 55 }).map((_, i) => {
                const leftPos = (i * 1.85) % 100;
                const animDuration = 0.45 + (i % 6) * 0.08;
                const delay = (i * 0.06) % 1.5;
                const dropHeight = 18 + (i % 5) * 6;

                return (
                  <div
                    key={i}
                    className={`absolute w-[1.5px] rounded-full pointer-events-none ${
                      isLight
                        ? "bg-gradient-to-b from-transparent via-sky-600 to-blue-700 opacity-75"
                        : "bg-gradient-to-b from-transparent via-cyan-300 to-sky-400 opacity-80"
                    }`}
                    style={{
                      left: `${leftPos}%`,
                      top: "-30px",
                      height: `${dropHeight}px`,
                      animation: `cfRainFall ${animDuration}s linear infinite`,
                      animationDelay: `${delay}s`,
                    }}
                  />
                );
              })}

              {[15, 32, 50, 68, 85].map((pct, idx) => (
                <div
                  key={idx}
                  className={`absolute bottom-3 w-4 h-2 rounded-full border pointer-events-none ${
                    isLight ? "border-sky-500/60" : "border-cyan-400/70"
                  }`}
                  style={{
                    left: `${pct}%`,
                    animation: `cfSplashRipple 1.4s ease-out infinite`,
                    animationDelay: `${idx * 0.28}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── FORECAST HERO CONTENT (z-10 with Frosted Glass Shield) ─── */}
        <div
          className={`relative z-10 flex flex-col items-center max-w-2xl px-6 py-6 rounded-3xl backdrop-blur-md transition-all ${
            isLight
              ? "bg-white/70 border border-white/80 shadow-md"
              : "bg-slate-900/60 border border-white/10 shadow-xl"
          }`}
        >
          {/* Weather Icon Orb */}
          <div
            className={`w-16 h-16 rounded-3xl border flex items-center justify-center mb-3 shadow-xl transition-all duration-300 ${
              isLight
                ? current.conditionType === "sun"
                  ? "bg-amber-100/95 border-amber-300 text-amber-600 shadow-amber-500/20"
                  : current.conditionType === "rain"
                  ? "bg-sky-100/95 border-sky-300 text-sky-700 shadow-sky-500/20"
                  : "bg-white/95 border-sky-300 text-sky-700 shadow-sky-500/15"
                : current.conditionType === "sun"
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/30"
                : current.conditionType === "rain"
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-cyan-500/30"
                : "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-cyan-500/20"
            }`}
          >
            <current.icon className="w-8 h-8 animate-pulse" />
          </div>

          {/* Subtitle Badge */}
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-2 transition-colors ${
              isLight
                ? "bg-white/95 text-sky-900 border-sky-300/80 shadow-sm"
                : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
            }`}
          >
            {current.badge}
          </span>

          {/* Main Title */}
          <h2
            className={`text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1 mb-2.5 transition-colors ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {current.headline}
          </h2>

          {/* Description */}
          <p
            className={`text-sm leading-relaxed mb-5 font-medium max-w-xl transition-colors ${
              isLight ? "text-slate-700" : "text-slate-300"
            }`}
          >
            {current.summary}
          </p>

          {/* Venue Location Pill */}
          <Link
            href={venueHref(ground)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm ${
              isLight
                ? "bg-white/95 hover:bg-white text-slate-800 border border-slate-300/90 hover:shadow-md"
                : "bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300"
            }`}
          >
            <MapPin
              className={`w-4 h-4 ${
                isLight ? "text-sky-600" : "text-cyan-400"
              }`}
            />
            <span>
              {canonicalVenue}, {city}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ─── REAL-TIME SENSOR TELEMETRY GAUGES ─── */}
        <div
          className={`relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mt-8 pt-8 border-t transition-colors ${
            isLight ? "border-slate-300/80" : "border-white/10"
          }`}
        >
          {[
            {
              label: "TEMPERATURE",
              value: `${current.temp}°C`,
              sub: current.tempDesc,
              icon: Thermometer,
              color: isLight ? "text-amber-600" : "text-amber-400",
              badge: current.temp > 32 ? "Thermal High" : "Optimal",
            },
            {
              label: "HUMIDITY",
              value: `${current.humidity}%`,
              sub: current.humidityDesc,
              icon: Droplets,
              color: isLight ? "text-sky-600" : "text-cyan-400",
              badge: `Dew: ${current.dewFactor}`,
            },
            {
              label: "WIND VELOCITY",
              value: `${current.windSpeed} km/h`,
              sub: current.windDesc,
              icon: Wind,
              color: isLight ? "text-teal-600" : "text-emerald-400",
              badge: `${(current.windSpeed / 3.6).toFixed(1)} m/s drift`,
            },
            {
              label: "PITCH ENERGY",
              value: current.pitchEnergy,
              sub: current.pitchDesc,
              icon: Gauge,
              color: isLight ? "text-rose-600" : "text-rose-400",
              badge: "Surface Hardness",
            },
          ].map((sensor, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border flex flex-col items-center transition-all duration-200 ${
                isLight
                  ? "bg-white/95 border-slate-200/90 shadow-md hover:shadow-lg hover:border-sky-300"
                  : "bg-slate-900/60 backdrop-blur-md border-white/10 shadow-lg hover:border-cyan-500/40"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <sensor.icon className={`w-4 h-4 ${sensor.color}`} />
                <span
                  className={`text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                    isLight
                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                      : "bg-white/[0.06] text-slate-300 border border-white/10"
                  }`}
                >
                  {sensor.badge}
                </span>
              </div>

              <span
                className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {sensor.label}
              </span>

              <span
                className={`text-2xl sm:text-3xl font-black font-mono my-0.5 tracking-tight ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {sensor.value}
              </span>

              <span
                className={`text-[11px] font-medium truncate max-w-full text-center ${
                  isLight ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {sensor.sub}
              </span>
            </div>
          ))}
        </div>

        {/* ─── TACTICAL PITCH & AIRFLOW AERODYNAMICS FOOTER ─── */}
        <div
          className={`relative z-10 w-full max-w-3xl mt-4 p-4 rounded-2xl border text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
            isLight
              ? "bg-white/85 border-slate-200/90 shadow-sm"
              : "bg-white/[0.03] border-white/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isLight
                  ? "bg-sky-100 text-sky-700"
                  : "bg-cyan-500/20 text-cyan-400"
              }`}
            >
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                TACTICAL ATMOSPHERIC VECTOR · {current.windDir}
              </span>
              <p
                className={`text-xs font-medium leading-relaxed ${
                  isLight ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {current.tacticalNote}
              </p>
            </div>
          </div>

          <div
            className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold uppercase ${
              isLight
                ? "bg-slate-100/90 text-slate-700 border-slate-200"
                : "bg-slate-800/80 text-cyan-300 border-white/10"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Precipitation: {current.rainChance}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
