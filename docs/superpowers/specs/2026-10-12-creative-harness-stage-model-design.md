# Kreativer Harness: Stufenmodell und Evaluationsdesign

*Stand: 17.10.2026 (Revision 2) · Grundlage: Exposé „Vom Prompt zum Beat“ (`docs/thesis/expose.pdf`), `PROJECT_STATE.md`*
*Ersetzt das Stufenmodell S0–S4 des Exposés durch S0–S6. Revision 2 ergänzt den Techno-Fokus, die Stufe S6 „Formular + Übersetzer“ und die Messgröße Harmonie (mit dem Autor abgestimmt nach drei Wegwerf-Spikes, siehe Abschnitt 10).*

## 1. Ziel

Ein automatischer Prüfstand misst, wie sich gestufte Steuerungsmechanismen auf ein lokal betriebenes `qwen2.5:7b` bei der Erzeugung von **Techno** in Strudel auswirken. Gemessen werden fünf Größen: syntaktische Validität, semantische Treue, Ausgabediversität, harmonische Kohärenz und Antwortlatenz.

Die Treppe führt von „kein Kontext“ über „mehr Wissen“ zu „harter Zwang“ und endet bei einer strukturierten Zwischenrepräsentation, die freie Erfindung und garantierte Gültigkeit verbindet. Kernaussage ist eine Nutzen-Kosten-Betrachtung: Was bringt jede Stufe an Gültigkeit, Treue und Harmonie, und was kostet sie an Vielfalt und Zeit?

**Genre-Fokus Techno.** Die Arbeit ist eine Fallstudie auf ein Genre. Begründung: Die Bibliothek des Prototyps ist auf Techno ausgerichtet; ein Spike über acht Genres zeigte, dass das 7B-Modell Genres unzuverlässig trifft, was die Treue-Messung verrauscht; innerhalb eines Genres sind feinere Unterschiede (Unterart, Charakter) messbar.

Der Prüfstand läuft vollständig ohne Browser und ohne UI (Node, Terminal). Die bestehende Web-App bleibt **unverändert**. Sie ist der Ausgangsprototyp und kommt in der Arbeit nur als Vorarbeit vor.

## 2. Stufenmodell

Inkrementelles Stacking: Jede Stufe enthält alle vorhergehenden und ergänzt **genau einen** Mechanismus. An zwei Stellen wechselt bewusst die Ausgabeform (S2 → S3, S5 → S6).

| Stufe | Mechanismus | Ausgabe des Modells | LLM-Calls | Tag-Quelle `f1` |
|---|---|---|---|---|
| S0 | Baseline: Aufgabe plus die drei geforderten Teile | freier Code | 1 | Code-Lexikon |
| S1 | + **Spezifikation**: erlaubte Sounds und Funktionen mit Wertebereich | freier Code | 1 | Code-Lexikon |
| S2 | + **Few-Shot**: Intent-Klassifikation → 3 ähnlichste Library-Patterns je Spur als Code-Beispiele | freier Code | 2 | Code-Lexikon |
| S3 | + **Zwang**: JSON-Auswahl von Pattern-IDs (Schema), deterministischer Compiler | JSON → Compiler | 1 + Spuren | Pattern-IDs |
| S4 | + **Musikalische Chain-of-Thought**: Pflichtfeld `reasoning` vor `selectedId` | JSON → Compiler | 1 + Spuren | Pattern-IDs |
| S5 | + **GraphRAG**: Graph-Reranking der Kandidaten + Graph-Kontext | JSON → Compiler | 1 + Spuren | Pattern-IDs |
| S6 | **Formular + Übersetzer**: Modell füllt ein Techno-Formular, Compiler erzeugt Code mit gemeinsamer Tonart | JSON-Formular → Compiler | 2 | Code-Lexikon |

Hauptmaß der Treue ist in allen Stufen `f1Code` (Abschnitt 4); die Spalte nennt die ergänzend berichtete Tag-Quelle.

### 2.1 Geforderte Teile (alle Stufen)

