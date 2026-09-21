import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "dist");
const targetDir = path.join(__dirname, "..", "upload_package", "front_end");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Copy dist/assets to targetDir/assets
const distAssets = path.join(distDir, "assets");
const targetAssets = path.join(targetDir, "assets");
if (fs.existsSync(distAssets)) {
  if (!fs.existsSync(targetAssets)) {
    fs.mkdirSync(targetAssets, { recursive: true });
  }
  const assetFiles = fs.readdirSync(distAssets);
  for (const f of assetFiles) {
    fs.copyFileSync(path.join(distAssets, f), path.join(targetAssets, f));
  }
}

// 2. The primary index.html MUST be the standard Vite dist/index.html (per Stake Engine docs)
const distHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
fs.writeFileSync(path.join(targetDir, "index.html"), distHtml, "utf-8");

// 3. Create standalone single-file index_standalone.html using safe replacer function (() => content)
let standaloneHtml = distHtml;
const cssMatch = distHtml.match(/<link rel="stylesheet"[^>]+href="\.\/assets\/([^"]+)"[^>]*>/);
const jsMatch = distHtml.match(/<script type="module"[^>]+src="\.\/assets\/([^"]+)"[^>]*><\/script>/);

if (cssMatch && cssMatch[1]) {
  const cssPath = path.join(distAssets, cssMatch[1]);
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    standaloneHtml = standaloneHtml.replace(cssMatch[0], () => `<style>\n${cssContent}\n</style>`);
  }
}

if (jsMatch && jsMatch[1]) {
  const jsPath = path.join(distAssets, jsMatch[1]);
  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, "utf-8");
    standaloneHtml = standaloneHtml.replace(jsMatch[0], () => `<script type="module">\n${jsContent}\n</script>`);
  }
}

fs.writeFileSync(path.join(targetDir, "index_standalone.html"), standaloneHtml, "utf-8");
console.log("Successfully packaged upload_package/front_end!");
