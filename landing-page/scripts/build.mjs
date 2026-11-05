// Copies the static site from src/ to dist/ and adds the locally served Manrope files.
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const fontPackage = path.join(
  root,
  "node_modules/@fontsource-variable/manrope",
);

export const fontFiles = [
  "manrope-latin-wght-normal.woff2",
  "manrope-latin-ext-wght-normal.woff2",
];

await rm(dist, { recursive: true, force: true });
await cp(path.join(root, "src"), dist, { recursive: true });
await mkdir(path.join(dist, "fonts"), { recursive: true });
for (const file of fontFiles) {
  await cp(
    path.join(fontPackage, "files", file),
    path.join(dist, "fonts", file),
  );
}
await cp(
  path.join(fontPackage, "LICENSE"),
  path.join(dist, "fonts", "OFL-Manrope.txt"),
);
console.log(
  `Built landing page into ${path.relative(process.cwd(), dist) || "."}`,
);
