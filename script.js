const API_URL = "http://localhost:5001";
let recognition;

function startVoice() {
    console.log("VOICE STARTED");  
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return alert("Use Chrome browser");

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = async (event) => {
        const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
        
        // Update UI Text
        const voiceElem = document.getElementById("voiceText");
        const actionElem = document.getElementById("actionText");
        if(voiceElem) voiceElem.innerText = "You said: " + text;

        const res = await fetch(API_URL + "/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: text })
        });

        const data = await res.json();
        if(actionElem) actionElem.innerText = data.action;

        // FIXED HAND ANIMATION LOGIC
        const handImg = document.getElementById("handImage");
        if (handImg) {
            // Updated paths to ensure they point to where your images are stored
            if (text.includes("open")) {
                handImg.src = "hand/open.png"; 
            } else if (text.includes("close")) {
                handImg.src = "hand/close.png";
            }
        }

        loadHistory();
    };
}

async function loadHistory() {
    try {
        const res = await fetch(API_URL + "/history");
        const history = await res.json();
        const list = document.getElementById("historyList");
        if(!list) return;

        list.innerHTML = "";
        history.reverse().forEach(cmd => {
            const li = document.createElement("li");
            li.className = "history-item"; // Matches your CSS
            li.innerText = cmd;
            list.appendChild(li);
        });
    } catch (err) {
        console.error("History sync failed:", err);
    }
}