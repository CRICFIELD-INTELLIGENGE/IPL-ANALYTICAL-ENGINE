import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import type { Plugin } from "vite";
// Generate verification files from the same public configuration as the client.
// Configuration proves neither ownership nor AdSense approval.
function adsenseConfiguration(): Plugin {
  let client = "";
  return {
    name: "cricfield-adsense-configuration",
    configResolved(config) {
      const raw = String(config.env.VITE_ADSENSE_CLIENT || "")
        .trim()
        .replace(/^(ca-)?pub-/, "");
      client = /^\d{16}$/.test(raw) ? raw : "";
    },
    transformIndexHtml() {
      return client
        ? [
            {
              tag: "meta",
              attrs: {
                name: "google-adsense-account",
                content: `ca-pub-${client}`,
              },
              injectTo: "head",
            },
          ]
        : [];
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "ads.txt",
        source: client
          ? `google.com, pub-${client}, DIRECT, f08c47fec0942fa0\n`
          : "# AdSense publisher not configured.\n",
      });
    },
    configureServer(server) {
      server.middlewares.use("/ads.txt", (_req, res) => {
        res.setHeader("Content-Type", "text/plain");
        res.end(
          client
            ? `google.com, pub-${client}, DIRECT, f08c47fec0942fa0\n`
            : "# AdSense publisher not configured.\n",
        );
      });
    },
  };
}
import { filterManifestForRelease } from "./src/data/editorial-images/release-filter";
import net from "node:net";
import { spawn, execSync, type ChildProcess } from "node:child_process";

// Dev only: the site proxies /api to the api-server, so start it with the site when nothing
// is listening there yet. Set CRICFIELD_API_AUTOSTART=0 to run the API yourself.
function apiAutostart(): Plugin {
  const g = globalThis as {
    __cricfieldApi?: ChildProcess | null;
    __cricfieldApiPort?: number;
  };
  const configured = Number(process.env.VITE_BACKEND_PORT ?? "5000");
  const listening = (port: number) =>
    new Promise<boolean>((resolve) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.setTimeout(700);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
  const compatible = async (port: number) => {
    try {
      const r = await fetch(
        `http://127.0.0.1:${port}/api/arcade/capabilities`,
        { signal: AbortSignal.timeout(1500) },
      );
      const value = await r.json();
      return r.ok && value.arcadeVersion === "rooms-v3";
    } catch {
      return false;
    }
  };
  const stop = () => {
    const child = g.__cricfieldApi;
    if (child && child.exitCode === null) {
      if (process.platform === "win32" && child.pid) {
        try {
          execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: "ignore" });
        } catch {
          child.kill();
        }
      } else {
        child.kill();
      }
    }
    g.__cricfieldApi = null;
  };
  return {
    name: "cricfield-api-autostart",
    apply: "serve",
    async configureServer(server) {
      server.middlewares.use("/__cricfield/dev-api", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            configuredPort: configured,
            managedPort: g.__cricfieldApiPort ?? null,
            autostart: process.env.CRICFIELD_API_AUTOSTART !== "0",
            expectedArcadeVersion: "rooms-v3",
          }),
        );
      });
      const arcadeOnly = process.env.CRICFIELD_API_AUTOSTART === "0";
      if (arcadeOnly && process.env.CRICFIELD_ARCADE_AUTOSTART === "0") return;
      let port = g.__cricfieldApiPort ?? configured;
      if (!(await compatible(port))) {
        // Never reuse an unrelated or stale listener merely because its port is occupied.
        if (g.__cricfieldApi && g.__cricfieldApi.exitCode === null) stop();
        port = configured;
        while (await listening(port)) port++;
        server.config.logger.info(
          `[api-autostart] starting current API on :${port}`,
        );
        let child: ChildProcess | null = null;
        try {
          const isWindows = process.platform === "win32";
          const execCmd = isWindows ? `"${process.execPath}"` : process.execPath;
          const watchArgs = isWindows ? [] : ["--watch"];
          child = spawn(
            execCmd,
            [
              ...watchArgs,
              "--import",
              "tsx",
              arcadeOnly ? "src/arcade-dev.ts" : "src/index.ts",
            ],
            {
              cwd: path.resolve(import.meta.dirname, "..", "api-server"),
              stdio: "inherit",
              shell: isWindows,
              env: {
                ...process.env,
                PORT: String(port),
                CRICFIELD_DB_READONLY: process.env.CRICFIELD_DB_READONLY ?? "1",
              },
            },
          );
        } catch (error) {
          server.config.logger.error(
            `[api-autostart] failed to spawn API process: ${(error as Error).message}`,
          );
        }
        if (child) {
          g.__cricfieldApi = child;
          g.__cricfieldApiPort = port;
          child.once("error", (error) =>
            server.config.logger.error(`[api-autostart] ${error.message}`),
          );
          child.once("exit", (code) => {
            if (g.__cricfieldApi === child) g.__cricfieldApi = null;
            server.config.logger.warn(`[api-autostart] API stopped (${code})`);
          });
          const until = Date.now() + 30000;
          while (Date.now() < until && !(await compatible(port))) {
            if (child.exitCode !== null) break;
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
          if (!(await compatible(port)))
            server.config.logger.error(
              "[api-autostart] API is not ready. See its startup error above.",
            );
          process.once("exit", stop);
        }
      }
      for (const key of arcadeOnly
        ? ["/api/arcade"]
        : ["/api/arcade", "/api"]) {
        const proxy = server.config.server.proxy?.[key];
        if (proxy && typeof proxy !== "string")
          proxy.target = `http://127.0.0.1:${port}`;
      }
      server.config.logger.info(
        `[api-autostart] /api -> http://127.0.0.1:${port}`,
      );
    },
  };
}
// Disabled in this project run: it can crash in non-Replit/browser environments
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Public builds ship only approved editorial images. Internal builds
// (VITE_ENABLE_ADMIN_PAGES=true) keep candidates for the review panel.
function editorialImageRelease(): Plugin {
  return {
    name: "cricfield-editorial-image-release",
    apply: "build",
    enforce: "pre", // see the raw JSON before vite:json turns it into a module
    transform(code, id) {
      if (!/editorial-images[\\/]manifest\.json$/.test(id)) return null;
      if (process.env.VITE_ENABLE_ADMIN_PAGES === "true") {
        this.warn(
          "internal build: editorial image candidates are included (do not deploy publicly)",
        );
        return null;
      }
      const { json, kept, stripped } = filterManifestForRelease(code);
      this.info?.(
        `editorial images: ${kept} approved shipped, ${stripped} unlicensed candidates stripped`,
      );
      return { code: json, map: null };
    },
  };
}

