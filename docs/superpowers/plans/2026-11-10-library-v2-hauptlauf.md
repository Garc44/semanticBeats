# Library v2 und zweiter Hauptlauf – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Pattern-Library so erweitern, dass jede Techno-Unterart und jedes Charakter-Tag in Drums, Bass und Melodie abgedeckt ist, und den Hauptlauf für S2–S6 damit wiederholen.

**Architecture:** Neue Patterns liegen in eigenen Dateien je Spur und werden in `soundLibrary` eingehängt; das Abdeckungsziel steht vorab in `eval/config.js` und wird per Test erzwungen. Die Auswertung bekommt vor dem Lauf eine Treue-Messung, die nicht vom Code-Lexikon abhängt (Vergleich mit fremdem Prompt). S0/S1 hängen nicht an der Library und werden aus Lauf 1 übernommen.

**Tech Stack:** Node 22, Vitest, Strudel headless (`eval/strudelHeadless.js`), Ollama `qwen2.5:7b`.

**Spec:** `docs/superpowers/specs/2026-10-12-creative-harness-stage-model-design.md` (Revision 2). Abweichung: nur die Library ändert sich. Begründung und Befunde aus Lauf 1: Abschnitt „Ausgangslage“ unten.

## Ausgangslage (Befunde Lauf 1, musicAgent `b3525f1`)

- Treue in S3–S5 ist flach. Gegenprobe: F1 (Code-Lexikon) gegen Erwartung eines fremden Prompts ist gleich hoch (S3 0,164 vs. 0,163). Das Lexikon unterscheidet die Läufe kaum (14 Tag-Mengen bei 125 ID-Kombinationen).
- Über Pattern-IDs folgt S3 dem Prompt (0,226 vs. 0,152), aber: LLM-Auswahl = immer Platz 1 des Rankings (0,227). Bestmögliche Auswahl aus Top-8: 0,38. Aus ganzer Library: 0,45.
- Library-Abdeckung: `detroit`, `peak-time`, `metallic` in keiner Spur; `warm` nur bei Drums; Drums tragen nur Kicks, `hats`/`clap`/`percussion` sind in S3–S5 unerreichbar (Spuren sind `drums, bass, melody`).
- Mini-Test (Scratchpad, nicht im Repo): Intent mit festem Vokabular hebt Intent-Recall 0,39 → 0,68, Ende-zu-Ende nur 0,226 → 0,249. Der Engpass ist die Library. **Der Intent wird in Lauf 2 nicht geändert** (eine Variable pro Lauf).

## Global Constraints

- Unverändert gegenüber Lauf 1: Modell `qwen2.5:7b`, `temperature` 0.7, `numPredict` 1024, `reps` 10, `seedBase` 1000, `contentCycles` 4, Korpus-Hash `5b11449856bb6684a4caf42c960ef90834dfcd258f38ddc4a5ccdec7c26185f6`, `THRESHOLDS`, `BOOTSTRAP`, Code-Lexikon, Harmonie-Metrik, alle Stufen-Prompts.
- Geändert wird nur: `soundLibrary.drums`, `.bass`, `.melody` (neue Patterns) und `LIBRARY_TAG_MAP` (Identitäts-Einträge). `percussion` und `transitions` bleiben unverändert.
- Bekannte Folgewirkung, in der Arbeit benennen: Das `moods`-Enum im Intent-Schema kommt aus `moodVocabulary()` (alle Library-Tags), der Knowledge-Graph aus den Patterns. Beide wachsen mit der Library mit. Das ist Teil der Variable „Library“, kein zweiter Eingriff.
- **Patterns werden ohne Blick in den Korpus geschrieben.** Wer Patterns schreibt (Mensch oder Agent), liest `eval/corpus/` und `eval/results/` nicht. Ein Agent bekommt nur Vokabular, Abdeckungslücken und den Skill `strudel-sound-patterns`.
- Abdeckungsziel (vorab festgelegt, Task 1): je Spur und Unterart ≥ 4 Patterns; je Spur und Charakter-Tag ≥ 2 Patterns, außer den Ausnahmen in `LIBRARY_COVERAGE.exempt`.
- Lauf 1 bleibt im Repo und in der Arbeit (DSR-Iteration). Nichts löschen.
- Vor Task 2: Betreuer informiert (Mail oder Termin), Antwort im Protokoll.

