import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
const path = new URL("../public/icons/", import.meta.url);
await mkdir(path, { recursive: true });
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="104" fill="#087f8c"/><circle cx="256" cy="256" r="132" fill="none" stroke="white" stroke-width="24"/><path d="M256 174v88l sixty 38" fill="none" stroke="white" stroke-width="24" stroke-linecap="round"/></svg>`.replace(
    "l sixty 38",
    "l60 38",
  );
await writeFile(new URL("favicon.svg", path), svg);
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["maskable-512.png", 512],
]) {
  const source = name.startsWith("maskable")
    ? svg.replace('rx="104"', 'rx="0"').replace('r="132"', 'r="120"')
    : svg;
  await sharp(Buffer.from(source))
    .resize(size, size)
    .png()
    .toFile(new URL(name, path).pathname);
}