Jede Stufe erzeugt **drei Teile**: Drums (mindestens Kick und Hihats), Bass und einen melodischen Teil (Stab oder Lead). Ohne melodischen Teil ist Harmonie nicht messbar.
- S0–S2: Die Aufgabenbeschreibung im Systemprompt nennt die drei Teile.
- S3–S5: Die Spuren sind fest `drums, bass, melody` (Reihenfolge `PILLAR_NAMES`), unabhängig von `intent.layers`.
- S6: Das Formular enthält die drei Teile per Konstruktion.

### 2.2 Stufen im Detail

**S0 Baseline.** Systemprompt:
> You are a live-coding assistant for Strudel (strudel.cc), a JavaScript pattern language for music. Write a techno loop in Strudel for the user's request with three parts: drums (kick and hi-hats), a bassline, and a melodic part (stab or lead). Output ONLY the Strudel code — no prose, no markdown fences, no comments.

Kein JSON-Schema. Nachbearbeitung (identisch für S0–S2): erster Code-Fence-Block, falls vorhanden, sonst der getrimmte Text.

**S1 Spezifikation** (statisch, für jeden Prompt gleich, daher kein Intent-Call). Der S0-Systemprompt wird ergänzt um:
- erlaubte Sounds: Drum-Samples, die in **beiden** Bänken existieren (`bd sd cp hh oh rim lt mt ht`), nur mit `.bank("RolandTR909")` oder `.bank("RolandTR808")`; Synths für `note()`/`n()`: `sine square triangle sawtooth`
- Kernfunktionen ohne Wertebereich: `s, note, n, stack, cat, seq, bank, scale, fast, slow, gain, setcpm`
- alle `METHOD_CARDS` aus `src/library/strudelDocs.js` als Zeile `name(sig): min–max — note`

Begründung: formale Zielsprachspezifikation im Kontext (Text2DSL, arXiv:2606.22586). Mini-Notation-Grammatik wird bewusst nicht mitgegeben (Kontextlänge für 7B).

**S2 Few-Shot.**
1. `buildIntent(prompt)`: LLM-Klassifikation plus deterministischer Lexer. Hier beginnt der Intent-Call, weil die Beispielauswahl ihn braucht.
2. Spuren = `drums, bass, melody` (Abschnitt 2.1).
3. Je Spur die 3 bestplatzierten Patterns aus `rankPatternsByIntent` als Beispiel: `[pillar] id (tags): code`.
4. Systemprompt = S1-Prompt + Beispielblock („adapt or combine; one layer per part, combined with stack(...)“).

Begründung: Beispiele schlagen bei Low-Resource-Sprachen oft reine Dokumentation (arXiv:2509.19931, 2606.16827). Gegenbefund: CangjieBench (2603.14501).

**S3 Zwang** (= bestehender Prototyp).
1. `buildIntent` wie in S2, Spuren `drums, bass, melody`.
2. Je Spur nacheinander `generateTransformationPlan`: Katalog = Top-8 aus `rankPatternsByIntent`, JSON-Schema `{selectedId ∈ Katalog, explanation, modifications}`. Frühere Auswahlen gehen als Kohäsionskontext an spätere Spuren.
3. `compileTrack` je Spur, dann `stack(...)`. Scheitert eine Spur, entfällt sie. Scheitern alle, ist der Code `null`.

**Bewusster Kontextwechsel S2 → S3:** Ab S3 schreibt das Modell keinen Code mehr. Es sieht die Kandidaten (id, name, tags) aus **demselben** Retrieval. Der Unterschied S2 → S3 misst den Effekt des Zwangs.

**Bekannte Eigenschaft von S3–S5:** Die Library-Patterns stehen in unterschiedlichen Tonarten (Bass u. a. C, E-Moll, A-Moll, D-Phrygisch; Melodie u. a. Fis-Moll, Gis-Moll) und werden je Spur unabhängig gewählt. Harmonische Konflikte sind daher erwartbar. Die Harmonie-Messung macht das sichtbar; die Bibliothek wird dafür bewusst **nicht** bereinigt.

**S4 Chain-of-Thought.** Wie S3, das Schema bekommt `reasoning` als erstes Pflichtfeld. Die Regel im Prompt fordert 2–4 Sätze zu Unterart, Tempo und Groove vor der Wahl.