## Review Focus

1. Neues Pattern nutzt einen Sound, den das Sample-Setup nicht kennt → jeder Lauf damit `unknown_sound`. Erwartet: Test in Task 1 lässt jedes Pattern headless laufen, `errorClass === null`.
2. Pattern mit eigenem `stack(...)` plus LLM-Mods `.slow(2)` / `.fast(2)` aus `compileTrack` → muss weiter ausführen. Erwartet: Test in Task 1 kompiliert jedes Pattern mit `speed: 2` und `slowdown: 2` und prüft Validität.
3. Library-Tag ohne Eintrag in `LIBRARY_TAG_MAP` → Pattern trägt still keine Eval-Tags, Abdeckung wirkt erfüllt, Ranking findet es nie. Erwartet: Test in Task 1, jeder Library-Tag ist Schlüssel in `LIBRARY_TAG_MAP`.
4. Gleiche ID in zwei Spuren → `patternById` liefert die falsche, ID-Tags falsch. Erwartet: Test in Task 1, IDs über alle Spuren eindeutig.
5. Auswertung über zwei Dateien mit überlappenden Läufen (z. B. S2 aus Lauf 1 und Lauf 2) → doppelt gezählt. Erwartet: Test in Task 2, `loadRuns` wirft bei doppeltem `runKey`.

---

### Task 1: Abdeckungsziel und Library-Prüfungen

**Files:**
- Modify: `eval/config.js` (neues Export `LIBRARY_COVERAGE`)
- Create: `eval/library/coverage.js`
- Modify: `eval/vocabulary.js` (Identitäts-Einträge in `LIBRARY_TAG_MAP` für alle `ALL_TAGS`)
- Test: `tests/eval/libraryCoverage.test.js`, `tests/eval/libraryPatterns.test.js`

**Interfaces:**
- Produces: `LIBRARY_COVERAGE = { pillars: ['drums','bass','melody'], minPerSubgenre: 4, minPerCharacter: 2, exempt: { drums: ['dissonant'], bass: [], melody: [] } }`
- Produces: `libraryCoverage(library) -> { [pillar]: { [tag]: number } }` (zählt `normalizeLibraryTags(p.tags)`)
- Produces: `coverageGaps(library, target = LIBRARY_COVERAGE) -> Array<{ pillar, tag, have, need }>`

- [ ] **Step 1: Ziel festschreiben.** `LIBRARY_COVERAGE` in `eval/config.js` mit den Werten oben, Kommentar: „Set before writing patterns (2026-11-10), not fitted.“ Ausnahmen mit dem Autor abstimmen; nur musikalisch sinnlose Paare (z. B. Drums × `dissonant`).
- [ ] **Step 2: Failing tests schreiben** in `tests/eval/libraryCoverage.test.js`:
  - `libraryCoverage` auf Mini-Library `{ drums: [{ tags: ['kick','dub'] }], bass: [], melody: [] }` → `drums.dub === 1`.
  - `coverageGaps` auf derselben Mini-Library enthält `{ pillar: 'drums', tag: 'dub', have: 1, need: 4 }` und kein Paar aus `exempt`.
  - `LIBRARY_TAG_MAP[t]` enthält `t` für jedes `t` in `ALL_TAGS`.
- [ ] **Step 3: Failing tests schreiben** in `tests/eval/libraryPatterns.test.js` (über alle Patterns in `drums`, `bass`, `melody`):
  - jeder Tag ist Schlüssel in `LIBRARY_TAG_MAP` (Review Focus 3);
  - IDs über alle fünf Spuren eindeutig (Review Focus 4);
  - `checkValidity(compileTrack({ selectedId: id, modifications: { speed: 2, slowdown: 2 } }, pillar, pillarObj), { cycles: 4 })` ergibt `errorClass: null` (Review Focus 1, 2). `closeValidityWorker()` in `afterAll`.
