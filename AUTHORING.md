# Writing Room – Pack Authoring Guide (read completely before writing a pack)

Writing Room is a projector tool for English lessons in Austrian schools (AHS). The whole class builds ONE model text together, decision by decision. At every step the board shows 2–4 options (A–D). Students vote with printed A/B/C/D cards, the teacher clicks the winner, and the winning block is added to the text. Some options are deliberate traps; when the class picks one, the "editor" rejects it with a short explanation and the class votes again.

Two lesson modes exist (a pack can support one or both):
- **full** ("Full text together"): after every decision ALL students copy the winning block into their exercise books. At the end every student has the same, flawless model text.
- **frame** ("Frame + own writing"): after every decision students copy only the scaffold phrases of the winning block (marked `{{...}}`) and complete the paragraph in their own words, guided by a short writing prompt (`own`). Then the teacher reveals the model block and students compare.

Packs are JSON files. The engine renders them; you write the content. Every valid path through a pack must produce a coherent, correct, level-appropriate text. A validator (`node tools/validate.js <pack.json>`) checks all paths. A pack is only finished when the validator prints `OK` with no errors. Fix every warning unless you have a strong reason (then document the reason in the pack’s notes; never mention the validator, the build or the engine in `teacher` fields: they are public, and the validator rejects such remarks).

## 0. Version 2 principles (binding, override anything below)

- Writing Room Version 2 is PUBLIC (author Bernhard Gmeiner, licence CC BY-NC-SA 4.0) and used by any Austrian AHS teacher, grades (Schulstufen) 5–12.
- **Curriculum, not textbook.** A pack hangs on `grade`, `level`, `theme` and `textType`. NEVER mention, imitate or allude to a textbook: no textbook names, units, pages, characters, invented textbook places/schools/blogs/brands, no task situations, charts, survey designs, model texts or text structures recognisably taken from a textbook page, no textbook headings as titles. Topics themselves are free.
- **Do not start from a page.** Start from the curriculum row (grade, text type, theme, focus), invent the situation, the people and the data yourself, and write the model text from your own head. Do not paste, scan, photograph or summarise textbook pages into a prompt or a chat. If a situation, chart or three-point task pattern comes to your mind from a book you know, change it until you cannot say where it came from. Check: could the publisher of a book point at your pack and say ‘that is our unit’? If yes, rewrite.
- No class names (such as 1a or 3b), no hints to a particular real school, district or teacher. Fields `book`, `unit`, `classes` are forbidden.
- Optional: the validator also reads a local list of terms to avoid (`private/banlist.txt`, not included) if it exists. Never copy from any textbook.
- Personas and settings: diverse (genders, family forms, names from different backgrounds, settings in Austria and abroad), invented families/people/places; nobody real except well-known public facts. Pen friends and correspondents are not always girls; not everything happens in Vienna.
- Sensitive topics (stress, conflicts, disasters, identity): no clinical terms, no individual suffering, no casualties, never ask students in frame mode to write about their own private experience; teacher notes announce the topic and name support (Schulpsychologie, Rat auf Draht 147) where relevant.

## 1. Audience and quality bar

- Students: Austrian AHS, grades 5–12 (1st to 8th form, 10 to 18 years old). Level per grade: 5 A1, 6 A1+/A2, 7 A2, 8 A2+, 9 A2+/B1, 10 B1, 11 B1+/B2, 12 B2 (Matura).
- The model text is copied into exercise books and used as a template for tests. It must be **error-free**, natural, idiomatic **British English**, and exactly at the level of the grade (stretch slightly, never overload).
- Grades 11–12 follow the Austrian SRDP writing standard (B2): purpose and text-type conventions, all three content points fully developed with relevant examples, clear paragraphs with topic sentences, a good range of cohesive devices, register appropriate to the text type, a range of structures. Grades 9–10 follow the same logic one step simpler (B1).
- Grade 5 (A1): very short simple sentences in the present (present simple, have got, can, there is/are, imperatives), high-frequency words, concrete and fun; 3 options per step are fine; 2–3 traps; the German help line matters. Grades 6–8: present and past tenses as the grade allows, simple linkers, lots of concrete detail.
- Content must be realistic, factually correct (no invented statistics presented as real; invented numbers belong to an invented local survey stated in the task), and age-appropriate. No real living persons quoted (except well-known public facts). No brand promotion. Avoid sensitive personal topics (self-harm, sexuality, abuse, crime, drugs).

## 2. Style rules (strict)