**S5 GraphRAG.** Wie S4, plus kuratierter Graph:
- Knotentypen Unterart, Tempo-Band, Pattern, Strudel-Funktion; **ausschließlich** die Kanten Unterart–Tempo, Tempo–Pattern, Pattern–Funktion
- Unterart-Knoten = die 7 Unterarten aus Abschnitt 4.1, mit Szene-Aliasen (z. B. detroit: „motor city“, „underground resistance“; hypnotic: „berghain“, „4 uhr morgens“; dub: „basic channel“, „chain reaction“). Das ist der Einstieg für Prompts ohne Schlagworttreffer.
- Tempo-Bänder: 115–124, 125–129, 130–134, 135–150 BPM. Jede Unterart hat ein Standardtempo (Tabelle in 2.3).
- Pattern–Tempo-Kanten aus den Tags der Patterns; Patterns ohne Unterart-Tag erhalten 130–134.
- Seeds: Unterarten, deren Aliase im Prompt vorkommen, sonst das Intent-Genre. Explizite BPM-Angabe → das passende Band.
- Ranking: Tag-Score + Anzahl verbundener Seed-Bänder, Top-8 werden zum Katalog. Kontexttext im Systemprompt: Unterart → Bänder, Top-5-Patterns, typische Funktionen.

### 2.3 S6 Formular + Übersetzer

**Übernommen von S5:** Intent-Call, der Graph-Kontexttext (Unterart → Tempo, typische Funktionen) und das Pflichtfeld `reasoning` als erstes Formularfeld.
**Ersetzt:** die Auswahl aus dem Katalog. Das Modell sieht keine Library-Patterns mehr, sondern füllt ein Formular. Das ist der zweite bewusste Wechsel der Ausgabeform; der Unterschied S5 → S6 misst den Effekt der strukturierten Zwischenrepräsentation.

**Formular (JSON-Schema, alle Felder Pflicht):**

| Feld | Typ | Bedeutung |
|---|---|---|
| `reasoning` | string | 2–4 Sätze zu Unterart, Groove, Stimmung |
| `subgenre` | enum (7 Unterarten) | bestimmt das Tempo |
| `key` | enum C … B (12) | Grundton |
| `scale` | enum `minor, phrygian, dorian` | Tonleiter |
| `bassA`, `bassB` | string, 16 Zeichen | Ziffer 0–7 = Tonleiterstufe, `.` = Pause |
| `hat`, `openhat`, `clap` | string, 16 Zeichen | `x` = Schlag, `.` = Pause |
| `stab` | string, 16 Zeichen | Ziffer 0–7 = Akkord-Grundstufe, `.` = Pause |
| `bassSound` | enum `sawtooth, square, sine` | |
| `bassCutoff` | int 200–1500 | Tiefpass Bass |
| `bassResonance` | int 0–20 | Resonanz Bass |
| `stabSound` | enum `sawtooth, square, triangle` | |
| `effect` | enum `filter_sweep, delay_throw, reverb_wash, none` | genau ein Bewegungseffekt |
| `effectAmount` | int 0–10 | Stärke |

**Übersetzer (deterministisch, garantiert gültiger Code):**
- Kick fest `s("bd*4").bank("RolandTR909")`; Tempo `setcpm(bpm/4)` aus der Unterart: acid 132, detroit 130, dub 120, hypnotic 128, industrial 138, minimal 125, peak-time 134.
- Bass: `n("<[A] [A] [A] [B]>").scale("<key>1:<scale>")`, Muster A-A-A-B, Oktave 1, Hüllkurve kurz.
- Stab: jede Ziffer `d` wird zum Dreiklang `[d,d+2,d+4]`, `.scale("<key>3:<scale>")`, Oktave 3.
- Hihats mit leichter Lautstärkebewegung (`perlin`), Open-Hat und Clap aus den Rastern, alle `.bank("RolandTR909")`.
- Effekt: `filter_sweep` → Bass-Tiefpass als langsame Sinusfahrt über 8 Takte; `delay_throw` → punktiertes Achtel-Delay auf dem Stab; `reverb_wash` → Hall auf dem Stab; Stärke skaliert die Parameter.
- Werte außerhalb des Schemas werden geklemmt, unbekannte Zeichen als Pause gelesen.
- **Ersatzmuster:** Hat `bassA` weniger als 3 Noten, setzt der Übersetzer ein Offbeat-Muster auf Stufe 0 ein; hat `stab` keine Note, einen Akkord auf Schritt 7. Jeder Ersatz wird im Lauf protokolliert (`fallbacks`) und je Stufe als Rate berichtet.