- [ ] **Step 4: Run** `npx vitest run tests/eval/libraryCoverage.test.js tests/eval/libraryPatterns.test.js` → FAIL (Funktionen fehlen, Identitäts-Einträge fehlen).
- [ ] **Step 5: Implementieren:** `eval/library/coverage.js`; in `LIBRARY_TAG_MAP` für jeden Tag aus `ALL_TAGS` `'<tag>': ['<tag>']` ergänzen (bestehende Einträge wie `'dark'` bleiben). Bestehende Library-Tags, die der Test als fehlend meldet, mit dem Autor zuordnen.
- [ ] **Step 6: Run** dieselben Tests → PASS. `npm test` → alles grün.
- [ ] **Step 7: Lücken drucken:** `node --import ./eval/node-hooks/register.mjs -e "import('./eval/library/coverage.js').then(async m=>{const {soundLibrary}=await import('./src/library/soundLibrary.js');console.table(m.coverageGaps(soundLibrary))})"` → Liste in den Commit-Text.
- [ ] **Step 8: Commit** `feat(eval): pre-registered library coverage target and pattern checks`

### Task 2: Auswertung erweitern (vor dem Lauf)

**Files:**
- Modify: `eval/analysis.js`, `eval/analyze.mjs`
- Create: `eval/library/ceiling.mjs`
- Test: `tests/eval/analysis.test.js`

**Interfaces:**
- Produces: `loadRuns(paths: string[], { stagesByPath?: Record<string,string[]> }) -> record[]`, wirft `Error('duplicate run S2|d01|0')` bei doppeltem `runKey`.
- Produces: im Summary je Stufe `liftF1` und `liftF1Code`: `{ estimate, lower, upper }` = Median über Prompts von (F1 eigener Prompt − F1 fremder Prompt).
- Produces: je Stufe `pooled: { validity, fallbackRate }` (Anteil über alle Läufe).

- [ ] **Step 1: Failing tests** in `tests/eval/analysis.test.js`:
  - Stufe, deren Tags nicht vom Prompt abhängen (alle Läufe gleiche Tags), → `liftF1Code.estimate === 0`.
  - Stufe, die genau die erwarteten Tags liefert, → `liftF1Code.estimate > 0`.
  - 4 Prompts, Fallbacks in 1 von 40 Läufen → `pooled.fallbackRate === 0.025`, Median-Wert bleibt 0.
  - `loadRuns` mit zwei Dateien, die beide `S2|d01|0` enthalten → wirft `/duplicate run S2\|d01\|0/`.
- [ ] **Step 2: Run** `npx vitest run tests/eval/analysis.test.js` → FAIL.
- [ ] **Step 3: Implementieren.** Fremder Prompt deterministisch: Ableitung (Derangement) der Prompt-IDs mit `mulberry32(BOOTSTRAP.seed)`, Prompts ohne Erwartung ausgeschlossen; je Lauf `prf1(expected[fremd], tags)`; je Prompt Mittel, dann `bootstrapCI` wie bei `f1`. `toMarkdown`: neue Tabelle „Treue über Zufall“ (Stage | liftF1 | liftF1Code) und Spalten „gepoolt“ für Validity und Fallback. `analyze.mjs`: mehrere Pfade, optional `--take S0,S1@<pfad>`; Ausgabe-Stem vom ersten Pfad.
- [ ] **Step 4: `eval/library/ceiling.mjs`:** bestmögliche ID-F1 je Prompt aus der ganzen Library (alle Kombinationen drums × bass × melody, `tagsForPatternIds`), Mittel über Prompts mit Erwartung. Kein Test (Diagnose-Skript); Ausgabe für alte Library muss 0,453 sein (Lauf-1-Befund).
- [ ] **Step 5: Run** Tests → PASS; `npm run eval:analyze -- eval/results/full-2026-11-08.jsonl` → Tabelle zeigt Lift S3 Lexikon ≈ 0, IDs > 0. Ergebnisdateien von Lauf 1 neu committen (gleicher Lauf, erweiterte Auswertung).
- [ ] **Step 6: Commit** `feat(eval): fidelity lift over shuffled prompts, pooled rates, multi-file analysis`