- No em dashes (—) anywhere. Use an en dash with spaces ( – ) sparingly or restructure. No `--`.
- British spelling (organise, colour, centre, programme, travelled, practise as verb).
- Typographic quotes in English text: “…” and ’ for apostrophes. Straight quotes `"` must not appear inside text values.
- Avoid AI-sounding clichés and these words entirely: delve, tapestry, realm, landscape (metaphorical), game-changer, cutting-edge, seamless, multifaceted, pivotal, leverage, foster, harness, streamline, robust, nuanced, "in today's rapidly evolving", "it's important to note", "it's worth noting", "navigate the complexities", "embark on a journey", "a testament to". Also avoid: significant, increasingly, consequences, comprehensive, methodology (use simpler words: important, more and more, effects/results, full…).
- "not only … but also" at most once per pack. Avoid automatic groups of three adjectives.
- Vary sentence openers. Do not start two paragraphs of the same path with the same word.
- German texts (fields ending in `De`, `teacher`): always gender with colon (Schüler:innen, Lehrer:innen, Leser:innen); never generic masculine plural. Address students with "ihr/euch". Short and concrete.

## 3. Pack structure (JSON)

```json
{
  "id": "b2-article-identity",              // unique, lowercase, a-z0-9 and -
  "title": "Who am I online?",              // short catchy pack title (English)
  "titleDe": "Identität online",            // short German label
  "grade": 11,                              // Schulstufe 5–12
  "level": "B1+/B2",                        // fixed per grade: 5 A1, 6 A1+/A2, 7 A2, 8 A2+, 9 A2+/B1, 10 B1, 11 B1+/B2, 12 B2
  "theme": "Ich & meine Welt",              // one of the 13 Themenbereiche (see validator THEMES)
  "textType": "article",                    // see §6
  "modes": ["full", "frame"],               // grades 5–8: ["full"]; grades 9–12: ["full", "frame"]
  "lengths": {                              // one or two of short/long, fixed per grade and (grades 11–12) per text type, see §7
    "short": { "label": "around 250 words", "min": 225, "max": 275 },
    "long":  { "label": "around 400 words", "min": 360, "max": 440 }
  },
  "minutes": { "full": { "short": 50, "long": 90 }, "frame": { "short": 50, "long": 90 } },
  "task": {
    "situation": "Your school magazine is running a series called ‘Growing up today’. The editor has asked students to write articles about …",
    "instruction": "Write an article in which you:",
    "points": ["describe …", "explain …", "suggest …"],
    "words": { "short": "Write around 250 words.", "long": "Write around 400 words." },
    "de": "Ein Artikel für die Schülerzeitung über … Drei Inhaltspunkte, alle müssen vorkommen."
  },
  "meta": { },                              // layout header, see §6 (e-mail and letter to the editor: To, From, Date, Subject)
  "focus": { "label": "linking words", "labelDe": "Linking words", "min": { "short": 5, "long": 8 }, "note": "Marked: linking words and phrases beyond ‘and’ and ‘but’." },
  "topicWords": ["social", "media"],        // optional: topic words the repetition check ignores
  "gaps": [ ],                              // see §5
  "steps": [ ],                             // see §4
  "order": ["title", "intro", "p1", "p2", "p3", "concl"],   // order of slots in the finished text
  "checks": [ { "en": "Title that catches the reader’s attention" }, { "en": "All three content points covered" } ],
  "teacher": {
    "aim": "German: Ziel der Einheit in 1–2 Sätzen",
    "prep": "German: was vorbereiten (Karten, Heft)",
    "heft": "German: wie das Heft angelegt wird",
    "flow": "German: Ablauf mit Minuten für beide Modi und Längen",
    "traps": "German: kurze Übersicht der Fallen und warum",
    "notes": "German: Tipps, Differenzierung, Hausübung"
  }
}
```

## 4. Steps

Each step is one decision. The engine shows `q` (English question, big), `de` (German hint, small), the previous paragraph for context, and the options.

```json
{
  "id": "intro",                 // unique within the pack
  "slot": "intro",               // slot name used in `order`; omit for a pure branching step (no text)
  "part": "Introduction",        // label shown on board and in the margin (English); grades 9–12: fixed labels, see §15
  "q": "How do we open the article?",
  "de": "Vergleicht die Einstiege: Welcher macht neugierig und führt zum Thema?",
  "own": "Write 2–3 sentences of your own that lead to the topic. Use the phrases you copied.",   // frame mode: what students write themselves (English)
  "ownDe": "Schreibt den Absatz mit eigenen Sätzen fertig.",
  "options": [
    { "l": "A", "id": "question", "label": "Start with a question", "text": "…", "why": "A rhetorical question makes readers think about their own experience." },
    { "l": "B", "id": "trap", "label": "Start with a definition", "text": "…", "trap": true, "crit": "TA",
      "reject": "An article is not a dictionary. A definition is a weak hook – readers stop reading.",
      "rejectDe": "Eine Definition ist ein schwacher Einstieg. Ein Artikel soll Leser:innen packen." },
    { "l": "C", "id": "story", "label": "Start with a scene", "text": "…", "why": "…" }
  ]
}
```

