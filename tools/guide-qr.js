// Writes the QR codes for the guide links (grades 9–12) into engine/engine.html, between the GUIDE_QR markers.
// Usage: node tools/guide-qr.js   (needs the npm package qrcode: npm install qrcode)
// The codes are plain SVG paths, so the finished file still loads nothing from the internet.
"use strict";
const fs = require("fs"), path = require("path");
let QR;
try { QR = require("qrcode"); } catch (e) { console.log("npm install qrcode first"); process.exit(1); }
const root = path.join(__dirname, "..");
const file = path.join(root, "engine", "engine.html");
const html = fs.readFileSync(file, "utf8");
const m = html.match(/const GUIDE_URL = "([^"]+)";/);
const pages = html.match(/const GUIDE_PAGE = \{([\s\S]*?)\};/);
if (!m || !pages) { console.log("GUIDE_URL or GUIDE_PAGE missing in engine.html"); process.exit(1); }
const routes = [...new Set([...pages[1].matchAll(/\["([a-z]+)"/g)].map(x => x[1]))].sort();
const out = {};
for (const r of routes) {
  const qr = QR.create(m[1] + "/" + r + "/", { errorCorrectionLevel: "M" });
  const n = qr.modules.size, d = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {   // one rectangle per horizontal run of dark modules
    if (!qr.modules.get(x, y)) continue;
    let w = 1; while (x + w < n && qr.modules.get(x + w, y)) w++;
    d.push(`M${x + 2} ${y + 2}h${w}v1h-${w}z`); x += w - 1;
  }
  out[r] = { n: n + 4, d: d.join("") };   // 2 modules quiet zone on every side
}
const block = `/*GUIDE_QR:start*/const GUIDE_QR = ${JSON.stringify(out)};/*GUIDE_QR:end*/`;
const re = /\/\*GUIDE_QR:start\*\/[\s\S]*?\/\*GUIDE_QR:end\*\//;
if (!re.test(html)) { console.log("GUIDE_QR markers missing in engine.html"); process.exit(1); }
fs.writeFileSync(file, html.replace(re, () => block));
console.log("QR codes written: " + routes.join(", "));
