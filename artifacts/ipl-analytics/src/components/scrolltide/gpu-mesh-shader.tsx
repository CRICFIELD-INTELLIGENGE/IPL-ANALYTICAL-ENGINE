import React, { useEffect, useRef, useState } from "react";

export type ShaderPreset = "tide-swirl" | "neon-mesh" | "aurora-noir";

interface GpuMeshShaderProps {
  className?: string;
  preset?: ShaderPreset;
  intensity?: number;
  interactive?: boolean;
}

export function GpuMeshShader({
  className = "",
  preset = "tide-swirl",
  intensity = 0.85,
  interactive = true,
}: GpuMeshShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Try WebGL first
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" }) ||
            canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }

    let animationFrameId: number;
    let isVisible = true;

    // Visibility observer to pause when off-screen
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // Mouse tracking
    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        targetMouseX = (e.clientX - rect.left) / rect.width;
        targetMouseY = 1.0 - (e.clientY - rect.top) / rect.height; // WebGL Y is inverted
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Handle high DPI resize
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // Cap at 1.5 for performance
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        if (gl) gl.viewport(0, 0, w, h);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    if (gl) {
      setHasWebGL(true);
      // Vertex shader
      const vsSource = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      // Fragment shader with 3 presets: Tide Swirl, Neon Mesh, Aurora Noir
      const fsSource = `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_intensity;
        uniform int u_preset;
        varying vec2 vUv;

        void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          float aspect = u_resolution.x / u_resolution.y;
          st.x *= aspect;
          
          vec2 m = u_mouse;
          m.x *= aspect;

          float t = u_time * 0.18;
          vec2 p = st * 2.2 - vec2(aspect * 1.1, 1.1);
          
          float r = length(p);
          float a = atan(p.y, p.x);

          // Deep void base (#070B18)
          vec3 cBg = vec3(0.027, 0.043, 0.094);
          vec3 col = cBg;

          if (u_preset == 0) {
            // TIDE SWIRL (Scrolltide Flagship)
            float f = sin(p.x * 2.5 + t) * cos(p.y * 2.5 - t * 0.7) +
                      sin(r * 3.5 - t * 1.2 + sin(a * 2.0)) * 0.6;
            
            float dM = length(st - m);
            f += sin(dM * 10.0 - u_time * 2.5) * exp(-dM * 3.5) * 0.35;

            vec3 cCyan = vec3(0.00, 0.85, 0.95);    // Hyper Cyan
            vec3 cViolet = vec3(0.55, 0.20, 0.90);  // Deep Violet
            vec3 cSapphire = vec3(0.08, 0.25, 0.60);// Electric Sapphire

            col = mix(cBg, cSapphire, smoothstep(-0.8, 0.9, f) * 0.65 * u_intensity);
            col = mix(col, cViolet, smoothstep(-0.4, 1.2, sin(f * 2.0 + t)) * 0.45 * u_intensity);
            col = mix(col, cCyan, smoothstep(0.1, 1.3, cos(f * 2.5 - t * 0.5)) * 0.35 * u_intensity);

          } else if (u_preset == 1) {
            // NEON MESH (Cyberpunk Sports Quant)
            vec2 grid = fract(st * 8.0) - 0.5;
            float line = smoothstep(0.48, 0.5, max(abs(grid.x), abs(grid.y)));
            
            float wave = sin(st.x * 3.0 + t) * cos(st.y * 3.0 + t * 0.8);
            vec3 cEmerald = vec3(0.00, 0.95, 0.55); // Laser Emerald
            vec3 cCyan = vec3(0.00, 0.75, 1.00);    // Cyber Cyan
            
            col = mix(cBg, cCyan, smoothstep(-0.5, 1.0, wave) * 0.55 * u_intensity);
            col = mix(col, cEmerald, line * smoothstep(0.0, 1.2, wave) * 0.4 * u_intensity);

          } else {
            // AURORA NOIR
            float wave1 = sin(p.x * 1.8 + t * 1.2) * 0.5;
            float wave2 = cos(p.y * 1.6 - t * 0.9) * 0.5;
            float combined = sin(wave1 + wave2 + r * 2.0);
            
            vec3 cAmber = vec3(0.95, 0.55, 0.10);
            vec3 cPurple = vec3(0.45, 0.10, 0.80);
            
            col = mix(cBg, cPurple, smoothstep(-0.6, 1.0, combined) * 0.5 * u_intensity);
            col = mix(col, cAmber, smoothstep(0.2, 1.4, combined) * 0.3 * u_intensity);
          }

          // Ambient vignette towards borders
          vec2 center = vec2(aspect * 0.5, 0.5);
          float dCenter = length(st - center);
          float vignette = smoothstep(aspect * 0.9, 0.2, dCenter);
          col *= (0.55 + 0.45 * vignette);

          gl_FragColor = vec4(col, 0.9);
        }
      `;

      const createShader = (type: number, src: string) => {
        const shader = gl!.createShader(type);
        if (!shader) return null;
        gl!.shaderSource(shader, src);
        gl!.compileShader(shader);
        return shader;
      };

      const vs = createShader(gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
      const program = gl.createProgram();

      if (vs && fs && program) {
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);

        // Quad geometry
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW
        );

        const posLoc = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const timeLoc = gl.getUniformLocation(program, "u_time");
        const resLoc = gl.getUniformLocation(program, "u_resolution");
        const mouseLoc = gl.getUniformLocation(program, "u_mouse");
        const intLoc = gl.getUniformLocation(program, "u_intensity");
        const presetLoc = gl.getUniformLocation(program, "u_preset");

        let startTime = performance.now();

        const render = () => {
          if (isVisible) {
            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            const elapsed = (performance.now() - startTime) / 1000;
            gl!.uniform1f(timeLoc, elapsed);
            gl!.uniform2f(resLoc, canvas.width, canvas.height);
            gl!.uniform2f(mouseLoc, mouseX, mouseY);
            gl!.uniform1f(intLoc, intensity);
            gl!.uniform1i(
              presetLoc,
              preset === "tide-swirl" ? 0 : preset === "neon-mesh" ? 1 : 2
            );

            gl!.drawArrays(gl.TRIANGLES, 0, 6);
          }
          animationFrameId = requestAnimationFrame(render);
        };

        render();
      }
    } else {
      // High-performance 2D Canvas Fallback
      setHasWebGL(false);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let t = 0;
      const render2d = () => {
        if (isVisible) {
          t += 0.015;
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Deep dark cosmic background
          ctx.fillStyle = "#070B18";
          ctx.fillRect(0, 0, w, h);

          // Radial glow blobs simulating mesh
          const g1 = ctx.createRadialGradient(
            w * (0.35 + Math.sin(t) * 0.15),
            h * (0.45 + Math.cos(t * 0.8) * 0.12),
            20,
            w * 0.4,
            h * 0.5,
            w * 0.5
          );
          g1.addColorStop(0, "rgba(6, 182, 212, 0.35)"); // Cyan
          g1.addColorStop(0.5, "rgba(59, 130, 246, 0.18)"); // Blue
          g1.addColorStop(1, "transparent");
          ctx.fillStyle = g1;
          ctx.fillRect(0, 0, w, h);

          const g2 = ctx.createRadialGradient(
            w * (0.65 + Math.cos(t * 0.7) * 0.15),
            h * (0.55 + Math.sin(t * 0.9) * 0.14),
            20,
            w * 0.6,
            h * 0.55,
            w * 0.5
          );
          g2.addColorStop(0, "rgba(139, 92, 246, 0.30)"); // Violet
          g2.addColorStop(0.6, "rgba(236, 72, 153, 0.12)"); // Pink
          g2.addColorStop(1, "transparent");
          ctx.fillStyle = g2;
          ctx.fillRect(0, 0, w, h);
        }
        animationFrameId = requestAnimationFrame(render2d);
      };
      render2d();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", resizeCanvas);
      observer.disconnect();
    };
  }, [preset, intensity, interactive]);

  return (
    <div className={`relative overflow-hidden pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-75 transition-opacity duration-700"
        style={{ width: "100%", height: "100%" }}
      />
      {/* Subtle fine cyber grid scanline overlay */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#070B18_90%)] pointer-events-none"
      />
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"
      />
    </div>
  );
}
