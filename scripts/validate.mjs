import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));

const requiredFiles = [
  "manifest.json",
  "sidepanel.html",
  "sidepanel.css",
  "sidepanel.js",
  "content-script.js",
  "probe-main.js",
  "annotation-script.js",
  "service-worker.js",
  "assets/icon-16.png",
  "assets/icon-32.png",
  "assets/icon-48.png",
  "assets/icon-128.png"
];

for (const file of requiredFiles) await access(resolve(root, file));

if (manifest.manifest_version !== 3) throw new Error("manifest_version must be 3");
if (manifest.version !== "0.7.3") throw new Error("manifest and package versions are out of sync");
if (Number(manifest.minimum_chrome_version) < 114) throw new Error("Chrome 114+ is required for the Side Panel API");
if (manifest.side_panel?.default_path !== "sidepanel.html") throw new Error("side panel entry is missing");

const allowedHosts = manifest.host_permissions || [];
if (allowedHosts.length !== 1 || allowedHosts[0] !== "https://www.xiaohongshu.com/*") {
  throw new Error("unexpected host permissions");
}

console.log(`Validated ${manifest.name} v${manifest.version}`);
