# Kreativer Harness: Stufenmodell und Evaluationsdesign

*Stand: 12.10.2026 · Grundlage: Exposé „Vom Prompt zum Beat“ (`docs/thesis/expose.pdf`), `PROJECT_STATE.md`*
*Ersetzt das Stufenmodell S0–S4 des Exposés durch S0–S5 (Variante 1, mit dem Autor abgestimmt).*

## 1. Ziel

Ein automatischer Prüfstand misst, wie sich gestufte Steuerungsmechanismen auf ein lokal betriebenes `qwen2.5:7b` bei der Erzeugung von Strudel-Code auswirken. Gemessen werden vier Größen: syntaktische Validität, semantische Treue, Ausgabediversität und Antwortlatenz.

Die Treppe führt von „kein Kontext“ über „mehr Wissen“ zu „harter Zwang“ und von dort zu Verfeinerungen. Die Kernaussage ist eine Nutzen-Kosten-Betrachtung: Ab welcher Stufe reicht Kontext allein nicht mehr, und was kostet der Zwang an Vielfalt und Zeit?

Der Prüfstand läuft vollständig ohne Browser und ohne UI (Node, Terminal). Die bestehende Web-App bleibt **unverändert**. Sie ist der Ausgangsprototyp und kommt in der Arbeit nur als Vorarbeit vor.

## 2. Stufenmodell

Inkrementelles Stacking: Jede Stufe enthält alle vorhergehenden und ergänzt **genau einen** Mechanismus.

| Stufe | Mechanismus | Ausgabe des Modells | LLM-Calls | Tag-Quelle (F1) |
|---|---|---|---|---|
| S0 | Baseline: roher Prompt, Systemprompt nur „schreibe Strudel-Code, nur Code“ | freier Code | 1 | Code-Lexikon |
| S1 | + **Spezifikation**: erlaubte Sounds und Funktionen mit Wertebereich | freier Code | 1 | Code-Lexikon |
| S2 | + **Few-Shot**: Intent-Klassifikation → 3 ähnlichste Library-Patterns je Spur als Code-Beispiele | freier Code | 2 | Code-Lexikon |
| S3 | + **Zwang**: JSON-Auswahl von Pattern-IDs (Schema), deterministischer Compiler | JSON → Compiler | 1 + Spuren | Pattern-IDs |
| S4 | + **Musikalische Chain-of-Thought**: Pflichtfeld `reasoning` vor `selectedId` | JSON → Compiler | 1 + Spuren | Pattern-IDs |
| S5 | + **GraphRAG**: Graph-Reranking der Kandidaten + Graph-Kontext | JSON → Compiler | 1 + Spuren | Pattern-IDs |

### 2.1 Stufen im Detail

**S0 Baseline.** Systemprompt:
> You are a live-coding assistant for Strudel (strudel.cc), a JavaScript pattern language for music. Write Strudel code for the user's request. Output ONLY the Strudel code — no prose, no markdown fences, no comments.

Kein JSON-Schema. Nachbearbeitung (identisch für S0–S2): erster Code-Fence-Block, falls vorhanden, sonst der getrimmte Text.

**S1 Spezifikation** (statisch, für jeden Prompt gleich, daher kein Intent-Call). Der S0-Systemprompt wird ergänzt um:
- erlaubte Sounds: Drum-Samples, die in **beiden** Bänken existieren (`bd sd cp hh oh rim lt mt ht`), nur mit `.bank("RolandTR909")` oder `.bank("RolandTR808")`; Synths für `note()`: `sine square triangle sawtooth`
- Kernfunktionen ohne Wertebereich: `s, note, n, stack, cat, seq, bank, scale, fast, slow, gain`
- alle `METHOD_CARDS` aus `src/library/strudelDocs.js` als Zeile `name(sig): min–max — note`, z. B. `lpf(hz): 100–5000 — 200–800 dark, >1200 bright`

Begründung: formale Zielsprachspezifikation im Kontext (Text2DSL, arXiv:2606.22586). Mini-Notation-Grammatik wird bewusst nicht mitgegeben (Kontextlänge für 7B).

**S2 Few-Shot.**
1. `buildIntent(prompt)`: LLM-Klassifikation plus deterministischer Lexer. Hier beginnt der Intent-Call, weil die Beispielauswahl ihn braucht.
2. Spuren = Pillars aus `intent.layers` (Reihenfolge `PILLAR_NAMES`); keine erkannt → `drums, bass`.
3. Je Spur die 3 bestplatzierten Patterns aus `rankPatternsByIntent` als Beispiel: `[pillar] id (tags): code`.
4. Systemprompt = S1-Prompt + Beispielblock („adapt or combine; one layer per part, combined with stack(...)“).

