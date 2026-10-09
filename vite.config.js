import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
const base =
  `/${(process.env.BASE_PATH || "/").replace(/^\/+|\/+$/g, "")}/`.replace(
    "//",
    "/",
  );
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icons/*.png", "icons/favicon.svg"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 4000000,
      },
      manifest: {
        id: base,
        name: "ساعت کاری",
        short_name: "ساعت کاری",
        description: "ثبت ساعت ورود و خروج و محاسبه حقوق",
        lang: "fa",
        dir: "rtl",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#f5f7fa",
        background_color: "#f5f7fa",
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: `${base}icons/maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/recharts|d3-|react-smooth/.test(id)) return "charts";
            if (/date-fns/.test(id)) return "dates";
            return "vendor";
          }
        },
      },
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    fileParallelism: false,
  },
});
