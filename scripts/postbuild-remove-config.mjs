import { access, rm } from "node:fs/promises";
import path from "node:path";

const distConfigPath = path.resolve(process.cwd(), "dist/config.js");

async function main() {
  try {
    await access(distConfigPath);
    await rm(distConfigPath);
    console.log(`[postbuild] Eliminado ${distConfigPath}`);
  } catch {
    console.log("[postbuild] dist/config.js no existe; no hay nada que borrar.");
  }
}

await main();