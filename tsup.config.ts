import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/tablecardify.css"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  loader: {
    ".css": "copy",
  },
});
