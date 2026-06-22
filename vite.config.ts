// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";


import { VitePWA } from "vite-plugin-pwa";

// NOTE: Cloudflare Pages' build system inspects this file looking for a top-level
// `plugins` array. The Lovable wrapper resolves plugins internally, so we expose
// an empty `plugins: []` at the top level to satisfy that check. The TanStack
// Start + Nitro (cloudflare preset) plugins are still injected by the wrapper.
export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: {
        name: "ssr"
      }
    }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      strategies: "generateSW",
      devOptions: { enabled: false },
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/__/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:js|css|woff2|png|jpg|jpeg|webp|svg|gif)$/.test(url.pathname),
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
  },
});