Begründung: Beispiele schlagen bei Low-Resource-Sprachen oft reine Dokumentation, am besten ähnlichkeitsbasiert ausgewählt (arXiv:2509.19931, 2606.16827). Gegenbefund: CangjieBench (2603.14501). Die Trennung von S1 und S2 macht diese offene Frage für Strudel messbar.

**S3 Zwang** (= bestehender Prototyp).
1. `buildIntent` und Spuren wie in S2.
2. Je Spur nacheinander `generateTransformationPlan`: Katalog = Top-8 aus `rankPatternsByIntent`, JSON-Schema `{selectedId ∈ Katalog, explanation, modifications}`. Frühere Auswahlen gehen als Kohäsionskontext an spätere Spuren.
3. `compileTrack` je Spur, dann `stack(...)`. Scheitert eine Spur, entfällt sie. Scheitern alle, ist der Code `null`.

**Bewusster Kontextwechsel S2 → S3:** Ab S3 schreibt das Modell keinen Code mehr, Spezifikation und Code-Beispiele entfallen. Stattdessen sieht es die Kandidaten (id, name, tags) aus **demselben** Retrieval. Das Wissen bleibt gleich, die Ausgabeform wird erzwungen. Der Unterschied S2 → S3 misst damit den Effekt des Zwangs. In der Methodik wird das explizit so beschrieben.

**S4 Chain-of-Thought.** Wie S3, das Schema bekommt `reasoning` als erstes Pflichtfeld (Reihenfolge per Schema erzwungen). Die Regel im Prompt fordert 2–4 Sätze zu Genre-Konventionen, Tempo und Groove vor der Wahl. Bezug: Tam u. a. 2024 (Reasoning unter Formatzwang).

**S5 GraphRAG.** Wie S4, plus:
- kuratierter Graph mit den Knotentypen Genre, Tempo-Band, Pattern, Strudel-Funktion und **ausschließlich** den Kanten Genre–Tempo, Tempo–Pattern und Pattern–Funktion
- Genre-Knoten tragen Aliase (z. B. detroit: „motor city“, „underground resistance“; techno: „berghain“, „tresor“). Das ist der Einstieg für Prompts ohne Schlagworttreffer.
- Tempo-Bänder: 70–95, 118–127, 128–134, 135–150 BPM. Pattern–Tempo-Kanten werden aus den Genre-Tags der Patterns abgeleitet. Patterns ohne Genre-Tag erhalten 128–134.
- Pattern–Funktion-Kanten kommen aus den im Pattern-Code und in den `initialTransforms` verwendeten Methoden.
- Seeds: Genres, deren Aliase im Prompt vorkommen. Gibt es keine, das Intent-Genre. Explizite BPM-Angabe → genau das passende Band, sonst die Bänder der Seed-Genres.
- Ranking: Tag-Score + Anzahl verbundener Seed-Bänder, die Top-8 werden zum Katalog.
- Kontexttext im Systemprompt: Genre → Bänder, Top-5-Patterns, typische Funktionen.

## 3. Konstanten (Konstanthaltung)

| Größe | Wert |
|---|---|
| Modell | `qwen2.5:7b`, Digest wird protokolliert |
| Temperatur | 0.7, konstant über alle Stufen (> 0 für die Diversitätsachse) |
| Seed | `1000 + rep`, gleich über Stufen und Prompts einer Wiederholung (gepaartes Design) |
| `num_predict` | 1024, für alle Stufen gleich |
| Wiederholungen | 10 |
| Läufe gesamt | 6 Stufen × 40 Prompts × 10 = **2.400** |
| Reihenfolge | Wiederholung → Prompt → Stufe (Drift trifft alle Stufen gleich) |

Die App-Defaults (`temperature 0`, `seed 42`, `num_predict 200`) bleiben unverändert. Alle neuen Parameter sind optional.

## 4. Messgrößen