// Dugout v2 articles: only status "published" with an approved editorial review ships in a public
// build. Everything else (and its evidence file) is replaced by null and dropped from the index, so its
// text never reaches the bundle; the legacy article at the same URL keeps serving until a revision is
// published. Image rights play no part here: photos have their own gate (editorialImageRelease).
function editorialArticleRelease(): Plugin {
  const releasable = (file: string) => {
    try {
      const a = JSON.parse(fs.readFileSync(file, "utf8"));
      return a.status === "published" && a.editorialReview?.approved === true;
    } catch {
      return false;
    }
  };
  const statusOf = (file: string) =>
    releasable(file) ? "published" : "withheld";
  return {
    name: "cricfield-editorial-article-release",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      const norm = id.replace(/\\/g, "/").split("?")[0];
      if (
        !/\/src\/data\/editorial\/(index\.json|articles\/[a-z]+\/cf-[a-z]+-\d{3}\.json|evidence\/[a-z]+\/cf-[a-z]+-\d{3}\.json)$/.test(
          norm,
        )
      )
        return null;
      if (process.env.VITE_ENABLE_ADMIN_PAGES === "true") return null;
      if (norm.endsWith("/index.json")) {
        const idx = JSON.parse(code);
        const before = idx.articles.length;
        idx.articles = idx.articles.filter(
          (a: { id: string; franchise: string }) =>
            releasable(
              path.resolve(
                import.meta.dirname,
                "src/data/editorial/articles",
                a.franchise.toLowerCase(),
                `${a.id}.json`,
              ),
            ),
        );
        this.info?.(
          `dugout articles: ${idx.articles.length} published shipped, ${before - idx.articles.length} unpublished withheld`,
        );
        return { code: JSON.stringify(idx), map: null };
      }
      const articleFile = norm.includes("/evidence/")
        ? norm.replace("/evidence/", "/articles/")
        : norm;
      return statusOf(articleFile) === "published"
        ? null
        : { code: "null", map: null };
    },
  };
}

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    apiAutostart(),
    adsenseConfiguration(),
    editorialImageRelease(),
    editorialArticleRelease(),
    react(),
    tailwindcss(),
    // runtimeErrorOverlay(),

    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api/arcade": {
        target: `http://127.0.0.1:${process.env.VITE_BACKEND_PORT ?? "5000"}`,
        changeOrigin: true,
      },
      "/api": {
        target: `http://localhost:${process.env.VITE_BACKEND_PORT ?? "5000"}`,
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
