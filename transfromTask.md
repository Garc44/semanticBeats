Please refactor my current Strudel music application (`app.js`) to implement a modular "Slot-based" architecture (RAG-Light approach). 

Requirements for the refactor:

1. STATE MANAGEMENT:
Introduce a `trackState` object to manage three independent musical layers:
- drums: 's("bd [hh*4] sd [hh*2]")'
- bass: 'note("0 3 5 7").s("saw").lpf(500)'
- lead: 'note("~ c4 ~ e4").s("sine").room(0.5)'

2. RENDERING LOGIK:
Create a `renderMusic()` function that combines all active slots using `stack()` and executes them via `strudelEngine.evaluate()`. This function should be called whenever a slot is updated.

3. SMART AI INTEGRATION (Ollama):
Modify the AI request logic:
- Before sending the request, detect which slot is targeted based on the user's input keywords (e.g., if "bass" is mentioned, target the 'bass' slot; otherwise, default to 'drums').
- Send ONLY the code of the targeted slot to the LLM.
- Use a System Prompt that instructs the AI to return ONLY the modified JavaScript code for that specific slot, without explanations or markdown formatting.

4. DYNAMIC UPDATING:
On receiving the AI response, update only the corresponding key in `trackState`, then trigger `renderMusic()` to patch the sound live without stopping the transport.

5. ERROR HANDLING:
Ensure the code cleans the AI response (removes backticks or "javascript" tags) before evaluating to prevent syntax errors.

Please provide the complete, refactored `app.js` code.