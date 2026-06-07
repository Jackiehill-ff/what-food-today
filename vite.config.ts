import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1]?.toLowerCase();
const base = repository && !repository.endsWith(".github.io") ? `/${repository}/` : "/";

export default defineConfig({
  base,
  plugins: [react()],
});