### Task 3: Library-Gerüst und Hörseite

**Files:**
- Create: `src/library/techno/drums.js`, `bass.js`, `melody.js` (je `export const TECHNO_<PILLAR> = []`)
- Modify: `src/library/soundLibrary.js` (`drums: [...bestehend, ...TECHNO_DRUMS]`, analog bass/melody)
- Create: `eval/library/listeningPage.mjs`

**Interfaces:**
- Produces: Pattern-Format wie bestehend `{ id, name, tags, code, initialTransforms }`. Konventionen für neue Patterns: Tags aus `EVAL_VOCAB` plus `'techno'`; ID-Präfix `drums_`, `bass_`, `melody_`; Drum-Patterns sind ganze Kits (Kick plus Hats/Clap/Percussion als `stack`) und tragen die passenden Element-Tags; Tonart frei wie bisher (Spec §2.2, Harmonie wird bewusst nicht bereinigt).
- Produces: `node eval/library/listeningPage.mjs [--only new] > <scratchpad>/library.html` – je Pattern Name, Tags, Link `https://strudel.cc/#` + `code2hash('setcpm(130/4)\n' + compileTrack(...))` (`code2hash` aus `@strudel/core`).

- [ ] **Step 1:** Dateien anlegen, einhängen. `npm test` → grün (leere Arrays ändern nichts).
- [ ] **Step 2:** `listeningPage.mjs` schreiben; Seite für die alte Library erzeugen und einen Link im Browser prüfen (spielt ab).
- [ ] **Step 3: Commit** `feat(library): techno v2 scaffolding and listening page`

### Task 4–6: Patterns schreiben (je eine Task pro Spur: Drums, Bass, Melodie)

**Files:** `src/library/techno/<pillar>.js`

**Interfaces:**
- Consumes: `coverageGaps` (Task 1), Konventionen und Hörseite (Task 3).

Je Spur gleicher Ablauf:

- [ ] **Step 1:** Lücken der Spur drucken (Task 1, Step 7). Daraus eine Liste „Pattern-Ideen“: jedes Pattern deckt eine Unterart und 1–3 Charakter-Tags ab. Richtwert: ≈ 25–30 neue Patterns je Spur.
- [ ] **Step 2:** Patterns schreiben mit Skill `strudel-sound-patterns`, in Blöcken à ≈ 8. **Ohne Zugriff auf `eval/corpus/` und `eval/results/`** (bei Agenten: frische Session, Anweisung im Prompt).
- [ ] **Step 3:** `npx vitest run tests/eval/libraryPatterns.test.js` → PASS.
- [ ] **Step 4:** Hörseite `--only new` erzeugen; Autor hört jedes neue Pattern. Kriterium je Pattern: klingt nach Techno, Tags hörbar. Durchgefallene Patterns überarbeiten oder streichen.
- [ ] **Step 5: Commit** `feat(library): techno v2 <pillar> patterns (n=…)`

Nach Task 6: `coverageGaps(soundLibrary)` muss `[]` sein. Test ergänzen in `tests/eval/libraryCoverage.test.js`: „real library meets LIBRARY_COVERAGE“ → `expect(coverageGaps(soundLibrary)).toEqual([])`. Commit.

### Task 7: Blind-Tagging durch zweite Person

**Files:**
- Create: `eval/library/exportTagSheet.mjs`, `eval/library/tagAgreement.mjs`
- Create: `eval/library/tags-B.json` (zweite Person), `eval/library/tags-consensus.json`

**Interfaces:**
- Consumes: `cohensKappa(a, b, ids, vocab)`, `meanJaccard(a, b, ids)` aus `eval/corpus/agreement.js`.
- Produces: `exportTagSheet.mjs` → HTML mit allen neuen Patterns (Name ausgeblendet, nur Hör-Link) und Ankreuzfeldern für `EVAL_VOCAB.subgenre` und `.character`; Export als JSON `{ [id]: string[] }`.

