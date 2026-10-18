import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// The relay serves its own public /assets/* directly, before Admin routing.
// Build Admin bundles under a distinct URL AND on-disk directory so requests
// always reach the dedicated Admin Worker instead of the consumer SPA.
export default defineConfig({
  plugins: [react()],
  build: { assetsDir: "admin-assets" },
});