**Beispiel im Prompt:** ein festes ausgefülltes Formular („dark rolling techno“) mit dem Hinweis „Do not copy the example“. Der Spike zeigte, dass Hihat- und Clap-Raster trotzdem nahezu kopiert werden; das wird als Risiko diskutiert und über die Diversität je Formularfeld (Abschnitt 4) sichtbar gemacht.

**Ersetzt den LayerSpec-Plan** vom 06.07.2026 (Tasks 7–13); dieser wird nicht weiterverfolgt.

## 3. Konstanten (Konstanthaltung)

| Größe | Wert |
|---|---|
| Modell | `qwen2.5:7b`, Digest wird protokolliert |
| Temperatur | 0.7, konstant über alle Stufen |
| Seed | `1000 + rep`, gleich über Stufen und Prompts einer Wiederholung (gepaartes Design) |
| `num_predict` | 1024, für alle Stufen gleich |
| Wiederholungen | 10 |
| Läufe gesamt | 7 Stufen × 40 Prompts × 10 = **2.800** |
| Reihenfolge | Wiederholung → Prompt → Stufe (Drift trifft alle Stufen gleich) |

Die App-Defaults (`temperature 0`, `seed 42`, `num_predict 200`) bleiben unverändert. Alle neuen Parameter sind optional.

## 4. Messgrößen

- **Validität:** Der Code wird headless in Node ausgewertet. Fehlerklassen gemäß Exposé: `syntax`, `unknown_function`, `unknown_sound`. Zusätzlich berichtet: `empty`, `forbidden` (AST-Sicherheitsprüfung vor jeder Auswertung), `runtime`, `no_pattern`, `silent`. Gültig heißt: keine Fehlerklasse. Für die Klassifikation wird Takt 0–1 abgefragt.
- **Abfragefenster für Inhalte:** Lexikon und Harmonie werten **4 Takte** (`queryArc(0, 4)`) aus, damit Bass-Variation (A-A-A-B) und Akkordwechsel mitzählen.
- **Semantische Treue:** Precision, Recall und F1 der gelieferten gegenüber den erwarteten Tags im Vokabular (4.1). Berechnet über alle Läufe, deren Code ausführt (gültig, `unknown_sound`, `silent`).
  - **`f1Code` (Hauptmaß):** Tags aus dem Code-Lexikon für **alle** Stufen. Gleiches Messinstrument für jede Stufe.
  - `f1` (ergänzend): Tag-Quelle laut Tabelle in Abschnitt 2 (S3–S5 Pattern-IDs).
- **Harmonische Kohärenz** (über alle tonalen Ereignisse der 4 Takte, ohne Spurzuordnung, daher für freien Code genauso anwendbar):
  - **Tonartkonsistenz:** Anteil der Töne, die in der bestpassenden diatonischen Tonleiter liegen (12 Kandidaten; deckt Dur, Moll, Dorisch, Phrygisch ab). 1 = alles in einer Tonart.
  - **Reibungsrate:** Anteil gleichzeitig klingender Tonpaare mit Intervallklasse 1 (Halbton/große Septime) oder 6 (Tritonus). 0 = keine Reibung.
  - **Tiefenenge:** Anteil gleichzeitig klingender Tonpaare, deren tieferer Ton unter C3 (MIDI 48) liegt und die weniger als 12 Halbtöne auseinanderliegen. 0 = kein Matsch im Bass.
  - Läufe mit weniger als 2 tonalen Ereignissen erhalten `NaN` und werden für diese Kennzahl ausgeschlossen.
