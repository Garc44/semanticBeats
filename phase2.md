# Strudel Semantic Music Assistant — Refactor Plan

## Context

Current architecture already exists:

- Vite single-page app
- Ollama local model
- `classifyIntent()`
- `generateCode()`
- `autoFixCode()`
- Strudel live patching
- preview/apply flow

Current issue:
The LLM hallucinates Strudel syntax and over-rewrites code.

---

# Goal

Move from:

```txt
LLM generates raw Strudel code
```

toward:

```txt
LLM plans transformations
Application safely applies them
```

The LLM should become:
- semantic interpreter
- transformation planner

NOT:
- unrestricted code generator

---

# New Architecture

```txt
User Input
  ->
Intent Classification
  ->
Structured Transformation Plan (JSON ONLY)
  ->
Deterministic Patch Engine
  ->
Validation
  ->
Strudel Runtime
```

---

# Main Design Principle

```txt
LLM = semantic planner
Application code = execution engine
```

---

# Refactor Goals

## 1. Remove full code generation

The LLM should NO LONGER generate complete Strudel tracks.

Instead it should return STRICT JSON plans.

Example:

```json
{
  "target": "bass",
  "operations": [
    {
      "type": "increase_resonance",
      "amount": 0.3
    },
    {
      "type": "add_distortion",
      "amount": 0.2
    }
  ],
  "preserve": [
    "rhythm",
    "tempo",
    "structure"
  ]
}
```

---

# Phase 1 Tasks

## Task 1 — Create strict operation vocabulary

Create:

```js
const ALLOWED_OPERATIONS = [
  "increase_resonance",
  "decrease_cutoff",
  "add_delay",
  "add_distortion",
  "increase_density",
  "simplify_pattern",
  "increase_reverb",
  "reduce_reverb",
  "increase_filter_motion"
]
```

The LLM may ONLY use these operations.

No invented operations allowed.

---

## Task 2 — Refactor classifyIntent()

Requirements:

- MUST return strict JSON only
- NO prose
- NO explanations
- NO markdown
- ONLY allowed operations
- return `null` on invalid JSON
- gracefully fail on malformed responses

Example return:

```json
{
  "target": "bass",
  "operations": [
    {
      "type": "increase_resonance",
      "amount": 0.4
    }
  ],
  "preserve": [
    "rhythm",
    "tempo"
  ]
}
```

---

## Task 3 — Create patchEngine.js

New module:

```txt
src/patchEngine.js
```

Responsibilities:

- receive current Strudel code
- receive transformation JSON
- deterministically modify code
- preserve structure where possible
- NEVER fully rewrite tracks

Example API:

```js
applyTransformation(code, plan)
```

Internal structure:

```js
applyOperation(code, operation)
```

Each operation should have isolated deterministic logic.

---

## Task 4 — Add validation layer

Validation should happen BEFORE `play()`.

Create:

```txt
src/validate.js
```

Validation checks:

- balanced parentheses
- no markdown fences
- only allowed Strudel functions
- no obviously broken syntax
- non-empty code

Example API:

```js
validateCode(code)
```

Return:

```js
{
  valid: true,
  errors: []
}
```

---

## Task 5 — Refactor generateCode()

Replace:

```js
generateCode()
```

with:

```js
generateTransformationPlan()
```

New responsibility:
ONLY return structured JSON plans.

No raw Strudel generation.

---

## Task 6 — Keep autoFixCode() temporarily

Keep current auto-fix flow as fallback only.

Goal:
Eventually reduce failures enough that auto-fix becomes rare.

---

# Suggested Module Structure

```txt
src/
  llm/
    classifyIntent.js
    generateTransformationPlan.js
    autoFixCode.js
    prompts.js

  music/
    patchEngine.js
    operations.js
    validate.js

  strudel/
    play.js

  ui/
    preview.js
```

---

# Important Constraints

DO NOT add:

- LangChain
- agents
- vector DB
- embeddings
- TypeScript
- Docker
- backend framework changes
- unnecessary abstractions

Keep:
- modular
- readable
- hackable
- lightweight

---

# Important Behavioral Constraints

The patch engine should:

- preserve rhythm where possible
- preserve structure where possible
- preserve tempo unless requested
- prefer minimal edits
- avoid destructive rewrites

The system should feel like:

```txt
conversational live coding augmentation
```

NOT:

```txt
autonomous AI composer
```

---

# Refactor Deliverables

Please:

1. Plan the refactor
2. Suggest clean module boundaries
3. Implement `patchEngine.js`
4. Implement strict JSON prompting
5. Implement validation layer
6. Refactor current flow safely
7. Preserve existing preview/apply UX
8. Keep live hot-patching intact
9. Explain all architectural decisions briefly