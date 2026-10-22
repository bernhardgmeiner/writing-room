#!/usr/bin/env node
// Writing Room pack validator. Usage: node validate.js pack.json [--samples N] [--quiet]
"use strict";
const fs = require("fs");
const args = process.argv.slice(2);
// internal: "--as-length L" = check one length of a pack whose texts are already resolved for L (textLong → text, ownLong → own)
const asIdx = args.indexOf("--as-length"); const AS = asIdx >= 0 ? args[asIdx + 1] : null;
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--samples" && args[i - 1] !== "--as-length");
const sIdx = args.indexOf("--samples");
const SAMPLES = sIdx >= 0 ? parseInt(args[sIdx + 1] || "3", 10) : 0;
const QUIET = args.includes("--quiet");
if (!file) { console.error("usage: validate.js pack.json [--samples N]"); process.exit(2); }

const errors = [], warns = [];
const E = m => errors.push(m), W = m => warns.push(m);
let P;
try { P = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log("ERROR: JSON parse: " + e.message); process.exit(1); }

// ---------- one decision per paragraph (22.10.2026) ----------
// A paragraph is always decided in ONE step: there are no continuation steps ("join") and no long-only steps ("len") any more.
// Packs with a short and a long version give every option of a paragraph step that grows in the long version a second text,
// `textLong` (the whole paragraph in its long form; same `by` map shape as `text` allowed); frame mode then needs `ownLong`/`ownLongDe`.
// The pack is checked once per length with the texts of that length (child runs with --as-length), the findings are merged.
if (!AS) {
  const pre = [], preW = [];
  const NOPARA0 = new Set(["title", "subject", "greeting", "signoff"]);
  const L0 = Object.keys(P.lengths || {}); const both = L0.includes("short") && L0.includes("long"); const fr = (P.modes || []).includes("frame");
  const wds = t => (typeof t === "string" ? [t] : Object.values((t && t.map) || {})).map(x => x.replace(/\{\{|\}\}|\[\[|\]\]/g, "").replace(/^###.*$/gm, " ").replace(/[“”"–…]/g, " ").split(/\s+/).filter(y => /[A-Za-z0-9]/.test(y)).length);
  (P.steps || []).forEach(st => {
    const w = `step ${st.id}`;
    if (st.join != null) pre.push(`${w}: "join" is not allowed: a paragraph is decided in one step (the long version uses textLong)`);
    if (st.len != null) pre.push(`${w}: "len" is not allowed: every step is used in both lengths (the long version uses textLong)`);
    const withL = (st.options || []).filter(o => o.textLong != null);
    if (withL.length) {
      if (!both) pre.push(`${w}: textLong only in packs with a short and a long version`);
      if (!st.slot || NOPARA0.has(st.slot)) pre.push(`${w}: textLong only in paragraph steps (not title, subject, greeting, sign-off or branching steps)`);
      if (withL.length !== st.options.length) pre.push(`${w}: textLong on ${withL.length} of ${st.options.length} options – all options of a step (traps too) have a long text or none`);
      withL.forEach(o => {
        const t = o.text, tl = o.textLong;
        if (typeof tl !== "string" && !(tl && tl.by && tl.map)) { pre.push(`${w}/${o.id}: textLong must be a string or {by,map}`); return; }
        if ((typeof t === "string") !== (typeof tl === "string") || (typeof t !== "string" && t.by !== tl.by)) pre.push(`${w}/${o.id}: textLong must have the same shape as text (string, or a map with the same by)`);
        if (JSON.stringify(t) === JSON.stringify(tl)) pre.push(`${w}/${o.id}: textLong is the same as text`);
        const a = wds(t), b = wds(tl); if (a.length === b.length && b.some((n, i) => n <= a[i])) pre.push(`${w}/${o.id}: textLong (${b.join("/")} words) must be longer than text (${a.join("/")})`);
      });
      if (fr && st.slot && !(st.ownLong && st.ownLongDe)) pre.push(`${w}: ownLong/ownLongDe needed (frame mode, the paragraph is longer in the long version)`);
    } else if (st.ownLong != null || st.ownLongDe != null) pre.push(`${w}: ownLong/ownLongDe without textLong`);
  });
  const os = require("os"), path = require("path"), cp = require("child_process");
  const outs = {};
  for (const L of L0.length ? L0 : ["short"]) {
    const Q = JSON.parse(JSON.stringify(P));
    (Q.steps || []).forEach(st => {
      if (L === "long" && st.ownLong != null) { st.own = st.ownLong; st.ownDe = st.ownLongDe; }
      delete st.ownLong; delete st.ownLongDe;
      (st.options || []).forEach(o => { if (L === "long" && o.textLong != null) o.text = o.textLong; delete o.textLong; });
    });
    const tmp = path.join(os.tmpdir(), `wr-validate-${process.pid}-${L}.json`);
    fs.writeFileSync(tmp, JSON.stringify(Q));
    const r = cp.spawnSync(process.execPath, [__filename, tmp, "--as-length", L, ...(SAMPLES ? ["--samples", String(SAMPLES)] : []), ...(QUIET ? ["--quiet"] : [])], { encoding: "utf8", cwd: process.cwd() });
    fs.unlinkSync(tmp);
    outs[L] = (r.stdout || "") + (r.stderr ? "\nERROR: child: " + r.stderr : "");
  }
  const Ls = Object.keys(outs), lines = L => outs[L].split("\n");
  const msgs = (L, kind) => lines(L).filter(l => l.startsWith(kind + ": ")).map(l => l.slice(kind.length + 2));
  const merged = { WARN: [], ERROR: [] };
  for (const kind of ["WARN", "ERROR"]) {
    const seen = new Map();
    for (const L of Ls) for (const m of msgs(L, kind)) { if (!seen.has(m)) seen.set(m, new Set()); seen.get(m).add(L); }
    for (const [m, set] of seen) {
      const um = /^UNUSED-GAP (\S+)$/.exec(m);
      if (um) { if (set.size === Ls.length) merged.ERROR.push(`gap ${um[1]} declared but never used`); continue; }
      merged[kind].push(set.size === Ls.length || /^\[(short|long)\]/.test(m) ? m : `[${[...set][0]}] ${m}`);
    }
  }
  merged.ERROR.unshift(...pre); merged.WARN.unshift(...preW);
  const info = [];
  Ls.forEach((L, i) => lines(L).forEach(l => { if (/^Pack /.test(l)) { if (!i) info.push(l); } else if (/^  \[/.test(l) || /^note:/.test(l) && !i) info.push(l); }));
  if (!QUIET) info.forEach(l => console.log(l));
  merged.WARN.forEach(w => console.log("WARN: " + w));
  merged.ERROR.forEach(e => console.log("ERROR: " + e));
  if (SAMPLES) for (const L of Ls) { const o = outs[L]; const k = o.indexOf("\n--- sample "); if (k >= 0) console.log(o.slice(k + 1).split("\n").filter(l => !/^(OK|FAIL)\b/.test(l)).join("\n").trimEnd()); }
  console.log(merged.ERROR.length ? `FAIL (${merged.ERROR.length} errors, ${merged.WARN.length} warnings)` : (merged.WARN.length ? `OK with ${merged.WARN.length} warnings` : "OK"));
  process.exit(merged.ERROR.length ? 1 : 0);
}

// Version 2: packs hang on Schulstufe (grade), never on textbooks or classes
const GRADES = { 5: "A1", 6: "A1+/A2", 7: "A2", 8: "A2+", 9: "A2+/B1", 10: "B1", 11: "B1+/B2", 12: "B2" };
const LENGTHS = { 5: { short: [60, 50, 70] }, 6: { short: [100, 85, 115] }, 7: { short: [120, 105, 135] }, 8: { short: [150, 135, 165] },
  9: { short: [200, 180, 220], long: [250, 225, 275] }, 10: { short: [250, 225, 275], long: [350, 315, 385] },
  11: { short: [250, 225, 275], long: [400, 360, 440] }, 12: { short: [250, 225, 275], long: [400, 360, 440] } };
// Matura format (grades 11–12, AUTHORING §7): e-mail and letter only around 250 words, essay only around 400 words; other types both
const MATURA_LEN = { email: ["short"], letter: ["short"], essay: ["long"] };
function wantLengths(g, type) { const L = LENGTHS[g]; if (!L) return null; return g >= 11 && MATURA_LEN[type] ? Object.fromEntries(MATURA_LEN[type].map(k => [k, L[k]])) : L; }
const THEMES = ["Ich & meine Welt", "Freund:innen & Familie", "Schule & Lernen", "Freizeit, Hobbys & Sport", "Feste & Feiern", "Tiere & Natur", "Essen & Gesundheit", "Reisen & andere Länder", "Medien & Technik", "Umwelt & Nachhaltigkeit", "Arbeit & Zukunft", "Gesellschaft & Zusammenleben", "Kultur & Kreativität"];
const TYPES = ["article", "blog", "email", "essay", "report", "story", "description", "postcard", "newspaper", "message", "diary", "letter", "review", "invitation"];
const CRITS = ["TA", "CC", "LSR", "LSA"];
const BANNED = ["delve", "tapestry", "realm", "game-changer", "game changer", "cutting-edge", "cutting edge", "seamless", "multifaceted", "pivotal", "leverage", "foster", "harness", "streamline", "robust", "nuanced", "rapidly evolving", "important to note", "worth noting", "navigate the complexities", "embark on", "a testament to", "significant", "increasingly", "consequences", "comprehensive", "methodology"];
const US = [["color", "colour"], ["favorite", "favourite"], ["organize", "organise"], ["realize", "realise"], ["recognize", "recognise"], ["center", "centre"], ["theater", "theatre"], ["traveled", "travelled"], ["traveling", "travelling"], ["program ", "programme "], ["neighbor", "neighbour"], ["behavior", "behaviour"], ["apologize", "apologise"], ["analyze", "analyse"], ["defense", "defence"], ["mom ", "mum "], ["vacation", "holiday"], ["fall ", "autumn "], ["math ", "maths "], ["gotten", "got"]];
const DE_MASC = [/\bSchüler\b(?!:)/, /\bSchülern\b/, /\bLehrer\b(?!:)/, /\bLehrern\b/, /\bLeser\b(?!:)/, /\bLesern\b/, /\bAutoren\b/, /\bExperten\b/, /\bFreunde\b(?!:)/, /\bJournalisten\b/, /\bZuschauer\b(?!:)/, /\bTeilnehmer\b(?!:)/, /\bBürger\b(?!:)/];

// ---------- helpers ----------
const strip = t => t.replace(/\{\{|\}\}/g, "").replace(/\[\[|\]\]/g, "");
const words = t => strip(t).replace(/^###.*$/gm, " ").replace(/[“”"–…]/g, " ").split(/\s+/).filter(x => /[A-Za-z0-9]/.test(x)).length;
function checkMarkers(t, where, allowScaffold, isTrap) {
  // returns true if fine
  let depthS = 0, depthF = 0, i = 0;
  while (i < t.length) {
    const two = t.substr(i, 2);
    if (two === "{{") { if (depthS || depthF) E(`${where}: nested/open {{ }}`); depthS++; i += 2; continue; }
    if (two === "}}") { if (!depthS) E(`${where}: stray }}`); if (depthF) E(`${where}: [[ ]] crosses }}`); depthS = Math.max(0, depthS - 1); i += 2; continue; }
    if (two === "[[") { if (depthF) E(`${where}: nested [[`); depthF++; i += 2; continue; }
    if (two === "]]") { if (!depthF) E(`${where}: stray ]]`); depthF = Math.max(0, depthF - 1); i += 2; continue; }
    i++;
  }
  if (depthS || depthF) E(`${where}: unclosed marker`);
  if (/\{\{/.test(t) && !allowScaffold) E(`${where}: {{ }} used but pack has no frame mode`);
  if (isTrap && /\{\{|\[\[/.test(t)) E(`${where}: trap text must not contain markers`);
}
function styleCheck(t, where, english) {
  if (/—/.test(t) || /--/.test(t)) E(`${where}: em dash or -- found`);
  if (english) {
    if (/"/.test(t)) E(`${where}: straight double quote " in text (use “ ”)`);
    if (/'/.test(t)) W(`${where}: straight apostrophe ' (use ’)`);
    const low = " " + strip(t).toLowerCase() + " ";
    for (const b of BANNED) if (low.includes(b)) W(`${where}: avoid “${b}”`);
    for (const [us, gb] of US) if (new RegExp("\\b" + us.trim() + "\\b").test(low)) W(`${where}: US spelling? “${us.trim()}” → “${gb.trim()}”`);
    if ((low.match(/not only/g) || []).length) notOnly++;
  } else {
    for (const r of DE_MASC) if (r.test(t)) E(`${where}: German generic masculine? (${r})`);
  }
}
let notOnly = 0;

// ---------- top level ----------
const req = ["id", "title", "titleDe", "grade", "level", "theme", "textType", "modes", "lengths", "minutes", "task", "steps", "order", "checks", "teacher"];
for (const k of req) if (P[k] == null) E(`missing field: ${k}`);
if (P.id && !/^[a-z0-9-]+$/.test(P.id)) E("id must be lowercase a-z0-9-");
for (const k of ["book", "unit", "classes"]) if (P[k] != null) E(`field "${k}" is not allowed in Version 2 (no textbooks, no classes)`);
const G = P.grade;
if (!Number.isInteger(G)) E("grade must be an integer (5, not \"5\")");
else if (!GRADES[G]) E("grade must be 5–12"); else if (P.level !== GRADES[G]) E(`level for grade ${G} must be "${GRADES[G]}"`);
if (!THEMES.includes(P.theme)) E("theme must be one of: " + THEMES.join(" | "));
const UPPER = G >= 9;
if (!TYPES.includes(P.textType)) E("textType invalid: " + P.textType);
// text-type conventions: header data in meta, greeting / sign-off steps
const META = P.meta || {};
if (P.textType === "review" && !(Number.isInteger(META.rating) && META.rating >= 1 && META.rating <= 5)) E("review: meta.rating must be an integer 1–5 (shown as stars)");
if (P.textType === "postcard" && !META.to) W("postcard: meta.to missing (the address on the right half)");
{ const slotsUsed = new Set((P.steps || []).map(s => s.slot).filter(Boolean));
  const CONV = { email: ["greeting", "signoff"], letter: ["greeting", "signoff"], postcard: ["greeting", "signoff"], message: ["greeting", "signoff"], invitation: ["greeting"] };   // invitation: sign-off optional
  for (const s of CONV[P.textType] || []) if (!slotsUsed.has(s)) W(`${P.textType}: no ${s} step (a ${s === "greeting" ? "greeting" : "sign-off"} is conventional for this text type)`);
  // e-mail header (AUTHORING §6): To, From, Date, Subject. A letter to the editor gets the same header when meta.to is set.
  const isAddr = v => typeof v === "string" && /@/.test(v);
  if (P.textType === "email" || P.textType === "letter") for (const k of ["to", "from"]) if (isAddr(META[k]) && !/^[^\s@]+@[a-z0-9.-]+\.example$/i.test(META[k].trim())) E(`meta.${k}: e-mail addresses use the reserved ending .example (name@classmail.example), never a real domain`);
  if (P.textType === "email") {
    if (!META.to || !META.from) W("email: meta.to and meta.from (addresses) are missing – the header is To, From, Date, Subject");
    if (!slotsUsed.has("subject")) W("email: no subject step (the header is To, From, Date, Subject)");
  }
  if (P.textType === "letter") {
    if (META.to) {
      if (!isAddr(META.to)) E("letter: meta.to is the e-mail address of the newspaper (letters@….example)");
      if (!isAddr(META.from)) E("letter with header: meta.from is the sender’s e-mail address (….example); the full name goes into meta.name");
      if (!META.name) E("letter with header: meta.name (the sender’s full name, shown under the sign-off) missing");
      if (!META.town) W("letter: meta.town missing (under the sign-off: full name, then the town)");
      if (!slotsUsed.has("subject")) W("letter with header: no subject step (the header is To, From, Date, Subject)");
    } else {
      if (UPPER) W("letter (grades 9–12, Matura format): a letter to the editor has the e-mail header To, From, Date, Subject – set meta.to (newspaper address), meta.from (sender address), meta.name, meta.town and add a subject step");
      if (META.from && !isAddr(META.from) && !META.name) W("letter: meta.from as the sender’s name is the old schema – use meta.name (full name) and meta.town");
      if (slotsUsed.has("subject")) W("letter: subject step but no meta.to – the subject line is only shown in the e-mail header");
    }
  } }
const modes = P.modes || [];
if (!modes.length || modes.some(m => !["full", "frame"].includes(m))) E("modes must be subset of full,frame");
const frame = modes.includes("frame");
const allLengths = Object.keys(P.lengths || {});
const lengths = AS ? [AS] : allLengths;   // the analysis below runs for the length of this child run
if (!allLengths.length || allLengths.some(l => !["short", "long"].includes(l))) E("lengths keys must be short/long");
if (LENGTHS[G]) { const WL = wantLengths(G, P.textType), want = Object.keys(WL);
  const matura = G >= 11 && MATURA_LEN[P.textType] ? ` (Matura format: ${{ essay: "an essay", email: "an e-mail", letter: "a letter" }[P.textType]} is only “around ${WL[want[0]][0]} words”)` : "";
  if (want.join() !== allLengths.join()) E(`grade ${G} ${P.textType} needs lengths: ${want.join(", ")}${matura}`);
  for (const l of want) { const L = (P.lengths || {})[l]; const [n, mn, mx] = WL[l]; if (L && (L.label !== `around ${n} words` || L.min !== mn || L.max !== mx)) E(`lengths.${l} for grade ${G} must be {label:"around ${n} words", min:${mn}, max:${mx}}`); } }
// per-length fields for a length the pack does not have (e.g. minutes.full.short in an essay with only "long")
{ const extra = (o, w) => Object.keys(o || {}).filter(k => !allLengths.includes(k)).forEach(k => W(`${w}.${k}: the pack has no length “${k}” (lengths: ${allLengths.join(", ")})`));
  for (const m of Object.keys(P.minutes || {})) extra(P.minutes[m], `minutes.${m}`);
  if (P.task) extra(P.task.words, "task.words"); if (P.focus) extra(P.focus.min, "focus.min"); }
if (!modes.includes("full")) E("modes must include full");
if (frame && !UPPER) E("frame mode only for grades 9–12");
if (!frame && UPPER) W("grades 9–12 usually offer frame mode too");
for (const l of allLengths) { const L = P.lengths[l]; if (!(L.min > 0 && L.max > L.min && L.label)) E(`lengths.${l} needs label,min,max`); }
for (const m of modes) for (const l of allLengths) if (!(P.minutes && P.minutes[m] && P.minutes[m][l])) E(`minutes.${m}.${l} missing`);
if (P.task) {
  for (const k of ["situation", "instruction", "de"]) if (!P.task[k]) E(`task.${k} missing`);
  if (UPPER && !(Array.isArray(P.task.points) && P.task.points.length === 3)) E("grades 9–12: task.points must have exactly 3 content points");
  if (!UPPER && P.task.points && !(P.task.points.length >= 2 && P.task.points.length <= 4)) E("grades 5–8: task.points 2–4 if given");
  if (!P.task.words) E("task.words missing"); else for (const l of allLengths) if (!P.task.words[l]) E(`task.words.${l} missing`);
  styleCheck(P.task.situation + " " + (P.task.points || []).join(" ") + " " + P.task.instruction, "task", true);
  styleCheck(P.task.de, "task.de", false);
}
for (const k of ["aim", "prep", "heft", "flow", "traps", "notes"]) { if (!P.teacher || !P.teacher[k]) E(`teacher.${k} missing`); else styleCheck(P.teacher[k], `teacher.${k}`, false); }
// teacher notes are public: no remarks for authors about the tools ("der Validator meldet …")
for (const k of Object.keys(P.teacher || {})) if (/\bvalidat|\bValidator|\bbuild\.js|\bengine\b/i.test(String(P.teacher[k]))) E(`teacher.${k}: internal tool remark (Validator/build/engine) in a public teacher note`);
// teacher.heft names the board heading exactly as the engine shows it in the exercise-book preview (AUTHORING §12)
const HEADING = { article: "Article", blog: "Blog post", email: "Email", essay: "Essay", report: "Report", story: "Story", description: "Description", postcard: "Postcard", newspaper: "News report", message: "Message", diary: "Diary", letter: "Letter", review: "Review", invitation: "Invitation" };
if (P.teacher && P.teacher.heft && HEADING[P.textType] && !P.teacher.heft.includes(`„${HEADING[P.textType]}“`)) W(`teacher.heft: board heading „${HEADING[P.textType]}“ not named (the exercise-book preview shows it)`);
if (!Array.isArray(P.checks) || P.checks.length < 4) E("checks: at least 4 items");
else P.checks.forEach((c, i) => { if (!c.en) E(`checks[${i}].en missing`); else styleCheck(c.en, `checks[${i}]`, true); });
if (P.focus) { if (!P.focus.label || !P.focus.labelDe || !P.focus.min) E("focus needs label,labelDe,min"); }
else E("focus missing");

// ---------- extra structural checks ----------
const dup = arr => arr.filter((x, i) => arr.indexOf(x) !== i);
if (dup(P.order || []).length) E("order has duplicate slots: " + dup(P.order).join(","));
if (dup((P.gaps || []).map(g => g.id)).length) E("duplicate gap ids");
if (P.focus && P.focus.min) for (const l of allLengths) if (P.focus.min[l] == null) E(`focus.min.${l} missing`);
if (false) for (const l of lengths) { const L = P.lengths[l]; const m = /(\d+)/.exec(L.label || ""); if (m) { const n = +m[1]; if (L.min < Math.floor(n * 0.9) - 1 || L.max > Math.ceil(n * 1.1) + 1) E(`lengths.${l}: min/max ${L.min}–${L.max} must stay within ±10% of ${n} (${Math.floor(n * 0.9)}–${Math.ceil(n * 1.1)})`); } }
const REF = /(?<!(?:Body|Step|Teil|Absatz|Option) )\b[1-8][A-G]\b|\bS\. ?\d|\bSeite \d|\bp\. ?\d|\bpp\. ?\d|\bUnit \d+\b|\bLehrwerk|\bSchulbuch/;
const studentFields = [];
if (P.task) studentFields.push(["task.situation", P.task.situation], ["task.instruction", P.task.instruction], ...(P.task.points || []).map((x, i) => ["task.points" + i, x]), ["task.de", P.task.de]);
(P.steps || []).forEach(st => { studentFields.push([st.id + ".q", st.q], [st.id + ".de", st.de], [st.id + ".own", st.own || ""], [st.id + ".ownDe", st.ownDe || ""]); (st.options || []).forEach(o => { const t = o.text; const ts = t == null ? [] : typeof t === "string" ? [t] : Object.values(t.map || {}); ts.forEach(x => studentFields.push([st.id + "/" + o.id, x])); studentFields.push([st.id + "/" + o.id + ".label", o.label || ""], [st.id + "/" + o.id + ".why", o.why || o.teaser || ""], [st.id + "/" + o.id + ".reject", (o.reject || "") + " " + (o.rejectDe || "")]); }); });
(P.gaps || []).forEach(g => studentFields.push(["gap " + g.id, g.q + " " + g.qDe]));
for (const [k, v] of Object.entries(P.teacher || {})) studentFields.push(["teacher." + k, v]);
for (const [w, t] of studentFields) if (REF.test(t || "")) E(`${w}: class/book/page reference (“${(t.match(REF) || [""])[0]}”)`);
// a join step (continuation block) shares the part of its paragraph, so only the other steps need unique parts
const partNames = (P.steps || []).filter(s => s.join !== true).map(s => s.part); if (dup(partNames).length) W("duplicate step part names: " + [...new Set(dup(partNames))].join(", "));
for (const [k, v] of Object.entries(P.meta || {})) if (typeof v === "string" && /\{(?!TODAY\})[A-Z]/.test(v)) E(`meta.${k}: gaps cannot be used in meta (only {TODAY})`);

// ---------- private ban list: textbook names, places, phrases, school hints ----------
try {
  const bl = fs.readFileSync(require("path").join(__dirname, "..", "private", "banlist.txt"), "utf8").split("\n").map(x => x.trim()).filter(Boolean);
  const raw = JSON.stringify(P);
  for (const term of bl) { const re = new RegExp("(^|[^A-Za-z0-9])" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^A-Za-z0-9])", /^[A-Z]/.test(term) ? "" : "i"); if (re.test(raw)) E(`banned term (textbook/school): “${term}”`); }
} catch (e) { if (!QUIET) console.log("note: private/banlist.txt not found – ban check skipped"); }

// ---------- steps ----------
const steps = P.steps || [];
const stepIdx = {}; const slots = {};
const gapDefs = {}; (P.gaps || []).forEach(g => { if (!/^[A-Z][A-Z0-9_]*$/.test(g.id)) E(`gap id ${g.id} must be UPPERCASE`); gapDefs[g.id] = g; if (!g.q || !g.qDe || g.default == null || !g.step) E(`gap ${g.id}: q,qDe,default,step required`); styleCheck(g.q, `gap ${g.id}.q`, true); styleCheck(g.qDe, `gap ${g.id}.qDe`, false); });
let trapCount = 0; const trapLetters = [];
steps.forEach((st, si) => {
  const w = `step ${st.id || si}`;
  if (!st.id) E(`${w}: id missing`);
  if (stepIdx[st.id] != null) E(`${w}: duplicate id`);
  stepIdx[st.id] = si;
  if (!st.q || !st.de || !st.part) E(`${w}: q, de, part required`);
  styleCheck(st.q + " " + st.part, w + ".q", true); styleCheck(st.de || "", w + ".de", false);
  if (st.len && !["both", "long"].includes(st.len)) E(`${w}: len must be both|long`);
  if (st.len === "long" && !lengths.includes("long")) E(`${w}: len long but pack has no long length`);
  if (st.slot) { if (slots[st.slot]) E(`${w}: slot ${st.slot} used twice`); slots[st.slot] = st;
    if (frame && !(st.own && st.ownDe)) E(`${w}: own/ownDe needed for frame mode`);
    if (st.own) styleCheck(st.own, w + ".own", true); if (st.ownDe) styleCheck(st.ownDe, w + ".ownDe", false); }
  const opts = st.options || [];
  if (opts.length < 2 || opts.length > 4) E(`${w}: 2–4 options`);
  opts.forEach((o, oi) => {
    const ow = `${w}/${o.id}`;
    if (o.l !== "ABCD"[oi]) E(`${ow}: letter should be ${"ABCD"[oi]}`);
    if (!o.id || !o.label) E(`${ow}: id and label required`);
    styleCheck(o.label || "", ow + ".label", true);
    if (o.trap) {
      trapCount++; trapLetters.push(o.l);
      if (!st.slot) E(`${ow}: trap in a branching step without slot`);
      if (!CRITS.includes(o.crit)) E(`${ow}: trap crit must be TA|CC|LSR|LSA`);
      if (!o.reject || !o.rejectDe) E(`${ow}: reject + rejectDe required`);
      else { styleCheck(o.reject, ow + ".reject", true); styleCheck(o.rejectDe, ow + ".rejectDe", false); }
    } else if (st.slot) {
      if (!o.why) E(`${ow}: why required`); else styleCheck(o.why, ow + ".why", true);
    }
    if (st.slot) { if (o.text == null) E(`${ow}: text required`); }
    else { if (o.text != null) E(`${ow}: branching step options have no text (use teaser)`); if (!o.teaser) W(`${ow}: teaser recommended for branching option`); else styleCheck(o.teaser, ow + ".teaser", true); }
  });
  if (opts.filter(o => o.trap).length > 1) E(`${w}: more than one trap`);
  if (dup(opts.map(o => o.id)).length) E(`${w}: duplicate option ids`);
  if (st.slot) { const tr = opts.find(o => o.trap); const val = opts.filter(o => !o.trap); if (tr && val.length) {
    const wc = o => { const t = o.text; const ts = typeof t === "string" ? [t] : Object.values((t && t.map) || {}); return ts.length ? ts.reduce((a, x) => a + words(x), 0) / ts.length : 0; };
    const avg = val.reduce((a, o) => a + wc(o), 0) / val.length; const tw = wc(tr);
    if (avg >= 8 && tw < 0.75 * avg) W(`${w}: trap is much shorter (${tw.toFixed(0)} words) than the valid options (avg ${avg.toFixed(0)}) – students spot it by length`);
    if (tw > 1.35 * avg && avg >= 8) W(`${w}: trap is much longer (${tw.toFixed(0)}) than the valid options (avg ${avg.toFixed(0)})`);
  } }
  if (opts.filter(o => !o.trap).length < 2 && st.slot) W(`${w}: only one valid option`);
  // one decision = one whole paragraph: the cards must stay readable on a 1024×768 board (three cards side by side)
  if (st.slot) opts.forEach(o => { const t = o.text; (typeof t === "string" ? [t] : Object.values((t && t.map) || {})).forEach(x => { const n = words(x);
    if (n > 115) E(`${w}/${o.id}: ${n} words on one card (max 105, never above 115): shorten the paragraph or move words to the introduction/conclusion`);
    else if (n > 105) W(`${w}/${o.id}: ${n} words on one card (max 105)`); }); });
  // four cards stand in two rows: only short cards fit (the long cards of a paragraph step: at most three options)
  if (st.slot && opts.length === 4) { const mx = Math.max(...opts.map(o => { const t = o.text; return Math.max(0, ...(typeof t === "string" ? [t] : Object.values((t && t.map) || {})).map(words)); }));
    if (mx > 70) E(`${w}: four options with cards of up to ${mx} words – a step with cards over 70 words has at most three options (three cards side by side; four would run off the board)`); }
});
if (!UPPER) { if (trapCount < 2 || trapCount > 4) W(`grades 5–8: ${trapCount} traps (aim 3–4; grade 5: 2–3)`); }
else if (trapCount < 4 || trapCount > 6) W(`${trapCount} traps (grades 9–12: 4–5, at most 6)`);
if (trapLetters.length >= 3 && new Set(trapLetters).size === 1) W("all traps on the same letter");
(P.order || []).forEach(s => { if (!slots[s]) E(`order: slot ${s} has no step`); });
Object.keys(slots).forEach(s => { if (!(P.order || []).includes(s)) E(`slot ${s} missing in order`); });
Object.values(gapDefs).forEach(g => { if (stepIdx[g.step] == null) { E(`gap ${g.id}: step ${g.step} unknown`); return; }
  const gs = steps[stepIdx[g.step]]; if (!gs.slot) E(`gap ${g.id}: step ${g.step} must be a text step (with slot)`);
  if (g.type === "number" && (typeof g.default !== "number" || (g.min != null && g.default < g.min) || (g.max != null && g.default > g.max))) E(`gap ${g.id}: numeric default out of range`);
  if (g.maxWords != null && (g.type === "number" || !Number.isInteger(g.maxWords) || g.maxWords < Math.max(1, g.minWords || 1, words(String(g.default))))) E(`gap ${g.id}: maxWords must be a whole number for a text gap, at least minWords and the words of the default`);
  // used later than its step? then every valid option of its step must contain it
  const contains = o => { const t = o.text; const ts = typeof t === "string" ? [t] : Object.values((t && t.map) || {}); return ts.length && ts.every(x => x.includes("{" + g.id + "}")); };
  const laterUse = steps.some((st, i) => i > stepIdx[g.step] && st.slot && st.options.some(o => !o.trap && (typeof o.text === "string" ? [o.text] : Object.values((o.text && o.text.map) || {})).some(x => x.includes("{" + g.id + "}"))));
  if (laterUse && !gs.options.filter(o => !o.trap).every(contains)) E(`gap ${g.id}: used after step ${g.step}, but not every valid option of ${g.step} contains it (the class may never be asked)`);
  if ((gs.len || "both") === "long" && steps.some(st => (st.len || "both") === "both" && st.slot && st.options.some(o => JSON.stringify(o.text || "").includes("{" + g.id + "}")))) E(`gap ${g.id}: asked only in the long version but used in steps of both lengths`);
});

// ---------- paragraphs: continuation blocks ("join": true) and the Oberstufe five-paragraph rule (AUTHORING §15) ----------
// A join step's block is appended (one space, no new line, no margin word) to the nearest earlier non-join content step in
// `order` on the same path. Paragraph steps = content steps that are not title / subject / greeting / sign-off and not join.
const NOPARA = new Set(["title", "subject", "greeting", "signoff"]);
const PARTS5 = ["Introduction", "Body paragraph 1", "Body paragraph 2", "Body paragraph 3", "Conclusion"];
const isJoin = st => !!st && st.join === true;
const optTexts = o => { const t = o.text; return t == null ? [] : typeof t === "string" ? [t] : Object.values((t && t.map) || {}); };
steps.forEach(st => {
  if (st.join == null) return;
  const w = `step ${st.id}`;
  if (st.join !== true) E(`${w}: "join" must be true (or left out)`);
  if (!st.slot) E(`${w}: a join step needs a slot (its block continues a paragraph)`);
  else if (NOPARA.has(st.slot)) E(`${w}: a ${st.slot} cannot be a join step`);
  if ((st.options || []).some(o => optTexts(o).some(t => /###/.test(t)))) E(`${w}: a join step continues a paragraph and cannot carry a “###” heading`);
});
// the paragraphs of one length in text order: [{st: paragraph step, blocks: [paragraph step, join steps …]}]
function paragraphs(L) {
  const act = new Set(steps.filter(s => (s.len || "both") === "both" || L === "long"));
  const paras = []; let open = null;
  for (const slot of P.order || []) {
    const st = slots[slot]; if (!st || !act.has(st)) continue;
    if (!isJoin(st)) { open = { st, blocks: [st] }; if (!NOPARA.has(slot)) paras.push(open); continue; }
    if (!open) { E(`[${L}] join step ${st.id} is the first content step: there is no paragraph to continue`); continue; }
    if (NOPARA.has(open.st.slot)) { E(`[${L}] join step ${st.id} would continue the ${open.st.slot} (${open.st.id}): a join step continues a paragraph`); continue; }
    open.blocks.push(st);
  }
  return paras;
}
const paraByLen = {};
for (const L of lengths) {
  const paras = paraByLen[L] = paragraphs(L);
  for (const g of paras) g.blocks.forEach((b, i) => {
    if (!i) return;
    if (b.part !== g.st.part) E(`${b.id}: part “${b.part}” must be “${g.st.part}”, the part of the paragraph it continues (${g.st.id})`);
    // the class must have chosen the paragraph so far before it continues it
    if (stepIdx[b.id] < stepIdx[g.blocks[i - 1].id]) E(`${b.id}: join step comes before ${g.blocks[i - 1].id} in steps, but continues it – decide the paragraph first`);
  });
  if (UPPER) {
    const parts = paras.map(g => g.st.part);
    if (paras.length !== 5) E(`[${L}] grades 9–12: exactly 5 paragraphs (Introduction, Body paragraph 1–3, Conclusion) on every path, found ${paras.length} (${paras.map(g => g.st.id).join(", ")}). A long version makes paragraphs longer (textLong); it never adds paragraphs.`);
    else if (parts.join("|") !== PARTS5.join("|")) E(`[${L}] grades 9–12: the parts of the 5 paragraphs must be ${PARTS5.map(x => "“" + x + "”").join(", ")} – found ${parts.map(x => "“" + x + "”").join(", ")}`);
  }
}
// paragraph number of every paragraph and join step (longest version: it contains every paragraph step)
const paraNo = {};
(paraByLen.long || paraByLen.short || []).forEach((g, i) => g.blocks.forEach(b => { paraNo[b.id] = i; }));

// resolve text variants
function variants(o, st) { // returns list of {key:{by:val}|null, text}
  const t = o.text;
  if (t == null) return [];
  if (typeof t === "string") return [{ cond: null, text: t }];
  if (t && t.by && t.map) {
    const bi = stepIdx[t.by]; const bs = steps[bi];
    if (bi == null || bi >= stepIdx[st.id]) { E(`${st.id}/${o.id}: by=${t.by} must be an earlier step`); return []; }
    if (bs.slot) E(`${st.id}/${o.id}: by=${t.by} must refer to a branching step (no slot)`);
    if ((bs.len || "both") === "long" && (st.len || "both") === "both") E(`${st.id}/${o.id}: by=${t.by} is long-only but this step is used in both lengths`);
    const need = bs.options.filter(x => !x.trap).map(x => x.id);
    for (const n of need) if (t.map[n] == null) E(`${st.id}/${o.id}: map missing key ${n}`);
    for (const k of Object.keys(t.map)) if (!need.includes(k)) E(`${st.id}/${o.id}: map has unknown key ${k}`);
    return need.filter(n => t.map[n] != null).map(n => ({ cond: [t.by, n], text: t.map[n] }));
  }
  E(`${st.id}/${o.id}: text must be string or {by,map}`); return [];
}
// per-text checks
steps.forEach(st => { if (!st.slot) return; st.options.forEach(o => {
  variants(o, st).forEach(v => {
    const w = `${st.id}/${o.id}${v.cond ? "[" + v.cond[1] + "]" : ""}`;
    styleCheck(v.text, w, true);
    checkMarkers(v.text, w, frame, !!o.trap);
    // AUTHORING §11: no comma before "because" in model texts (traps may contain it only if their reject names it)
    if (!o.trap && /(?<!\bthough),\s*(\[\[|\{\{)*because\b/.test(v.text.replace(/\]\]|\}\}/g, ""))) W(`${w}: comma before “because” (no comma before because in model texts)`);
    const gapsUsed = (v.text.match(/\{([A-Z][A-Z0-9_]*)\}/g) || []).map(x => x.slice(1, -1));
    for (const g of gapsUsed) { if (!gapDefs[g]) E(`${w}: gap {${g}} not declared`); else if (stepIdx[gapDefs[g].step] > stepIdx[st.id]) E(`${w}: gap {${g}} used before its step ${gapDefs[g].step}`); }
    if (frame && !o.trap) {
      const all = words(v.text);
      const sc = (v.text.match(/\{\{(.+?)\}\}/g) || []).map(x => words(x)).reduce((a, b) => a + b, 0);
      const ratio = all ? sc / all : 0;
      if (st.slot !== "title" && st.slot !== "subject" && st.slot !== "greeting" && st.slot !== "signoff") {
        if (ratio < 0.15 || ratio > 0.6) W(`${w}: scaffold ratio ${(ratio * 100).toFixed(0)}% (aim 20–50%)`);
        const own = v.text.replace(/\{\{.+?\}\}/g, "|").split("|").map(x => words(x));
        if (Math.max(0, ...own) < 6) W(`${w}: no own-writing stretch of 6+ words outside scaffold`);
        // R2: a sentence-initial focus phrase in an own part disappears under the dotted line in frame mode
        for (const part of v.text.replace(/\{\{.+?\}\}/g, "\u0001").split("\u0001")) if (/(^\s*|[.?!:]\s+|“\s*)\[\[/.test(part)) { W(`${w}: sentence-initial [[…]] outside {{…}} – hidden in frame mode`); break; }
        // R2: a gap glued to other characters inside an own part ("{N}%", "RR-{ORDER})") is torn apart in frame mode
        for (const part of v.text.replace(/\{\{.+?\}\}/g, "\u0001").split("\u0001")) if (/[^\s(“‘]\{[A-Z][A-Z0-9_]*\}|\{[A-Z][A-Z0-9_]*\}[^\s,.;:!?)”’]/.test(part)) { W(`${w}: gap glued to a word inside an own part – put it into {{…}} or separate it`); break; }
      }
    }
  });
}); });
if (notOnly > 1) W(`"not only" used ${notOnly} times (max 1)`);
// gaps used somewhere
// a gap may be used in one length only (e.g. only in the long texts): the merged report makes this an error only if no length uses it
Object.keys(gapDefs).forEach(g => { const used = steps.some(st => st.slot && st.options.some(o => variants(o, st).some(v => v.text.includes("{" + g + "}")))); if (!used) E(`UNUSED-GAP ${g}`); });

// ---------- path analysis per length ----------
const branchSteps = steps.filter(s => !s.slot);
function branchCombos() { let combos = [{}]; for (const b of branchSteps) { const n = []; for (const c of combos) for (const o of b.options.filter(x => !x.trap)) n.push(Object.assign({}, c, { [b.id]: o.id })); combos = n; } return combos; }
const fillGaps = t => t.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (m, g) => gapDefs[g] ? String(gapDefs[g].default) : m);
function resolve(o, combo, picks) {
  const t = o.text; if (typeof t === "string") return t;
  const key = combo[t.by] != null ? combo[t.by] : picks[t.by]; return t.map[key];
}
const countFocus = t => (t.match(/\[\[/g) || []).length;
const gapExtra = act => (P.gaps || []).filter(g => g.maxWords != null && g.type !== "number").reduce((n, g) => n + (g.maxWords - words(String(g.default))) * act.filter(st => st.slot && !COUNT_EXCL.has(st.slot) && st.options.some(o => !o.trap && JSON.stringify(o.text || "").includes("{" + g.id + "}"))).length, 0);
const COUNT_EXCL = new Set(["title", "subject"]);
const report = {};
for (const L of lengths) {
  const act = steps.filter(s => (s.len || "both") === "both" || L === "long");
  let minW = Infinity, maxW = -Infinity, minF = Infinity, worst = null, best = null, paths = 1;
  const allCombos = branchCombos(); const firstCombo = allCombos[0];
  for (const combo of allCombos) {
    // per slot min/max (texts that depend on text-steps are rare; handle by-text-steps by enumerating those pairs crudely)
    let lo = 0, hi = 0, f = 0; const loPick = {}, hiPick = {};
    for (const st of act.filter(s => s.slot)) {
      const vals = st.options.filter(o => !o.trap).map(o => { const t = resolve(o, combo, {}); return { id: o.id, t: t, w: COUNT_EXCL.has(st.slot) ? 0 : words(fillGaps(t || "")), f: countFocus(t || "") }; });
      if (vals.some(v => v.t == null)) continue;
      const mn = vals.reduce((a, b) => a.w <= b.w ? a : b), mx = vals.reduce((a, b) => a.w >= b.w ? a : b);
      lo += mn.w; hi += mx.w; loPick[st.id] = mn.id; hiPick[st.id] = mx.id; f += Math.min(...vals.map(v => v.f));
      if (combo === firstCombo) paths *= vals.length;
    }
    if (lo < minW) { minW = lo; worst = Object.assign({}, combo, loPick); }
    if (hi > maxW) { maxW = hi; best = Object.assign({}, combo, hiPick); }
    minF = Math.min(minF, f);
  }
  const Lc = P.lengths[L];
  if (minW < Lc.min) E(`[${L}] shortest path ${minW} words < min ${Lc.min}  (${JSON.stringify(worst)})`);
  if (maxW > Lc.max) E(`[${L}] longest path ${maxW} words > max ${Lc.max}  (${JSON.stringify(best)})`);
  // gaps with maxWords: the longest path with the longest allowed class answers must stay within max (each gap counted once per step that uses it)
  else if (maxW + gapExtra(act) > Lc.max) E(`[${L}] longest path ${maxW} + ${gapExtra(act)} words of longest class answers (maxWords) > max ${Lc.max}`);
  else if (maxW > Lc.max - 3 && (P.gaps || []).some(g => g.type !== "number" && g.maxWords == null)) W(`[${L}] longest path ${maxW} is within 3 words of max ${Lc.max}: longer class answers for text gaps may push it over – trim a little`);
  const fmin = P.focus && P.focus.min ? P.focus.min[L] : 0;
  if (fmin && minF < fmin) E(`[${L}] min focus count ${minF} < required ${fmin}`);
  // join blocks are counted with their paragraph: every block is counted once, so the path totals are those of the blocks
  report[L] = { words: [minW, maxW], focusMin: minF, steps: act.length, paras: (paraByLen[L] || []).length, approxPaths: paths };
}

// ---------- paragraph balance (grades 9–12) ----------
// On no path may a paragraph (continuation blocks included) be more than 2.5 times as long as the shortest body paragraph:
// the long version makes all paragraphs longer, not one. Paragraphs consist of different steps, so per branch choice the worst
// path is: the longest version of one paragraph against the shortest version of another body paragraph.
const BALANCE = 2.5;
if (UPPER) for (const L of lengths) {
  const paras = paraByLen[L] || []; if (paras.length !== 5) continue;
  const worst = {};
  for (const combo of branchCombos()) {
    const span = paras.map(g => { let lo = 0, hi = 0;
      for (const b of g.blocks) { const ws = b.options.filter(o => !o.trap).map(o => resolve(o, combo, {})).filter(t => t != null).map(t => words(fillGaps(t))); if (ws.length) { lo += Math.min(...ws); hi += Math.max(...ws); } }
      return { part: g.st.part, lo, hi }; });
    span.forEach((a, i) => span.forEach((b, j) => {
      if (i === j || !/^Body paragraph/.test(b.part) || !b.lo) return;
      const r = a.hi / b.lo; if (r > BALANCE && (!worst[a.part] || r > worst[a.part].r)) worst[a.part] = { r, a, b, combo };
    }));
  }
  for (const w of Object.values(worst)) W(`[${L}] paragraph balance: ${w.a.part} can have ${w.a.hi} words while ${w.b.part} has ${w.b.lo} (${w.r.toFixed(1)}×, max ${BALANCE}×)${Object.keys(w.combo).length ? " " + JSON.stringify(w.combo) : ""} – lengthen the short paragraph (textLong) or shorten the long one`);
}

// ---------- text-type conventions of the Matura writing guide (AUTHORING §6, §11) ----------
const plainT = t => strip(fillGaps(t)).replace(/^###.*$/gm, " ").trim();
const sameBranch = (va, vb) => !(va.cond && vb.cond && va.cond[0] === vb.cond[0] && va.cond[1] !== vb.cond[1]);
// (a) essays: rhetorical questions only in the Introduction; the title is a statement, never a question
if (P.textType === "essay") steps.forEach(st => {
  if (st.slot === "title") { st.options.filter(o => !o.trap).forEach(o => variants(o, st).forEach(v => {
    if (/\?/.test(plainT(v.text))) E(`essay: ${st.id}/${o.id}${v.cond ? "[" + v.cond[1] + "]" : ""}: question as an essay title – an essay title is a factual statement (a question title sounds like an article); allowed only as a trap (crit TA)`);
  })); return; }
  if (!st.slot || st.part === "Introduction") return;
  st.options.filter(o => !o.trap).forEach(o => variants(o, st).forEach(v => {
    if (/\?(?=[”’)]*(\s|$))/.test(plainT(v.text))) W(`essay: ${st.id}/${o.id}${v.cond ? "[" + v.cond[1] + "]" : ""}: question outside the Introduction – an essay asks rhetorical questions only there; state the point instead`);
  }));
});
// (b) greeting and sign-off (grades 9–12): Dear Sir or Madam / Dear Editor → Yours faithfully; Dear Mr/Ms <Name> → Yours sincerely;
// "Kind regards", "Best wishes" … only in informal e-mails; "Hello Ms …" is an informal greeting in a formal e-mail
if (UPPER && (P.textType === "email" || P.textType === "letter") && slots.greeting && slots.signoff) {
  const first = t => plainT(t).split("\n")[0].trim();
  const IMPERSONAL = /^Dear (Sir or Madam|Sir\/Madam|Madam or Sir|Sirs|(the )?Editors?|(?:[A-Z][a-z]+ )*(Team|Panel|Committee|Board|Organisers|Organizers|Manager|Department|Office|Services?))\s*,?$/;
  const NAMED = /^Dear (Mr|Ms|Mrs|Miss|Mx|Dr|Prof|Professor)\.? \S/;
  const HELLO_TITLE = /^(Hello|Hi|Hey)( there)?,? (Mr|Ms|Mrs|Miss|Mx|Dr|Prof|Professor)\.? \S/;
  const gs = slots.greeting, ss = slots.signoff, pair = new Set();
  gs.options.filter(o => !o.trap).forEach(go => variants(go, gs).forEach(vg => {
    const g = first(vg.text), gw = `${gs.id}/${go.id}${vg.cond ? "[" + vg.cond[1] + "]" : ""}`;
    if (HELLO_TITLE.test(g)) W(`greeting ${gw}: “${g}” is an informal greeting (Hello/Hi) with a title – a formal e-mail opens with “Dear Mr/Ms <Name>,” (→ “Yours sincerely,”)`);
    const need = IMPERSONAL.test(g) ? "Yours faithfully," : NAMED.test(g) ? "Yours sincerely," : null; if (!need) return;
    ss.options.filter(o => !o.trap).forEach(so => variants(so, ss).forEach(vs => {
      if (!sameBranch(vg, vs)) return; const s = first(vs.text);
      if (s.replace(/,$/, "").toLowerCase() !== need.replace(/,$/, "").toLowerCase()) pair.add(`greeting/sign-off: the valid greeting “${g}” (${gw}) needs “${need}”, but the valid sign-off ${ss.id}/${so.id}${vs.cond ? "[" + vs.cond[1] + "]" : ""} is “${s}” (Dear Sir or Madam / Dear Editor → Yours faithfully; Dear Mr/Ms <Name> → Yours sincerely; “Kind regards”, “Best wishes” only in informal e-mails)`);
    }));
  }));
  pair.forEach(W);
}
// (c) letter to the editor: the first sentence names the article (title in “…” or the word article/report), the publication and the date
if (P.textType === "letter") {
  const DATE = /\b(yesterday|today|this (morning|week|weekend|month)|last (week|month|weekend|year|night|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d{1,2}(st|nd|rd|th)? (January|February|March|April|May|June|July|August|September|October|November|December)|(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}|\d{1,2}\/\d{1,2}(\/\d{2,4})?)\b/i;
  steps.filter(st => st.slot && st.part === "Introduction" && !isJoin(st)).forEach(st => st.options.filter(o => !o.trap).forEach(o => variants(o, st).forEach(v => {
    const t = plainT(v.text); const s = (/^[\s\S]*?[.!?][”’]?(?=\s+[“‘(A-Z0-9]|\s*$)/.exec(t) || [t])[0];
    if (!((/“[^”]+”/.test(s) || /\b(article|report)\b/i.test(s)) && DATE.test(s))) W(`letter to the editor: ${st.id}/${o.id}${v.cond ? "[" + v.cond[1] + "]" : ""}: the first sentence must name the article (its title in “…” or the word “article”/“report”), the publication and the date (e.g. “I am writing in response to your article “…”, which appeared in … on 3 May.”) – found: “${s.slice(0, 90)}${s.length > 90 ? "…" : ""}”`);
  })));
}

// ---------- repetition analysis ----------
const firstWord = t => (strip(t).replace(/^###.*\n/, "").trim().match(/^[“"]?([A-Za-z’']+)/) || [, ""])[1].toLowerCase();
const STOP = new Set("the a an and or but to of in on at for with is are was were be been it this that these those we you they i he she our your their my as by from not have has had will would can could should there here so if than then also more most very just about into over".split(" "));
function ngrams(t, n) { const ws = strip(fillGaps(t)).toLowerCase().replace(/[^a-z0-9’' ]/g, " ").split(/\s+/).filter(Boolean); const s = new Set(); for (let i = 0; i + n <= ws.length; i++) { const g = ws.slice(i, i + n); if (g.filter(x => !STOP.has(x) && !TOPIC.has(x)).length >= 2) s.add(g.join(" ")); } return s; }
const TOPIC = new Set((P.topicWords || []).map(x => x.toLowerCase()));
// Real paragraphs: a join block belongs to its paragraph. Its first word is a sentence opener inside the paragraph, not a paragraph
// opener; it must not repeat the first word of the block it continues.
// Linkers (AUTHORING §12): never twice in the same or neighbouring paragraphs, never three times on one path.
const LINKERS = ["however", "moreover", "furthermore", "in addition", "additionally", "on the other hand", "on the one hand", "therefore", "as a result", "as a consequence",
  "consequently", "for this reason", "that is why", "this is why", "for example", "for instance", "although", "even though", "despite", "in spite of", "whereas",
  "nevertheless", "nonetheless", "what is more", "besides", "on top of that", "firstly", "secondly", "thirdly", "first of all", "to begin with", "finally", "lastly",
  "in conclusion", "to sum up", "all in all", "in short", "in other words", "in fact", "instead", "otherwise", "meanwhile", "afterwards", "after that", "in the end",
  "similarly", "likewise", "in contrast", "by contrast", "on the contrary", "above all", "admittedly", "after all", "even so", "as well as that", "apart from that",
  "while", "yet", "though", "even if", "also", "too", "then", "now"];
// linkers that are only linkers in some positions (review v2o1): "also" at the start of a sentence or after a comma, "too" at the
// end of a sentence, "now" at the start of a sentence; "while" not in "(for) a while", "yet" not in "not yet" or at the end of a
// sentence ("… yet."), "though" not inside "even though" (its own linker), "then" not in "(every) now and then", "instead" not in "instead of"
const SENT = "(?<=(?:^|[.!?:;]|[.!?][”’\"])\\s*|“\\s*)";
const LINKER_PAT = { instead: "instead(?!\\s+of\\b)", while: "(?<!\\ba\\s+)while", yet: "(?<!\\bnot\\s+)yet(?!\\s*[.!?])", though: "(?<!\\beven\\s+)though", then: "(?<!\\bnow\\s+and\\s+)then",
  also: "(?<=(?:^|[.!?:;]|[.!?][”’\"]|,)\\s*|“\\s*)also", too: "too(?=\\s*[.!?])", now: SENT + "now" };
const LINKER_RE = new RegExp("\\b(" + LINKERS.slice().sort((a, b) => b.length - a.length).map(x => LINKER_PAT[x] || x.replace(/ /g, "\\s+")).join("|") + ")\\b", "gi");
const linkersIn = t => (strip(fillGaps(t)).replace(/^###.*$/gm, " ").match(LINKER_RE) || []).map(x => x.toLowerCase().replace(/\s+/g, " "));
const compatible = (va, vb) => !(va.cond && vb.cond && va.cond[0] === vb.cond[0] && va.cond[1] !== vb.cond[1]);
const textSlots = steps.filter(s => s.slot && !COUNT_EXCL.has(s.slot));
const reps = [];
for (let i = 0; i < textSlots.length; i++) for (let j = i + 1; j < textSlots.length; j++) {
  const A = textSlots[i], B = textSlots[j];
  const near = paraNo[A.id] != null && paraNo[B.id] != null && Math.abs(paraNo[A.id] - paraNo[B.id]) <= 1;
  for (const a of A.options.filter(o => !o.trap)) for (const b of B.options.filter(o => !o.trap)) {
    for (const va of variants(a, A)) for (const vb of variants(b, B)) {
      if (!compatible(va, vb)) continue;
      const fa = firstWord(va.text), fb = firstWord(vb.text);
      if (!isJoin(A) && !isJoin(B) && fa && fa === fb && !["the"].includes(fa)) reps.push(`same paragraph opener “${fa}”: ${A.id}/${a.id} + ${B.id}/${b.id}`);
      const ga = ngrams(va.text, 3), gb = ngrams(vb.text, 3); const shared = [...ga].filter(x => gb.has(x));
      if (shared.length) reps.push(`repeated phrase “${shared[0]}”: ${A.id}/${a.id} + ${B.id}/${b.id}`);
      if (near) { const la = new Set(linkersIn(va.text)); const twice = linkersIn(vb.text).find(x => la.has(x));
        if (twice) reps.push(`linker “${twice}” twice in ${paraNo[A.id] === paraNo[B.id] ? "one paragraph" : "neighbouring paragraphs"}: ${A.id}/${a.id} + ${B.id}/${b.id}`); }
    }
  }
}
// inside one block, and the opener of a join block against the block it continues
steps.filter(s => s.slot && !COUNT_EXCL.has(s.slot)).forEach(st => st.options.filter(o => !o.trap).forEach(o => variants(o, st).forEach(v => {
  const ls = linkersIn(v.text); const twice = ls.find((x, k) => ls.indexOf(x) !== k); if (twice) reps.push(`linker “${twice}” twice in one block: ${st.id}/${o.id}`);
})));
for (const L of lengths) for (const g of paraByLen[L] || []) g.blocks.forEach((b, k) => { if (!k) return; const prev = g.blocks[k - 1];
  for (const a of prev.options.filter(o => !o.trap)) for (const c of b.options.filter(o => !o.trap)) for (const va of variants(a, prev)) for (const vc of variants(c, b)) {
    if (!compatible(va, vc)) continue; const fa = firstWord(va.text), fc = firstWord(vc.text);
    if (fa && fa === fc && fa !== "the") reps.push(`join block ${b.id}/${c.id} starts with “${fc}” like the block it continues (${prev.id}/${a.id})`);
  } });
// three times on one path: per branch choice, the most a step can add (any valid option)
for (const L of lengths) { const act = steps.filter(s => s.slot && !COUNT_EXCL.has(s.slot) && ((s.len || "both") === "both" || L === "long"));
  for (const combo of branchCombos()) { const tot = {};
    for (const st of act) { const most = {};
      for (const o of st.options.filter(x => !x.trap)) { const t = resolve(o, combo, {}); if (t == null) continue; const c = {}; linkersIn(t).forEach(x => { c[x] = (c[x] || 0) + 1; }); for (const [x, n] of Object.entries(c)) most[x] = Math.max(most[x] || 0, n); }
      for (const [x, n] of Object.entries(most)) tot[x] = (tot[x] || 0) + n; }
    for (const [x, n] of Object.entries(tot)) if (n >= 3) reps.push(`[${L}] linker “${x}” can appear ${n} times on one path${Object.keys(combo).length ? " " + JSON.stringify(combo) : ""}`);
  } }
[...new Set(reps)].slice(0, 40).forEach(r => W("repetition: " + r));

// ---------- samples ----------
function randomPath(L) {
  const act = steps.filter(s => (s.len || "both") === "both" || L === "long"); const picks = {};
  for (const st of act) { const v = st.options.filter(o => !o.trap); picks[st.id] = v[Math.floor(Math.random() * v.length)].id; }
  const out = [];   // one line per paragraph: a join block follows its paragraph after one space
  for (const slot of P.order) { const st = slots[slot]; if (!st || !act.includes(st)) continue; const o = st.options.find(x => x.id === picks[st.id]); const t = strip(fillGaps(resolve(o, picks, picks)));
    if (isJoin(st) && out.length) out[out.length - 1] += " " + t; else out.push(`[${st.part}] ` + t); }
  return { picks, text: out.join("\n") };
}

// ---------- output ----------
if (!QUIET) {
  console.log(`Pack ${P.id} (${P.level} ${P.textType}) – traps: ${trapCount}`);
  for (const L of lengths) console.log(`  [${L}] steps ${report[L].steps}, paragraphs ${report[L].paras}, words ${report[L].words[0]}–${report[L].words[1]} (target ${P.lengths[L].min}–${P.lengths[L].max}), min focus ${report[L].focusMin}, ~${report[L].approxPaths} paths per branch`);
}
// the same finding from both lengths is reported once
for (const a of [warns, errors]) { const u = [...new Set(a)]; a.length = 0; a.push(...u); }
warns.forEach(w => console.log("WARN: " + w));
errors.forEach(e => console.log("ERROR: " + e));
if (SAMPLES) for (const L of lengths) for (let i = 0; i < SAMPLES; i++) { const r = randomPath(L); console.log(`\n--- sample ${L} ${i + 1}: ${JSON.stringify(r.picks)}\n${r.text}`); }
console.log(errors.length ? `FAIL (${errors.length} errors, ${warns.length} warnings)` : (warns.length ? `OK with ${warns.length} warnings` : "OK"));
process.exit(errors.length ? 1 : 0);