Rules:
- 2–4 options per step, letters A, B, C, D in order. At most ONE trap per step. Not every step needs a trap: traps per grade see §14 (spread them, put the trap on different letters, never always on the same letter).
- Valid options must be genuinely different choices (structure, content, angle, register, style), each one correct and usable. The class should have something to discuss. Never make a valid option clearly worse; differences must be defensible ("why").
- Traps teach one specific, typical mistake. Link each trap to a criterion with `crit`:
  - Grades 9–12 (criteria mapping of the Matura writing guide, §11): `TA` (task achievement: ignores a content point, off topic, text type conventions: layout, header, form of greeting/sign-off, missing elements such as headings, wrong text type, word count), `CC` (no topic sentence, missing/misused linking words, illogical order), `LSR` (wrong register or tone: too chatty, too formal, slang, contractions in formal texts, emotional language; repetitive, very basic vocabulary/structures; copying from the task), `LSA` (grammar, spelling, wrong form of a linker, typical Austrian errors: tense, prepositions, false friends, word order). LSA traps must contain 2–3 typical errors, not more, and the reject text names them.
  - Grades 5–8: `crit` may be `TA`, `CC`, `LSA` too, but `reject` must be very simple English plus a clear German `rejectDe`.
  - A trap must look tempting (similar length, plausible), not absurd. Never insult anyone in a trap.
- `why` (valid options): one short English sentence (max ~20 words) on why this works. `reject` (traps): 1–2 short English sentences. `rejectDe`: German, 1 sentence.
- Branching: a step without `slot` is a pure choice (e.g. "angle": which position/story). Later texts can depend on it (see `by` below). Use at most 2 branching keys per pack. The first step of a pack is often the choice of angle/story/position.
- **One decision = one whole paragraph** (all grades, §15): every option of a paragraph step is a complete paragraph; the class never decides in the middle of a paragraph.
- Steps (decisions): grade 5: 5–6; grades 6–8: 6–8; grades 9–12: one per paragraph (five) plus title, subject, greeting, sign-off and branching steps (6–10); the long version has the same steps.

### Text values and dependencies

`text` is either a string or a map that depends on an earlier pick:

```json
"text": { "by": "angle", "map": { "pro": "…", "con": "…" } }
```

In a pack with a short and a long version, an option of a paragraph step can also have `textLong`: the whole paragraph in its long form (§15).

`by` must be the id of an earlier step; `map` must contain every option id of that step except traps. Keep maps small; prefer texts that work for every earlier choice. A text can include `\n` for a line break inside a block. In reports, a block may start with a section heading line: `### Heading text\n` followed by the paragraph.

### Markers inside text