- **Validität:** Der Code wird headless in Node ausgewertet und über einen Takt abgefragt (`queryArc(0,1)`). Fehlerklassen gemäß Exposé: `syntax`, `unknown_function`, `unknown_sound`. Zusätzlich berichtet: `empty`, `forbidden` (AST-Sicherheitsprüfung vor jeder Auswertung), `runtime`, `no_pattern`, `silent`. Gültig heißt: keine Fehlerklasse.
- **Semantische Treue:** Precision, Recall und F1 der gelieferten gegenüber den erwarteten Tags im gemeinsamen Vokabular (10 Genre-, 13 Charakter-, 11 Element-Tags). Berechnet über alle Läufe, deren Code ausführt (gültig, `unknown_sound`, `silent`).
  - `f1`: Tag-Quelle laut Tabelle (S0–S2 Code-Lexikon, S3–S5 Pattern-IDs)
  - `f1Code`: Code-Lexikon für **alle** Stufen (einheitliche Messung, Robustheitscheck)
- **Diversität:** normalisierte Shannon-Entropie über die Tag-Mengen der gültigen Wiederholungen je Prompt. Der Anteil verschiedener Ergebnisse wird ergänzend berichtet.
- **Latenz und Aufwand:** Wall-Clock von `stage.run` (alle LLM-Calls plus Kompilierung, ohne Validierung). Median und P95. Einordnung in die Miller-Bänder ≤ 2 s und ≤ 10 s. Prompt- und Ausgabe-Tokens laut Ollama.
- **Auswertung:** Statistische Einheit sind Aggregate je Prompt (40 pro Stufe). Paarweiser Bootstrap zwischen benachbarten Stufen (10.000 Resamples, fester Seed). Substanziell heißt: Das KI schließt 0 aus **und** |Δ| ≥ vorab gesetzter Schwelle (Validität 0.05, F1 0.05, Entropie 0.05, Latenz 500 ms). Auswertung zusätzlich je Prompt-Kategorie.

## 5. Datengrundlage

40 selbst erstellte Prompts in 4 Kategorien zu je 10: `direct_hit`, `genre_no_hit` (Testfeld für S5), `structure` (≥ 2 Spuren), `underspecified`. Die erwarteten Tags werden in zwei zeitlich getrennten Durchgängen (≥ 7 Tage Abstand) annotiert, abgeglichen und vor dem ersten Messlauf per SHA-256 eingefroren. Berichtet werden Cohens κ und der mittlere Jaccard-Wert. Der Korpus wird vom Autor geschrieben, nicht generiert.

## 6. Nicht im Umfang

- UI-Änderungen. Eine optionale „Lab-Ansicht“ (Stufenvergleich für die Verteidigung) kommt frühestens nach dem Messlauf und ist nicht Teil der Arbeit.
- Validate→Repair-Schleifen. Bei 7B ist Blind-Resampling gleichwertig (arXiv:2607.26117), daher nur Ausblick.
- Grammatikgeführtes Decoding, Fine-Tuning, Modellvergleich, Nutzerstudie (laut Exposé)
- LayerSpec-Generativpipeline (Plan 2026-07-06, Tasks 7–13) bleibt eingefroren

## 7. Validitätsrisiken (für die Diskussion)

- Headless ≠ Browser: REPL-Funktionen (`$:`, `setcpm`, Visualisierungen) werden nachgebildet.
- Das Code-Lexikon leitet Genres nur grob ab (Four-on-the-Floor, Acid-Resonanz, Bitcrush). Der Recall von S0–S2 ist daher strukturell niedriger als bei ID-Tags, deshalb wird `f1Code` zusätzlich berichtet.
- Vokabular, Lexikon-Schwellen, Graph, Korpus und Relevanzschwellen sind vom Autor gesetzt. Alle werden vollständig dokumentiert.
- Der Kontextwechsel S2 → S3 ist konstruktionsbedingt (siehe 2.1).

## 8. Nötige Exposé-Anpassungen

- Stufentabelle auf 6 Stufen (S0–S5) erweitern, Few-Shot und Spezifikation als getrennte Stufen begründen
- 2.000 → 2.400 Läufe
- Statt „S1 und S2 sind bereits implementiert“: „Die Zwangsstufe S3 entspricht dem bestehenden Prototyp.“
- Intent-Klassifikation ab S2
- Mit dem Betreuer abstimmen

## 9. Nebenbefund aus der Vorbereitung

Eine headless Prüfung der 58 Library-Patterns ergab: 8 Percussion-Patterns verwenden `oh`, `rim` und `ride` ohne `.bank()`. Diese Samples sind nicht geladen, die Spuren sind in der App teilweise stumm. Die Behebung ist Teil der Implementierung.
