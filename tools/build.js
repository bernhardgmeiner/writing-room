// Build: validate all packs, build the card PDF, inline packs, fonts and PDF into the engine.
// Usage: node tools/build.js [--packs <dir>] [--force]
//  - packs/ and every pack valid  -> dist/writing-room.html (the distribution file: one full, self-contained document),
//                                    dist/writing-room.artifact.html (body fragment for web previews), dist/test.html
//  - --packs <other dir> or --force -> TEST build only: dist/test.html and dist/test.artifact.html. Never ship these.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const root = path.join(__dirname, "..");
const args = process.argv.slice(2);
const pIdx = args.indexOf("--packs");
const dir = path.resolve(pIdx >= 0 ? args[pIdx + 1] : path.join(root, "packs"));
const FORCE = args.includes("--force");
const isDefaultDir = dir === path.join(root, "packs");
const DIST = path.join(root, "dist");
fs.mkdirSync(DIST, { recursive: true });

// ---------- packs ----------
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
let fail = 0; const packs = [];
for (const f of files) {
  const r = cp.spawnSync("node", [path.join(__dirname, "validate.js"), path.join(dir, f), "--quiet"], { encoding: "utf8" });
  if (r.status !== 0) { fail++; console.log("✗ " + f + "\n" + r.stdout.split("\n").filter(l => l.startsWith("ERROR")).map(l => "   " + l).join("\n")); }
  if (r.status === 0 || FORCE) packs.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}
// across packs: the grammar focus is shown in the library ("Schwerpunkt") and on the board (P), so inside one Schulstufe
// no two packs may share focus.label or focus.labelDe (a teacher could not tell them apart)
const dupFocus = [];
for (const k of ["label", "labelDe"]) {
  const seen = new Map();
  for (const p of packs) {
    const v = p.focus && p.focus[k]; if (!v) continue;
    const key = p.grade + "|" + String(v).trim().toLowerCase();
    if (seen.has(key)) dupFocus.push(`grade ${p.grade}: focus.${k} “${v}” in ${seen.get(key)} and ${p.id}`); else seen.set(key, p.id);
  }
}
if (dupFocus.length) { fail++; console.log("✗ focus labels not unique inside a Schulstufe\n" + dupFocus.map(l => "   " + l).join("\n")); }
if (fail && !FORCE) { console.log(`${fail} check(s) failed – build aborted`); process.exit(1); }
const release = isDefaultDir && !fail && !FORCE;

// ---------- card PDF ----------
const pdfFile = path.join(DIST, "karten-abcd.pdf");
const py = cp.spawnSync("python3", [path.join(__dirname, "cards.py"), pdfFile], { encoding: "utf8", cwd: root });
if (py.status !== 0) { console.log("card PDF failed:\n" + py.stderr); process.exit(1); }
const pdf64 = fs.readFileSync(pdfFile).toString("base64");

// ---------- fonts (base64 woff2; a variable font file is embedded once with its weight range) ----------
const FONT_DIR = path.join(__dirname, "fonts");
const faces = JSON.parse(fs.readFileSync(path.join(FONT_DIR, "fonts.json"), "utf8"));
const byFile = new Map();
for (const f of faces) { const g = byFile.get(f.file); if (g) g.weights.push(+f.weight); else byFile.set(f.file, Object.assign({}, f, { weights: [+f.weight] })); }
const fontCSS = [...byFile.values()].map(f => {
  const w = Math.min(...f.weights), W = Math.max(...f.weights);
  const data = fs.readFileSync(path.join(FONT_DIR, f.file)).toString("base64");
  return `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${w === W ? w : w + " " + W};font-display:swap;src:url(data:font/woff2;base64,${data}) format("woff2");unicode-range:${f.range};}`;
}).join("\n");
// SIL OFL 1.1 condition 2: the copyright notices and the licence travel with every copy of the embedded fonts.
// The licence body is the same in all three files (only the FAQ link differs between http and https): one copy, all copyright lines.
const OFL_FILES = ["OFL-AtkinsonHyperlegible.txt", "OFL-BricolageGrotesque.txt", "OFL-Literata.txt"].map(f => fs.readFileSync(path.join(FONT_DIR, f), "utf8").replace(/\r\n/g, "\n"));
const oflText = [...OFL_FILES.map(t => t.split("\n")[0].trim()), "", OFL_FILES[2].split("\n").slice(1).join("\n").trim()].join("\n");
if (!/SIL OPEN FONT LICENSE Version 1\.1/.test(oflText) || OFL_FILES.some(t => !/^Copyright /.test(t))) { console.log("tools/fonts/OFL-*.txt: licence text or copyright line missing"); process.exit(1); }
const fontStyle = `<style id="wr-fonts">/* Atkinson Hyperlegible (© 2020 Braille Institute of America), Bricolage Grotesque (© 2022 The Bricolage Grotesque Project Authors), Literata (© 2017 The Literata Project Authors): SIL Open Font License 1.1 */\n${fontCSS}\n</style>`;

