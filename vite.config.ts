// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);
// NOTE: Cloudflare Pages' build system inspects this file looking for a top-level
// `plugins` array. The Lovable wrapper resolves plugins internally, so we expose
// an empty `plugins: []` at the top level to satisfy that check. The TanStack
// Start + Nitro (cloudflare preset) plugins are still injected by the wrapper.
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      strategies: "generateSW",
      devOptions: { enabled: false },
      manifest: false,
      workbox: {
        // Do not precache the application shell. Deposit and withdrawal flows
        // must always load the latest deployed UI on installed mobile apps.
        globPatterns: ["**/*.{svg,png,webp,woff2}"],
        // TanStack Start serves every route itself. A Workbox fallback to `/`
        // can turn a mobile PWA resume after the native photo/file picker into
        // an unexpected navigation back to the home screen.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:woff2|png|jpg|jpeg|webp|svg|gif)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "assets-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  // Default Nitro preset is `cloudflare` — correct for Cloudflare Pages.
  vite: {
    esbuild: {
      // Strip console.* and debugger statements from production builds only
      drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    },
    resolve: {
      alias: {
        // htmlparser2 needs entities v4 paths; parse5 needs entities v6 subpath exports.
        "entities/lib/decode.js": path.resolve(
          __dirname,
          "node_modules/htmlparser2/node_modules/entities/lib/esm/decode.js",
        ),
        "entities/lib/escape.js": path.resolve(
          __dirname,
          "node_modules/htmlparser2/node_modules/entities/lib/esm/escape.js",
        ),
      },
    },
  },
});