- `[[…]]` = focus language (the pack's `focus.label`: e.g. linking words, passive forms, past simple verbs, formal phrases). Shown green when the teacher switches the focus view on. Mark them consistently: every instance of the focus feature in valid texts is marked, nothing else is. Never inside traps.
- `{{…}}` = scaffold phrase for frame mode: the reusable frame (openers, topic-sentence starters, linkers, key collocations, sign-offs) that students copy before completing the block themselves. 20–50 % of the words of each valid text should be inside `{{…}}`, and each valid text must END with words outside the scaffold or contain at least one non-scaffold stretch of 6+ words (room for the student's own content). Not in traps. Only needed when `modes` contains "frame" (grades 5–8: no scaffold markers).
- Nesting: `[[…]]` may sit INSIDE `{{…}}` (e.g. `{{[[However,]] many people believe that}}`), never the other way round, never crossing.
- Gaps: `{NAME}` style placeholders (uppercase letters, digits, underscore) declared in `gaps`.

## 5. Gaps (class shouts, teacher types)

1–3 per pack (grades 5–8 may have 1–2). They make the text the class's own (a name, an age, a number, a place, a pet's name).

```json
{ "id": "NAME", "step": "quote", "q": "Who is our witness? First name and family name.", "qDe": "Gebt der Person einen Vor- und Nachnamen.",
  "type": "text", "default": "Lisa Berger", "max": 40 }
{ "id": "AGE", "step": "quote", "q": "How old is she?", "qDe": "Wie alt ist die Person?", "type": "number", "default": 41, "min": 18, "max": 90 }
```

- `step`: the gap is asked right after the class has chosen an option in that step (only if the chosen text contains the gap). Every text that uses a gap must come in that step or later.
- Texts must read correctly with ANY plausible value (avoid gendered pronouns referring to a name the class chooses unless you ask for the pronoun too; prefer constructions without he/she, or ask "Is it a girl or a boy?" via a separate branching step instead).

## 6. Text types and layout (`textType`, `meta`)

The final screen renders the text in the right layout; copy screens show the margin labels and tell students where to write.

- `article`: title + paragraphs. `meta.publication` optional (an invented school magazine or youth website, never a real one). Also used for a report on a school website (recount).
- `blog`: title, then “user · date, time” (the lesson day and its start time, as on matura.bernhardgmeiner.com: “22 March 2026, 19:34”), paragraphs, call to comment. `meta.user` (invented, neutral username).
- `email`: `meta.to`, `meta.from` (invented addresses; ALWAYS the reserved ending .example, e.g. students `name@classmail.example`, organisations `info@lakeside-club.example`; never a real or registrable domain such as .at, .ie, .eu, .com or the pseudo-ending .mail; the validator rejects other endings), `meta.date` optional ("{TODAY}" or a fixed date such as "3 May 2027"; without it the lesson day). The engine writes the header in the order of the Matura writing guide, in every grade and also for informal e-mails: **To, From, Date, Subject** (final screen, copy text, exercise-book preview, layout screen, copy page). Steps `subject`, `greeting`, paragraphs, `signoff` (line 1 = formula only, line 2 = name).
- `letter` (letter to the editor): it has the **same e-mail header (To, From, Date, Subject)** as an e-mail. Steps `subject` (like an e-mail; not a paragraph), `greeting` (“Dear Editor,” or “Dear Sir or Madam,”), five paragraphs, `signoff` (line 1 = “Yours faithfully,” only, line 2 = the full name). Under the name the engine adds the town, so the letter ends with formula, full name, town. The **first sentence of the Introduction names the article (its title in “…”), the publication and the date** (“I am writing in response to your article “Young people already travel enough”, which appeared in the Valley Courier on 3 May.”). Schema:

  ```json
  "meta": {
    "to": "letters@valley-courier.example",       // the newspaper's address (header "To")
    "from": "julia.berger@classmail.example",     // the sender's address (header "From")
    "date": "{TODAY}",                            // optional; without it the lesson day
    "name": "Julia Berger",                       // full name: line 2 of the sign-off, used by the where-texts
    "town": "Graz"                                // shown under the name
  }
  ```
  Older letter packs without `meta.to` (and with the name in `meta.from`) still work (no header, name and town under the sign-off); the validator warns in grades 9–12.
- `essay`: title + paragraphs (formal, no "you", no contractions, no anecdotes). Rhetorical questions only in the Introduction: a question in a body paragraph or the conclusion is a weak point, state the point instead. The title is a factual statement that names the topic and may hint at the position, never a question (a question title sounds like an article; it may appear only as a trap, `crit` TA).
- `report`: `meta.to`, `meta.from`, `meta.date` ("{TODAY}"); header To, From, Date, Subject; `subject` step; body blocks begin with `### Section heading` lines; recommendations at the end. Formal, impersonal.
- `story`: title + paragraphs. `description`: title + paragraphs.
- `postcard`: greeting, short paragraphs, sign-off; `meta.to` = address lines separated by `\n` (invented address).
- `message` (short note or chat message): `meta.to`, `meta.from`; greeting, short blocks, sign-off.
- `invitation` (invitation card): title (e.g. “You’re invited!”), greeting (conventional), short blocks, sign-off optional; `meta.to` optional (“To: …” line at the top of the card). Shown as a centred card with a double frame; exercise book: frame on a new page.
- `diary`: `meta.date` (optional, default lesson day), `meta.dear` ("Dear Diary," optional); paragraphs.
- `review` (film, café, book …): title, `meta.publication` optional, `meta.rating` (required, whole number 1–5, shown as stars under the title), `meta.byline` optional (“by …”), paragraphs; invented films/places only, no real titles, brands or actors.
- `newspaper` (news report): headline, lead, paragraphs, quote; `meta.publication`, `meta.byline`.

Slots `title` and `subject` are excluded from the word count. All other slots count.

### Greeting and sign-off (grades 9–12, binding; the validator warns)

| Greeting | Sign-off |
|---|---|
| “Dear Sir or Madam,” (name unknown) | “Yours faithfully,” |
| “Dear Mr/Ms/Dr <Family name>,” | “Yours sincerely,” |
| Letter to the editor: “Dear Editor,” or “Dear Sir or Madam,” | “Yours faithfully,”, then full name and town |
| Informal e-mail: “Hi Tom,” / “Dear Tom,” (first name) | “Best wishes,” / “Take care,” (also “Kind regards,”, “Best regards,” here only) |

- No “Kind regards”, “Best regards”, “Best wishes” in formal texts: when a formal greeting is a valid option, every valid sign-off on the same path must be its pair. A greeting that depends on a branching step (`by` map, e.g. “addressee”: name known / unknown) gets a sign-off `by` map on the same step.
- “Hello Ms Morgan,” / “Hi Mr Hill,” mixes an informal greeting with a title: never a valid option (it can be a trap, `crit` TA).
- A wrong greeting or sign-off form is a text type convention (`crit` TA); a too chatty or too stiff tone in the text is register (`crit` LSR).

### What the validator checks (text types)

- Errors: e-mail/letter addresses that do not end in `.example`; a letter with `meta.to` but without sender address in `meta.from` or without `meta.name`; lengths that do not fit grade and text type (§7).
- Warnings: e-mail without `meta.to`/`meta.from` or without a subject step; letter (grades 9–12) without the e-mail header, old schema (`meta.from` as the name), a subject step without `meta.to`; greeting/sign-off pairs (table above) and “Hello/Hi + title”; letter to the editor: an Introduction option whose first sentence does not contain a quoted title (“…”) or the word “article”/“report” together with a date expression (yesterday, last week, on Monday, 3 May …); essay: a sentence ending in “?” outside the Introduction and the title; `minutes`, `task.words` or `focus.min` entries for a length the pack does not have.
## 7. Length (fixed per grade, the validator enforces label, min and max)

| Grade | Level | Lengths |
|---|---|---|
| 5 | A1 | short: "around 60 words", 50–70 |
| 6 | A1+/A2 | short: "around 100 words", 85–115 |
| 7 | A2 | short: "around 120 words", 105–135 |
| 8 | A2+ | short: "around 150 words", 135–165 |
| 9 | A2+/B1 | short "around 200 words" 180–220; long "around 250 words" 225–275 |
| 10 | B1 | short "around 250 words" 225–275; long "around 350 words" 315–385 |
| 11–12 | B1+/B2, B2 | depends on the text type (Matura format, below) |

Grades 11–12 follow the format of the Matura writing guide (the validator enforces it, an error otherwise):

| Grades 11–12 text type | Lengths |
|---|---|
| `email`, `letter` | only short: "around 250 words", 225–275 |
| `essay` | only long: "around 400 words", 360–440 |
| all other text types (article, blog, report …) | short "around 250 words" 225–275; long "around 400 words" 360–440 |

- Keep the longest path at least 3 words below `max` (class answers to gaps can be longer). Grades 5–8: one length (key `short`); grades 9–10: short and long; grades 11–12: as in the table. Where a pack has both, the long version has the same steps; its paragraphs are longer: the options carry a long text, `textLong` (§15). It never adds a paragraph.
- A pack with one length has only that key in `lengths`, `minutes.full`/`minutes.frame`, `task.words` and `focus.min` (an essay: only `long`; a grade 11–12 e-mail or letter: only `short`). In a long-only essay each option is a whole paragraph of the long text (`text`, no `textLong`). The engine then shows one length (library “ca. 400 Wörter”, setup without a length choice).
- Decisions: grade 5: 5–6; grades 6–8: 6–8; grades 9–12: 6–10 (one per paragraph plus title, subject, greeting, sign-off, branching; the same in both lengths).
- Card length: at most 105 words per option (§15). 50 minutes per short lesson; long lessons: grade 9 about 60 (frame 70–75), grades 10–12 about 100 (one double lesson).
- Copying speed is ~10–15 words per minute (grade 5: slower, ~6–8).

## 8. Checks (final screen checklist)

5–8 items in English, phrased as statements that the class can tick (e.g. "All three content points are covered", "Every paragraph starts with a topic sentence", "Formal register: no contractions"). The engine adds word count and focus count automatically.

## 9. Teacher notes (German)

Concrete and short. `flow` names the minutes per phase for full/frame and short/long. `heft`: exactly how the page is laid out (e.g. "Datum, Textsorte als Überschrift, 2 Zeilen für den Titel frei lassen"). `traps`: list of traps with letter and criterion. `notes`: differentiation and a homework idea (e.g. second version with other choices).

## 10. Process for authors

1. Fix grade, text type, situation, theme and focus. Write the task. Decide the content points (grades 9–12: three, SRDP style operators: describe, explain, compare, evaluate, suggest, discuss …; grades 5–8: 2–4 simple bullet points).
1b. If the theme also appears in a coursebook you know, compare BEFORE writing: your task situation, cast of characters, data/chart or survey design, argument set and step order must each be your own. Passing the automatic checks (ban list, n-gram) does NOT make a paraphrased textbook page acceptable. If you use an AI assistant, tell it the same: ‘Do not model the task, data design or argument sequence on any published coursebook unit.’
2. Plan the paragraph sequence (`order`) and which choices are meaningful.
3. Write all texts. Re-read every path mentally: each combination must make sense (no contradictions, no repeated information, consistent tense and facts).
4. Run the validator, fix everything, run again until `OK`.
5. Read the printed sample paths (`--samples 5`) as a teacher would. Fix anything clumsy.

## 11. Further rules (binding)

- **Trap length:** a trap must be about as long as the valid options of its step (within ±25 % of their average word count). Students must find traps by reading, not by length.
- **Neutral labels:** option labels describe the approach, never the fault ("Start with a definition" is fine; "Keep it simple", "Use the words of the task", "Copy the task" are giveaways). Same for `de` hints: they may tell students WHAT to look at ("Achtet auf Zeitformen und Präpositionen"), but never reveal WHETHER or WHERE a trap is ("Ist eine Option fehlerhaft?" / "Hier gibt es keine Falle" are forbidden).
- **No school/class/book references on the board:** task, q, de, own, option texts, why/reject and gap questions must not mention class names, page numbers, units or any textbook. Version 2: this applies to `teacher` too (see §0). Avoid "our school" details that only fit one school.
- **Gaps:** name gaps need the German hint "Keine Namen von Mitschüler:innen oder Lehrer:innen." Gaps that are phrases, not names, set `"cap": false` (the engine only capitalises names). A gap used after its own step must appear in EVERY valid option of its step. Never use gaps in `meta`; `meta.date` may be "{TODAY}" (shows today's date).
- **Unique step parts:** every `part` label is unique within a pack (it is copied into the margin). Keep them short: Introduction, Body 1, Body 2, Conclusion, Title, Subject, Greeting, Sign-off. Grades 9–12 use the fixed paragraph labels of §15 ("Body paragraph 1" …, no "Body 2b").
- **Report data:** content that needs the task figures must still read correctly on its own; the engine now offers a Task button, but keep figures in the texts exact.
- **SRDP criteria for traps (mapping of the Matura writing guide, binding):**
  - **TA** (Task Achievement): irrelevant/off-topic content, missing content point, word count, and text type conventions: layout, header (e-mail: To, From, Date, Subject), form of greeting and sign-off (§6), missing elements such as headings, wrong text type.
  - **CC** (Coherence and Cohesion): missing topic sentence, missing or misused linkers (a linker with the wrong meaning), illogical order, no paragraphs.
  - **LSR** (Lexical and Structural Range): wrong register or tone (too chatty, too formal, slang, contractions in formal texts, emotional language), repetitive or very basic vocabulary/structures, copying from the task.
  - **LSA** (Lexical and Structural Accuracy): grammar, vocabulary and spelling errors, the wrong form of a linker (“on the other side”, “in addition to this point of view that”).
- **Commas:** no comma before "because" or "that" in model texts; British punctuation.

## 12. Further rules (binding, continued)

- **Hint lines never give traps away:** every step (with or without trap) gets a criterion line in `de` of the same kind ("Achtet auf Zeitformen und Wortwahl."). No taste questions ("Welche gefällt euch?") only on trap-free steps; title/subject steps have neither.
- **Trap family:** trap labels look like valid labels (no "A clear …", "Lots of …", "Everything …", "Very polite"); a trap is never the shortest card of its step by a clear margin; if the valid options contain a gap blank, the trap contains the same gap; vary the misused linkers between packs of the same class; a trap contains exactly the errors its `reject` names.
- **Frame mode:** every sentence-initial focus phrase sits inside `{{…}}` (the validator warns). Gaps are never glued to characters inside an own stretch (`{N}%`, `RR-{ORDER})`): put the phrase into the scaffold. `own` must match what the dotted lines ask for ("two sentences", "two examples"); it starts with "Copy the frame." / "Copy the blue words." followed by "Then …" (the compare step quotes the "Then …" part as "Check:"). Facts students need in own parts: tell the teacher in `teacher.flow` to write them on the board. Own stretches above ~50 words need an extra scaffold piece.
- **Engine-generated instructions (do not duplicate in packs):** e-mail and letter to the editor = header To, From, Date (then the Subject line, decided as a step); blog = title first, then "user · date, time"; report headings on their own line, underlined, no margin word; sign-off = "Skip one line. Write “<formula>” on its own line and the name on the next line" (line 1 of a sign-off text = formula only); title/subject in frame mode = "Copy it, or write your own". So title/subject `own` gives content guidance only; sign-off `own`: "Copy the closing formula and, on the next line, the full name we chose."
- **Gaps:** gaps that ask for a first name and a family name set `"minWords": 2`. A text gap whose longer answers could push the longest path over `max` sets `"maxWords"` (the engine rejects longer answers, the validator checks the longest path with that many words; `max` stays the character limit of the input field). Name-like defaults (capital letter, no digit) reject purely numeric answers. Verb-phrase gaps set `"verbPhrase": true` (engine removes "to", turns "my" into "their"). A gap at the start of an own stretch shows inline in frame mode; later gaps only appear in the dotted line's label.
- **Repetition across paragraphs:** no linker twice in neighbouring paragraphs (or twice in one paragraph) or three times on any path; no paragraph opener repeated; reports: at most two sections start with "The".
- **Copyright and facts:** no sentence from any textbook; invented data is presented as an example ("a simplified example"); every person is introduced in the task; e-mail domains use the reserved ending .example.
- **Focus label:** `focus.label` and `focus.labelDe` are unique inside a Schulstufe (the library shows „Schwerpunkt: labelDe“ and search finds it; the build fails on duplicates).
- **Teacher notes:** `heft` names the board heading exactly (Story, Description, Email, News report, Article, Blog post, Essay, Report, Postcard, Message, Diary, Letter, Review, Invitation), date on the right; `prep` names what to prepare (cards, exercise books) and, grades 5–8, an "Einsatz ab …" hint (which grammar the class must know); `flow` gives realistic frame times (5–6 min own writing per paragraph at B1); `minutes.frame.short` is 60 if a 50-minute frame lesson is unrealistic, and `flow` says how to fit it (last paragraph or checklist as homework). SRDP criteria in German notes: Erfüllung der Aufgabenstellung, Kohärenz und Kohäsion, Spektrum sprachlicher Mittel, Sprachrichtigkeit.
- **Keys:** 1–4 vote like A–D (finger voting); Shift+1–4 or ⤢ shows one card big.

## 13. Grade 8 rules

- grade 8, level "A2+", full mode only, one length: label "around 150 words", min 135, max 165 (paths ≤ 162 with default gaps), 50 minutes, 6–8 decisions, 3–4 traps. 
- Across all packs of one grade: each misused linker and each typical error pattern only once, trap-letter sequences all different.

## 14. Version 2 hint lines and traps per grade

- `de` lines (binding decision 1): one neutral German sentence about the step's function + the standard line: grades 5–8 „Lest jede Karte genau, bevor ihr abstimmt.“, grades 9–12 „Prüft jede Option: Aufgabe, Aufbau, Wortschatz, Grammatik.“ (title/subject/branch steps: only the sentence).
- Traps: grade 5: 2–3; grades 6–8: 3–4; grades 9–12: 4–5. Within one grade, a misused linker or a typical error pattern appears in at most one trap; trap-letter sequences differ between packs of the same grade. Grades 5–8 show German `rejectDe` on the board: keep it short and child-friendly.
- Grades 9–12: `crit` follows the mapping in §11 (register/tone → LSR, conventions such as header, greeting/sign-off form, headings → TA, copying from the task → LSR, missing topic sentence/misused linker → CC, grammar/spelling/wrong form of a linker → LSA). Typical Matura traps: “Kind regards” after “Dear Sir or Madam” (TA), “Hello Ms Morgan,” (TA), a chatty opening with contractions in a formal e-mail (LSR), a letter to the editor that does not name the article in its first sentence (TA), a rhetorical question in an essay's body paragraph (CC or LSR, depending on what the reject explains).

## 15. Oberstufe: five paragraphs and cohesion (grades 9–12, binding)

### Five paragraphs, always

- In grades 9–12 EVERY text, in every length and on every path, has exactly **five paragraphs**: Introduction, Body paragraph 1, Body paragraph 2, Body paragraph 3, Conclusion. Title, subject line, greeting and sign-off are not paragraphs. This holds for every text type: in an email or a letter the opening paragraph is the Introduction and the closing paragraph the Conclusion; in a report each of the five paragraphs starts with its `### Section heading` (headings stay inside the paragraphs, §6).
- **The long version never adds a paragraph.** It has the same decisions; its paragraphs are longer (`textLong`, below). The length targets of §7 stay as they are. Grades 11–12: an e-mail or a letter has only the short version (around 250 words), an essay only the long one (around 400 words, five paragraphs: introduction and conclusion about 55–75 words, body paragraphs about 85–105).
- The three content points of the task are spread over the three body paragraphs; the conclusion is its own paragraph (it never only repeats one body paragraph).
- **Letter to the editor:** the first sentence of the Introduction names the article (title in “…”), the publication and the date; then the writer's position. The header (To, From, Date, Subject) and the subject line are not paragraphs.
- **Essays:** rhetorical questions only in the Introduction; the body paragraphs and the conclusion state their points. The title is a statement, never a question (a question title sounds like an article).
- **Emails and letters** may place a content point that is the reason for writing (e.g. who we are and our dates in an enquiry) in the Introduction and spread another point over two body paragraphs, as long as every point is fully covered and each body paragraph has one clear topic; the `teacher` notes say where each point is.
- **Stories** may let the content points follow the plot instead: e.g. point 1 (how it starts, who and where) in the Introduction, point 3 (how it ends, what the character learns) in the Conclusion, and the body paragraphs carry the events in between. The five paragraphs and their labels stay the same; the `teacher` notes say where each point is.

### Part labels

- The `part` of the five paragraph steps is exactly `"Introduction"`, `"Body paragraph 1"`, `"Body paragraph 2"`, `"Body paragraph 3"`, `"Conclusion"`, in this order in `order`. Other steps keep their own parts (Title, Subject, Greeting, Sign-off, branching steps such as Angle or Position).
- The board shows the full label (big) above the question. In the exercise book the engine uses short margin words, the same everywhere (copy page, "Write … in the margin"): **Intro, Body 1, Body 2, Body 3, Conclusion**. When `teacher` notes name margin words, use these short forms.

### One decision per paragraph; the long version: `textLong`

Binding since 22.10.2026, for every grade and every text type: **one decision is one whole paragraph.** The class never decides in the middle of a paragraph, and the board never shows a paragraph that grows from two decisions. There are no continuation steps (`"join"`) and no long-only steps (`"len"`); the validator rejects both.

- Every option of a paragraph step is a complete paragraph: topic sentence, development, last sentence. The class compares whole paragraphs.
- **Long version:** in a pack with a short and a long version, the long version has exactly the same steps and options. An option of a paragraph step that is longer in the long version has a second text, `textLong`: the same paragraph (same approach, same idea, same label and `why`), written out longer. `textLong` is a complete, smoothly written paragraph, never the short text with an extra block glued on.
- In one step, either all options (traps too) have `textLong` or none. `textLong` has the same shape as `text` (a string, or a `{by, map}` with the same `by`). Title, subject, greeting, sign-off and branching steps never have one.
- The long version makes the text longer evenly: the body paragraphs grow by a similar amount (the introduction and conclusion may grow too). A trap keeps its error in both lengths and stays as long as the valid cards of its step (±25 %) in both lengths.
- Frame mode: a step with `textLong` needs `ownLong`/`ownLongDe`, the writing prompt for the longer paragraph (same form as `own`: “Copy the frame. Then …”). Both texts follow the scaffold rules (§4).
- Card length: at most 105 words per option in either length (three cards side by side on a 1024×768 board). Four options stand in two rows: a step with four options keeps every card at 70 words or fewer in both lengths; longer paragraphs get at most three options. A text of about 400 words: introduction and conclusion about 55–75 words, body paragraphs about 85–105.
- Gaps: a gap may appear only in the long texts of a step; if a later step uses it, every valid option of its step contains it in that length.

Example (Body paragraph 2 of an article with a short and a long version):

```json
{ "id": "p2", "slot": "p2", "part": "Body paragraph 2",
  "q": "Body paragraph 2: how does the project help the town?",
  "de": "Zweiter Inhaltspunkt: was das Projekt der Stadt bringt. Prüft jede Option: Aufgabe, Aufbau, Wortschatz, Grammatik.",
  "own": "Copy the frame. Then give one example in two sentences.",
  "ownDe": "Gerüst abschreiben, dann ein Beispiel in zwei Sätzen.",
  "ownLong": "Copy the frame. Then give two examples and say what changed for the town.",
  "ownLongDe": "Gerüst abschreiben, dann zwei Beispiele und was sich für die Stadt verändert hat.",
  "options": [
    { "l": "A", "id": "example", "label": "A concrete example", "why": "A concrete case makes the benefit easy to picture.",
      "text": "{{The town has changed since the project started.}} …",
      "textLong": "{{The town has changed since the project started.}} … (the same paragraph, longer)" },
    { "l": "B", "id": "trap", "label": "A list of benefits", "trap": true, "crit": "CC", "reject": "…", "rejectDe": "…",
      "text": "…", "textLong": "…" }
  ] }
```

### Cohesion (binding)

All options must be built so that, **whatever blocks are chosen, the finished text is coherent and cohesive**:

- Each body paragraph opens with a **topic sentence that links back** to what came before: a reference ("This problem …", "Apart from money, …"), a linker or a contrast that is true on EVERY path (never "As mentioned above, the price …" when the price may not have been mentioned).
- The **conclusion picks up the introduction and the three body paragraphs** (their points, not word for word) and rounds them off; it brings no new argument.
- **No paragraph reads as an isolated block**, and inside a paragraph every sentence follows from the one before: a long text is one paragraph, never a short paragraph with an added block.
- Where a link depends on an earlier choice (angle, position, the example chosen in the introduction), use a `by` map (§4) instead of a vague link.
- Linkers must not repeat (§12): never twice in the same or neighbouring paragraphs, never three times on any path.

### What the validator checks (grades 9–12)

Every length is checked with its own texts (`textLong` in the long version). Errors: `join` or `len` in a step; `textLong` in a pack with one length, outside paragraph steps, on only some options of a step, with another shape than `text`, or not longer than `text`; a step with `textLong` in frame mode without `ownLong`/`ownLongDe`; more than 115 words on one card; not exactly 5 paragraph steps (content steps with a slot that are not title/subject/greeting/signoff); paragraph parts other than the five labels in this order. Warnings: more than 105 words on one card; linkers repeated in one paragraph, in neighbouring paragraphs or three times on a path (besides the usual linkers also *while*, *yet*, *though*, *even if*, *then*, *also* at the start of a sentence or after a comma, *too* at the end of a sentence, *now* at the start of a sentence); **paragraph balance**: on some path a paragraph is more than 2.5 times as long as the shortest body paragraph; fewer than 4 or more than 6 traps. Grades 5–8: no five-paragraph rule, but one decision per paragraph as everywhere.
