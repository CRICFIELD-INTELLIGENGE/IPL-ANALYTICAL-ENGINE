import React from "react";
import "./cricket-loader.css";

export interface CricketLoaderProps {
  label?: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
}

export function CricketLoader({
  label = "LOADING INTELLIGENCE…",
  sublabel,
  size = "md",
}: CricketLoaderProps) {
  return (
    <div
      className={`cricket-loader-container cricket-loader-${size}`}
      role="status"
      aria-live="polite"
    >
      {/* Subtle stadium illumination background glow */}
      <div className="cricket-loader-glow" aria-hidden="true" />

      {/* Animated Bat & Ball Stage */}
      <div className="cricket-loader-stage">
        <div id="loader" className="cricket-loader-box">
          {/* Cricket Ball */}
          <img
            src="/cricket-ball.png"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://cdn-icons-png.flaticon.com/128/1099/1099680.png";
            }}
            id="ball"
            className="cricket-ball"
            alt="Cricket ball"
          />

          {/* Cricket Bat */}
          <svg
            id="bat"
            className="cricket-bat"
            viewBox="0 0 460.84737 460.84737"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="m460.847656 31.75-25.070312 25.078125-31.761719-31.757813 25.082031-25.070312zm0 0"
              fill="#a85d5d"
            />
            <path
              d="m378.945312 50.140625 25.070313-25.070313 31.761719 31.757813-25.070313 25.070313zm0 0"
              fill="#7f4545"
            />
            <path
              d="m353.878906 75.210938 25.066406-25.070313 31.761719 31.757813-25.070312 25.070312zm0 0"
              fill="#a85d5d"
            />
            <path
              d="m328.808594 100.28125 25.066406-25.070312 31.761719 31.757812-25.070313 25.070312zm0 0"
              fill="#7f4545"
            />
            <path
              d="m360.566406 132.039062-25.078125 25.070313-31.75-31.75 25.070313-25.078125zm0 0"
              fill="#a85d5d"
            />
            <path
              d="m352.425781 190.320312-260.136719 260.140626c-13.847656 13.847656-36.296874 13.847656-50.140624 0l-31.761719-31.761719c-13.847657-13.84375-13.847657-36.296875 0-50.140625l260.140625-260.136719 25.070312 25.066406-.21875.222657-76.050781 107.808593 107.808594-76.050781.21875-.21875zm0 0"
              fill="#ffd2a6"
            />
            <path
              d="m327.355469 165.25-.21875.21875-107.808594 76.050781 76.050781-107.808593.21875-.222657zm0 0"
              fill="#7f4545"
            />
          </svg>
        </div>
      </div>

      {/* Caption */}
      <div className="cricket-loader-caption">
        <span className="cricket-loader-title font-mono font-bold">
          {label}
        </span>
        {sublabel && (
          <span className="cricket-loader-subtitle font-sans">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default CricketLoader;

