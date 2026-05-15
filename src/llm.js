const CLASSIFY_SYSTEM_PROMPT = `You are a music intent classifier for Strudel live-coding.
Given current code and a user request, return ONLY a JSON object. No explanation. No markdown.

JSON format:
{"interpretation":"precise description of what to change","strudelFunctions":["fn1","fn2"],"preserve":["element1"]}

Vocabulary hints:
darker/warmer → lpf, room
brighter/airier → hpf, fast
punchier/harder → gain, crush
spacious/wide → room, pan
slower/half time → slow
faster/double time → fast
quieter → gain reduce
louder → gain increase
more groove → euclidean rhythms
busier/more notes → fast, repeat`;

const SYSTEM_PROMPT = `You are a Strudel live-coding music assistant. Strudel uses mini-notation inside JS functions.

SOUNDS
s("bd sd hh cp")        -- drum samples (bd=kick, sd=snare, hh=hihat, cp=clap)
note("c3 e3 g3")        -- pitched notes
n("0 2 4").s("piano")   -- sample index + instrument

MINI-NOTATION
"bd sd"         sequence
"bd*4"          repeat 4x
"[bd sd]*2"     group and repeat
"bd ~ sd ~"     ~ is a rest
"<bd sd>"       alternate each cycle
"bd(3,8)"       euclidean rhythm

COMBINING
stack(a, b, c)  -- play all simultaneously
cat(a, b)       -- play in sequence, one per cycle

EFFECTS (chain with dot notation)
.room(0-1)      reverb
.gain(0-2)      volume
.pan(-1 to 1)   stereo pan
.lpf(hz)        low-pass filter
.hpf(hz)        high-pass filter
.speed(n)       sample playback speed
.slow(n)        stretch pattern n times
.fast(n)        compress pattern n times
.delay(n)       echo
.crush(n)       bitcrush

EXAMPLE
stack(
  s("bd ~ bd ~"),
  s("~ sd ~ sd").room(0.3),
  s("hh*8").gain(0.5)
)

RULES
- Output ONLY valid Strudel JS. No markdown. No explanation. No backticks.
- Always preserve sounds not mentioned in the user request.
- Modify the provided code -- do not rewrite from scratch unless explicitly asked.
- Never add comments or blank lines outside the code.`;

export async function classifyIntent(currentCode, userPrompt) {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
          { role: 'user', content: `Current code:\n${currentCode}\n\nRequest: ${userPrompt}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function autoFixCode(brokenCode, errorMessage) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      messages: [
        {
          role: 'system',
          content: 'Fix the Strudel JS syntax error. Return only corrected code. No markdown. No explanation.',
        },
        {
          role: 'user',
          content: `Code:\n${brokenCode}\n\nError: ${errorMessage}`,
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').trim();
}

export async function generateCode(history, currentCode, userPrompt, classification = null) {
  let userContent;

  if (classification && Array.isArray(classification.strudelFunctions) && Array.isArray(classification.preserve)) {
    userContent = `Current code:\n${currentCode}\n\nDo exactly: ${classification.interpretation}\nUse: ${classification.strudelFunctions.join(', ')}\nPreserve: ${classification.preserve.join(', ')}\nRequest: ${userPrompt}`;
  } else {
    userContent = `Current code:\n${currentCode}\n\nRequest: ${userPrompt}`;
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userContent },
  ];

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      messages,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').trim();
}