- [ ] **Step 1:** Sheet erzeugen, an die zweite Person geben (gleiche Person wie Korpus-Annotation B, falls möglich).
- [ ] **Step 2:** `tagAgreement.mjs` gegen Autor-Tags (aus der Library, normalisiert) → κ und Jaccard ausgeben.
- [ ] **Step 3:** Abgleich mit dem Autor; Konsens in `tags-consensus.json`; Library-Tags danach setzen. `coverageGaps` muss weiter `[]` sein, sonst Pattern nachliefern (zurück zu Task 4–6).
- [ ] **Step 4: Commit** `feat(library): consensus tags for v2 patterns (κ=…)`

### Task 8: Einfrieren und Smoke-Lauf

**Files:**
- Create: `eval/library/freeze.mjs`, `eval/library/FROZEN.sha256`
- Modify: `eval/runner/core.js` (`collectMeta` schreibt `libraryHash`)
- Test: `tests/eval/runner.test.js`

- [ ] **Step 1: Failing test:** `collectMeta(...)` enthält `libraryHash` als 64-stelliges Hex.
- [ ] **Step 2:** `libraryHash()` = SHA-256 über `JSON.stringify` von `drums`, `bass`, `melody`; `freeze.mjs` schreibt ihn nach `FROZEN.sha256`. Test → PASS.
- [ ] **Step 3:** Prüfen, dass S0/S1 unverändert sind: `git diff af44fd0 -- eval/stages/s0.js eval/stages/s1.js src/library/strudelDocs.js eval/config.js` zeigt nur `LIBRARY_COVERAGE`. Erwartet: keine Änderung an Prompts oder Konstanten.
- [ ] **Step 4:** Smoke: `npm run eval -- --stages S2,S3,S4,S5,S6 --prompts d01,u01 --reps 1 --out eval/results/smoke-lib2.jsonl` → 10 Läufe, 0 Abstürze, S3–S6 gültig.
- [ ] **Step 5:** `npm test` grün. Library einfrieren. **Commit** `eval: freeze library v2` — dieser Commit ist der Codestand von Lauf 2.

### Task 9: Hauptlauf 2 und Auswertung

- [ ] **Step 1:** Lauf (≈ 2000 Läufe, ≈ 10–11 h, Mac am Netz):
  `caffeinate -is npm run eval -- --stages S2,S3,S4,S5,S6 --out eval/results/full-lib2-JJJJ-MM-TT.jsonl`
- [ ] **Step 2:** Abstürze prüfen (`*.errors.jsonl`); ggf. gleichen Befehl erneut.
- [ ] **Step 3:** Auswertung mit S0/S1 aus Lauf 1:
  `npm run eval:analyze -- eval/results/full-lib2-JJJJ-MM-TT.jsonl --take S0,S1@eval/results/full-2026-11-08.jsonl`
- [ ] **Step 4:** `node eval/library/ceiling.mjs` für Library v2 (Obergrenze neben 0,453 alt).
- [ ] **Step 5: Commit** `eval: full run library v2 (2000 runs, reps 10)` mit Codestand im Text. Push nach Rückfrage.
- [ ] **Step 6:** Protokoll `notizen/brainstorming/JJJJ-MM-TT_hauptlauf-library-v2.md`: Lauf 1 vs. Lauf 2 (Treue-Lift, Gültigkeit, Harmonie, Vielfalt, Latenz), κ des Blind-Taggings, Obergrenzen.

## Zeitplan (Abgabe 01.01.2027)

| Bis | Schritt |
|---|---|
| 12.11. | Betreuer informiert; Task 1–3 |
| 20.11. | Task 4–6 (Patterns), harte Grenze |
| 24.11. | Task 7 (Blind-Tagging, abhängig von zweiter Person) |
| 25.11. | Task 8, Lauf über Nacht |
| 27.11. | Auswertung, Protokoll |

Rückfallebene: Ist die Library am 20.11. nicht fertig, wird Lauf 2 gestrichen. Lauf 1 plus Mini-Test plus Abdeckungszählung tragen die Diskussion; Library v2 geht in Ausblick und App.
