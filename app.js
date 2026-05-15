import { initStrudel, samples } from '@strudel/web'; // Wichtig: 'samples' hier mit importieren

let strudelEngine;

async function startEngine() {
    try {
        // Wir definieren die Samples manuell, damit es keine Missverständnisse gibt
        const mySamples = {
            bd: 'https://raw.githubusercontent.com/strudeljs/strudel-examples/main/public/samples/drums/bd.wav',
            hh: 'https://raw.githubusercontent.com/strudeljs/strudel-examples/main/public/samples/drums/hh.wav',
            sd: 'https://raw.githubusercontent.com/strudeljs/strudel-examples/main/public/samples/drums/sd.wav',
            cp: 'https://raw.githubusercontent.com/strudeljs/strudel-examples/main/public/samples/drums/cp.wav'
        };

        strudelEngine = await initStrudel({
            samples: mySamples
        });
        
        console.log("Engine mit expliziten Samples geladen!");
        document.getElementById('status').innerText = "Bereit mit Drums!";
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

startEngine();

const editor = document.getElementById('editor-container');
const playBtn = document.getElementById('playBtn');

playBtn.addEventListener('click', () => {
    if (!strudelEngine) return;

    // Wir holen uns evaluate direkt aus der Engine
    const evaluate = strudelEngine.evaluate;

    if (playBtn.innerText === 'Play') {
        // WICHTIG: Wir übergeben die Funktionen der Engine als zweiten Parameter,
        // damit 'osc', 's' etc. im Code bekannt sind.
        evaluate(editor.innerText, strudelEngine); 
        playBtn.innerText = 'Stop';
    } else {
        strudelEngine.stop();
        playBtn.innerText = 'Play';
    }
});

// KI Logik (Ollama)
async function callOllama(userPrompt, currentCode) {
    const status = document.getElementById('status');
    status.innerText = "KI denkt nach...";
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5-coder:7b',
                prompt: `Du bist ein Strudel-Musik-Bot. 
                Aktueller Code: ${currentCode}
                Aufgabe: ${userPrompt}
                Antworte NUR mit dem validen JS-Code.`,
                stream: false
            })
        });
        const data = await response.json();
        return data.response.replace(/```javascript|```/g, "").trim();
    } catch (err) {
        status.innerText = "Ollama Fehler! (CORS oder Server aus?)";
        console.error(err);
    }
}

document.getElementById('sendBtn').addEventListener('click', async () => {
    const newCode = await callOllama(document.getElementById('prompt').value, editor.innerText);
    if (newCode) {
        editor.innerText = newCode;
        strudelEngine.evaluate(newCode, strudelEngine);
    }
});