- **Diversität:** normalisierte Shannon-Entropie über die Tag-Mengen der gültigen Wiederholungen je Prompt; der Anteil verschiedener Ergebnisse wird ergänzend berichtet. Für S6 zusätzlich je Formularfeld (z. B. `hat`, `bassA`), um Kopiereffekte des Beispiels zu erkennen.
- **Latenz und Aufwand:** Wall-Clock von `stage.run` (alle LLM-Calls plus Kompilierung, ohne Validierung). Median und P95, Miller-Bänder ≤ 2 s und ≤ 10 s, Prompt- und Ausgabe-Tokens laut Ollama.
- **S6-spezifisch:** Ersatzmuster-Rate (Anteil der Läufe mit mindestens einem `fallback`).
- **Auswertung:** Statistische Einheit sind Aggregate je Prompt (40 pro Stufe). Paarweiser Bootstrap zwischen benachbarten Stufen sowie zusätzlich **S2 ↔ S6** und **S5 ↔ S6** (bestes freies bzw. bestes Auswahlverfahren gegen das Formular), 10.000 Resamples, fester Seed. Substanziell heißt: Das KI schließt 0 aus **und** |Δ| ≥ vorab gesetzter Schwelle (Validität 0.05, `f1Code` 0.05, Entropie 0.05, Tonartkonsistenz 0.05, Reibungsrate 0.05, Tiefenenge 0.05, Latenz 500 ms). Auswertung zusätzlich je Prompt-Kategorie.

### 4.1 Vokabular

| Kategorie | Tags |
|---|---|
| Unterart (7) | acid, detroit, dub, hypnotic, industrial, minimal, peak-time |
| Charakter (12) | dark, driving, warm, gritty, spacious, glitchy, sparse, dense, metallic, deep, dissonant, evolving |
| Element (11) | kick, bass, sub, hats, clap, percussion, lead, chords, arp, pad, fx |

Library-Tags werden über eine feste Abbildung auf dieses Vokabular normalisiert (`techno` allein ergibt kein Unterart-Tag).

### 4.2 Code-Lexikon (Erweiterung)

Zusätzlich zu den bestehenden Regeln (Elemente, dark, spacious, gritty, acid, glitchy, dense, sparse):
- **Tempo** aus `setcpm(x)` bzw. `setcps(x)` im Code (BPM = cpm × 4 bzw. cps × 240); ohne Angabe gilt Strudels Standard (120 BPM).
- **Unterart-Regeln** (feste Schwellen, vor dem Einfrieren des Korpus festgelegt):
  - acid: Resonanz ≥ 10 auf Sägezahn/Rechteck (wie bisher)
  - dub: Akkorde (≥ 3 gleichzeitige Töne) **und** Hall oder Delay ≥ 0.4
  - industrial: gritty **und** Tempo ≥ 135
  - peak-time: Tempo 130–134 **und** dense
  - minimal: sparse **und** keine Akkorde
  - hypnotic: Bass wiederholt dasselbe Muster in mindestens 3 der 4 Takte
  - detroit: Akkorde **und** warm (Tiefpass ≥ 1200 Hz auf einer Akkordspur) **und** Tempo 125–132
- **driving:** Kick auf allen Vierteln **und** Hihats auf mindestens 4 Offbeats

Unterarten bleiben grob ableitbar; das wird als Validitätsrisiko diskutiert.

## 5. Datengrundlage

40 selbst erstellte **Techno**-Prompts in 4 Kategorien zu je 10:
- `direct_hit`: Unterart genannt („Acid-Techno mit 303-Bassline“)
- `alias`: nur Szene- oder Ortsbegriffe ohne Unterart („klingt nach Berghain um 6 Uhr“). Testfeld für S5.
- `structure`: Wünsche zum Aufbau („Bass wechselt alle vier Takte“, „nur Kick, Bass und ein Stab“)
- `underspecified`: vage Anfragen („mach was Dunkles“)

Die erwarteten Tags werden in zwei zeitlich getrennten Durchgängen (≥ 7 Tage Abstand) annotiert, abgeglichen und vor dem ersten Messlauf per SHA-256 eingefroren. Berichtet werden Cohens κ und der mittlere Jaccard-Wert. Der Korpus wird vom Autor geschrieben, nicht generiert.

## 6. Nicht im Umfang