// ---------- engine ----------
const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const d = new Date(); const buildDate = `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const eng = fs.readFileSync(path.join(root, "engine", "engine.html"), "utf8");
const json = JSON.stringify(packs).replace(/</g, "\\u003c");
const fill = s => s.replace("/*__PACKS__*/[]", () => json).replace('/*__CARDS_PDF__*/""', () => JSON.stringify(pdf64)).replace('/*__OFL__*/""', () => JSON.stringify(oflText).replace(/</g, "\\u003c")).replace("__BUILD_DATE__", buildDate).replace("<!--__FONTS__-->", () => fontStyle);
const fragment = fill(eng);
// full document: charset, viewport, title, description and all styles in <head>, the app in <body>
const head = eng.slice(0, eng.indexOf("</style>") + 8);
const body = eng.slice(head.length);
const styles = head.replace(/<meta charset="utf-8">\s*/, "").replace(/<title>[^<]*<\/title>\s*/, "");
const description = "Writing Room: Englische Modelltexte gemeinsam am Beamer bauen, Entscheidung für Entscheidung. 5. bis 12. Schulstufe, A1 bis B2. Von Bernhard Gmeiner, Lizenz CC BY-NC-SA 4.0.";
let full = fill(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Writing Room</title>
<meta name="description" content="${description}">
<meta name="author" content="Bernhard Gmeiner">
${styles.trim()}
</head>
<body>
<noscript><p style="font:20px sans-serif;padding:24px">Writing Room braucht JavaScript. Bitte JavaScript im Browser erlauben.</p></noscript>
${body.trim()}
<script>if(!window.__wrOK){var a=document.getElementById("app");if(a)a.innerHTML='<p style="font:20px sans-serif;padding:24px;max-width:40em">Writing Room konnte nicht starten. Wahrscheinlich ist der Browser zu alt. Bitte einen aktuellen Browser verwenden (Chrome, Edge, Firefox oder Safari ab 2020).</p>';}</script>
</body>
</html>
`);
// Content-Security-Policy for the standalone file: only the two inline scripts (by hash) may run, nothing may connect anywhere
const crypto = require("crypto");
const scripts = [...full.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 2 || /<script\s+src/i.test(full)) { console.log("expected exactly two inline scripts (app and old-browser guard)"); process.exit(1); }
const shas = scripts.map(m => `'sha256-${crypto.createHash("sha256").update(m[1]).digest("base64")}'`).join(" ");
const CSP = `default-src 'none'; script-src ${shas}; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'; form-action 'none'; base-uri 'none'`;
full = full.replace('<meta charset="utf-8">', () => `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${CSP}">\n<meta name="referrer" content="no-referrer">`);
for (const [name, s] of [["full", full], ["fragment", fragment]]) {
  const left = /\/\*__PACKS__\*\/|__CARDS_PDF__|\/\*__OFL__\*\/|__BUILD_DATE__|<!--__FONTS__-->/.exec(s);
  if (left) { console.log(`placeholder ${left[0]} left in the ${name} build – engine and build out of step`); process.exit(1); }
  if (/https?:\/\/fonts\.|<link\b|<script\s+src|@import/i.test(s)) { console.log(`external resource reference in the ${name} build`); process.exit(1); }
}
const out = release ? { full: "writing-room.html", fragment: "writing-room.artifact.html" } : { full: "test.html", fragment: "test.artifact.html" };
fs.writeFileSync(path.join(DIST, out.full), full);
fs.writeFileSync(path.join(DIST, out.fragment), fragment);
if (release) fs.writeFileSync(path.join(DIST, "test.html"), full);
const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + " KB";
console.log(`built ${packs.length} packs → dist/${out.full} (${kb(full)}), dist/${out.fragment} (${kb(fragment)})` + (release ? "" : `\nTEST BUILD from ${path.relative(root, dir) || "."}${FORCE ? " (--force)" : ""}: not for distribution`));
