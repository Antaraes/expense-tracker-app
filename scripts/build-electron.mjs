import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import path from "path";
import { mkdirSync } from "fs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist-electron");

mkdirSync(outDir, { recursive: true });

const common = {
  bundle: true,
  platform: "node",
  external: ["electron", "electron-updater"],
  format: "cjs",
  target: "node18",
};

await esbuild.build({
  ...common,
  entryPoints: [path.join(root, "electron/main.ts")],
  outfile: path.join(outDir, "main.cjs"),
});

await esbuild.build({
  ...common,
  entryPoints: [path.join(root, "electron/preload.ts")],
  outfile: path.join(outDir, "preload.cjs"),
});
