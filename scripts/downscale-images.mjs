#!/usr/bin/env node
/**
 * One-off script: downscale oversized project images in place.
 *
 * Recursively walks a fixed set of project asset directories and, for any
 * .png/.jpg/.jpeg wider than MAX_WIDTH, resizes it down to MAX_WIDTH
 * (preserving aspect ratio) and overwrites the original file.
 *
 * Intentionally scoped to a handful of project folders — does NOT touch
 * public/assets/textures/ (pixel-exact WebGL screen texture) or any other
 * directory.
 */

import { readdir, stat, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const TARGET_DIRS = [
  "public/assets/Bandwidth",
  "public/assets/Ludex",
  "public/assets/Modifed double u net",
  "public/assets/Synthrescue",
].map((d) => path.join(repoRoot, d));

const MAX_WIDTH = 2560;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return;

  const before = await stat(filePath);
  const image = sharp(filePath);
  const meta = await image.metadata();

  if (!meta.width || meta.width <= MAX_WIDTH) return;

  const oldWidth = meta.width;
  const oldHeight = meta.height;
  const oldKB = before.size / 1024;

  const tmpPath = `${filePath}.tmp-downscale`;

  let pipeline = sharp(filePath).resize({
    width: MAX_WIDTH,
    kernel: sharp.kernel.lanczos3,
    withoutEnlargement: true,
  });

  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else {
    // .jpg / .jpeg
    pipeline = pipeline.jpeg({ quality: 90 });
  }

  await pipeline.toFile(tmpPath);

  const after = await stat(tmpPath);
  const newMeta = await sharp(tmpPath).metadata();

  await unlink(filePath);
  await rename(tmpPath, filePath);

  const newKB = after.size / 1024;
  const rel = path.relative(repoRoot, filePath);

  console.log(
    `${rel}: ${oldWidth}x${oldHeight} -> ${newMeta.width}x${newMeta.height} (${oldKB.toFixed(0)}KB -> ${newKB.toFixed(0)}KB)`
  );

  return { oldBytes: before.size, newBytes: after.size };
}

async function main() {
  let totalOld = 0;
  let totalNew = 0;
  let count = 0;

  for (const dir of TARGET_DIRS) {
    let files;
    try {
      files = await walk(dir);
    } catch (err) {
      console.error(`Skipping missing directory: ${dir}`, err.message);
      continue;
    }

    for (const file of files) {
      const result = await processFile(file);
      if (result) {
        totalOld += result.oldBytes;
        totalNew += result.newBytes;
        count += 1;
      }
    }
  }

  console.log("");
  console.log(`Resized ${count} file(s).`);
  console.log(
    `Total: ${(totalOld / 1024).toFixed(0)}KB -> ${(totalNew / 1024).toFixed(0)}KB (saved ${((totalOld - totalNew) / 1024).toFixed(0)}KB)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
