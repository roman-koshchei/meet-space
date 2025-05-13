import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],

  server: {
    proxy: {
      "/hub": {
        target: "ws://localhost:7153/hub",
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
});
