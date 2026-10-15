// Fetches the three app fonts ONCE into tools/fonts/ (latin + latin-ext subsets, woff2) plus their OFL licence texts.
// The build embeds these files as base64, so the app itself never loads anything from the network.
// Usage: node tools/fetch-fonts.js   (needs curl and network; run again only to update the fonts)
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const OUT = path.join(__dirname, "fonts");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CSS_URL = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&display=swap";
const LICENCES = {
  "OFL-AtkinsonHyperlegible.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/atkinsonhyperlegible/OFL.txt",
  "OFL-BricolageGrotesque.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt",
  "OFL-Literata.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/literata/OFL.txt",
};
const curl = (url, file) => cp.execFileSync("curl", ["-sSfL", "-m", "60", "-A", UA, url].concat(file ? ["-o", file] : []), { encoding: file ? undefined : "utf8" });

fs.mkdirSync(OUT, { recursive: true });
const css = curl(CSS_URL);
// blocks look like: /* latin */ @font-face { font-family: 'X'; font-style: …; font-weight: …; src: url(…) format('woff2'); unicode-range: …; }
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g)].filter(m => m[1] === "latin" || m[1] === "latin-ext");
const prop = (body, k) => { const m = new RegExp(k + ":\\s*([^;]+);").exec(body); return m ? m[1].trim() : ""; };
const files = {}; const faces = [];
for (const [, subset, body] of blocks) {
  const family = prop(body, "font-family").replace(/'/g, ""), style = prop(body, "font-style"), weight = prop(body, "font-weight");
  const url = /url\(([^)]+)\)/.exec(body)[1], range = prop(body, "unicode-range");
  // a variable font serves several weights from one file: download it once
  if (!files[url]) { files[url] = `${family.replace(/\s+/g, "")}-${style}-${subset}-${Object.keys(files).length}.woff2`; curl(url, path.join(OUT, files[url])); }
  faces.push({ family, style, weight, file: files[url], range });
}
fs.writeFileSync(path.join(OUT, "fonts.json"), JSON.stringify(faces, null, 1));
for (const [name, url] of Object.entries(LICENCES)) { try { curl(url, path.join(OUT, name)); } catch (e) { console.log("licence text not fetched: " + name); } }
console.log(`${faces.length} faces, ${Object.keys(files).length} files in ${OUT}`);