- Andere Genres als Techno
- UI-Änderungen. Eine optionale „Lab-Ansicht“ kommt frühestens nach dem Messlauf.
- Validate→Repair-Schleifen. Bei 7B ist Blind-Resampling gleichwertig (arXiv:2607.26117), daher nur Ausblick.
- Grammatikgeführtes Decoding, Fine-Tuning (fehlende mehrspurige Trainingsdaten; löst das Abstimmungsproblem zwischen Spuren nicht), Modellvergleich
- Systematische Hörstudie. Der Playtest am 03.12.2026 kann optional als qualitative **Demonstration** im Sinne von Design Science Research dienen (Beobachtungen und Zitate, keine Statistik).
- Bereinigung der Library-Tonarten (würde den gemessenen Effekt verdecken)

## 7. Validitätsrisiken (für die Diskussion)

- Headless ≠ Browser: REPL-Funktionen (`$:`, `setcpm`, Visualisierungen) werden nachgebildet.
- Das Code-Lexikon erkennt nur einen Teil des Vokabulars und Unterarten nur grob. Deshalb ist `f1Code` das Hauptmaß (gleiches Instrument für alle Stufen); `f1` wird ergänzend berichtet.
- Harmonie-Kennzahlen sind theoriebasiert (Tonleiter, Intervallklassen, Register) und nicht an menschlichem Urteil validiert.
- Das S6-Beispiel prägt die Ausgabe stark (Spike-Befund). Diversität je Formularfeld macht das sichtbar.
- Vokabular, Lexikon-Schwellen, Graph, Formular, Korpus und Relevanzschwellen sind vom Autor gesetzt und werden vollständig dokumentiert.
- Die Kontextwechsel S2 → S3 und S5 → S6 sind konstruktionsbedingt (Abschnitt 2.2, 2.3).

## 8. Nötige Exposé-Anpassungen

- Genre-Fokus Techno als Fallstudie begründen
- Stufentabelle auf 7 Stufen (S0–S6) erweitern
- 2.000 → 2.800 Läufe; 4 → 5 Messgrößen (Harmonie)
- „Die Zwangsstufe S3 entspricht dem bestehenden Prototyp.“
- Intent-Klassifikation ab S2
- Mit dem Betreuer abstimmen

## 9. Auswirkungen auf den bestehenden Prüfstand (S0–S5 bereits umgesetzt)

**Anpassen:** Vokabular (4.1) und Library-Tag-Abbildung; Code-Lexikon (4.2) und Abfrage über 4 Takte; Systemprompts S0–S2 (drei Teile, Techno); feste Spuren `drums, bass, melody` in S2–S5; Graph auf Unterarten und neue Tempo-Bänder; Konfiguration (7 Stufen, neue Schwellen); Korpus-Schema (Kategorie `alias` statt `genre_no_hit`); Auswertung (7 Stufen, zusätzliche Vergleiche, Harmonie, S6-Kennzahlen).
**Neu:** S6 (Formular, Übersetzer, Ersatzmuster-Protokoll); Harmonie-Modul; Diversität je Formularfeld.

## 10. Herkunft der Revision 2

Drei Wegwerf-Spikes (nicht im Repo) mit `qwen2.5:7b`:
1. Formular mit Ja/Nein- und Zahlenlisten, 8 Genres: 8/8 gültig, 100 % in der Tonart, aber Bass und Melodie meist leer, 35–45 s je Antwort.
2. Kompakte 16-Zeichen-Raster, ein Beispiel, akkordfolgende Spuren: 15–25 Töne je Takt, 10–18 s; Genre, Tempo und Kick-Muster oft unpassend.
3. Techno-Formular wie in 2.3, 4 Prompts: 4/4 gültig, 100 % in der Tonart, 12–22 s; Bass-Variation A/B sinnvoll, Effekte passend; Hihat-/Clap-Raster aus dem Beispiel kopiert. Vom Autor als tragfähige Grundlage bewertet.

## 11. Nebenbefund aus der Vorbereitung

Eine headless Prüfung der 58 Library-Patterns ergab: 8 Percussion-Patterns verwendeten `oh`, `rim` und `ride` ohne `.bank()`. Behoben in Commit `963651e`.
