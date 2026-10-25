# Evaluation harness — "Vom Prompt zum Beat"

Measures how stacked control stages affect a local `qwen2.5:7b` generating **techno** in Strudel.
Design: `docs/superpowers/specs/2026-10-12-creative-harness-stage-model-design.md` (Revision 2). All constants: `eval/config.js`.

## Stages
| Stage | Mechanism | Module | `f1` tags from |
|---|---|---|---|
| S0 | task (three techno parts) → code | `stages/s0.js` | code lexicon |
| S1 | + specification (allowed sounds, functions with ranges) | `stages/s1.js` | code lexicon |
| S2 | + few-shot (top-3 library patterns for drums, bass, melody) | `stages/s2.js` | code lexicon |
| S3 | + constraint: JSON pattern-id selection → compiler | `stages/s3.js` | pattern ids |
| S4 | + musical chain-of-thought | `stages/s4.js` | pattern ids |
| S5 | + GraphRAG (subgenre ↔ tempo ↔ pattern ↔ function) | `stages/s5.js` | pattern ids |
| S6 | form + compiler: model fills a techno form, `s6/compiler.js` writes the code (shared key, fixed 4/4 kick, A-A-A-B bass) | `stages/s6.js` | code lexicon |

Every stage produces drums, bass and a melodic part. The main fidelity measure is `f1Code` (code lexicon for all stages).

## Run
```bash
OLLAMA_ORIGINS="*" ollama serve
npm run eval:freeze                                   # once, after both annotation passes
npm run eval -- --out eval/results/full-YYYY-MM-DD.jsonl
npm run eval:analyze -- eval/results/full-YYYY-MM-DD.jsonl
```
Runs resume automatically; crashes land in `*.errors.jsonl` and are retried.
`eval/corpus/prompts.json` currently holds 4 sample prompts; the author replaces it with the 40 real prompts (categories `direct_hit`, `alias`, `structure`, `underspecified`).

## Metrics
- **Validity**: `checkValidity` on bar 0. Classes `syntax`, `unknown_function`, `unknown_sound` (exposé) plus `empty`, `forbidden`, `runtime`, `no_pattern`, `silent`.
- **Content window**: lexicon and harmony read bars 0–4 (`EVAL_CONFIG.contentCycles`).
- **Fidelity**: P/R/F1 vs frozen expected tags over executing runs. `f1Code` = code lexicon for every stage (main); `f1` = per-stage source. Open-ended prompts (`openEnded: true`, `expected: []`, currently u08) have no expectation: excluded from fidelity and from annotation agreement, kept for all other metrics.
- **Harmony** (`harmony.js`): in-key share (best of 12 diatonic sets), clash rate (simultaneous interval class 1 or 6), low crowding (simultaneous pairs below C3 within an octave).
- **Diversity**: normalised entropy of tag sets over valid runs; for S6 also per form lane.
- **S6**: fallback rate (compiler replaced a thin bass or empty stab).
- **Latency**: wall clock of `stage.run`, median + p95, Miller bands; tokens from Ollama.
- **Statistics**: per-prompt aggregates, paired bootstrap (10,000, seeded) for adjacent stages plus S2↔S6 and S5↔S6; substantial = CI excludes 0 and |Δ| ≥ `THRESHOLDS`.

## Known validity threats (discuss in thesis)
- Headless ≠ browser: REPL features are emulated in `strudelHeadless.js`.
- The code lexicon recognises only part of the vocabulary and subgenres only roughly (rules in `codeLexicon.js`).
- Harmony metrics are theory-based, not validated against listeners.
- The S6 example form strongly shapes the output (lane entropy shows it).
- Vocabulary, lexicon thresholds, graph, form, corpus and thresholds are set by the author.
