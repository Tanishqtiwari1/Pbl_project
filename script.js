const API_URL = "http://localhost:5001";

let recognition;

function startVoice() {
    console.log("VOICE STARTED");  
    console.log("SCRIPT CONNECTED");
    alert("Mic Starting");
    alert("SCRIPT FILE IS RUNNING");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return alert("Use Chrome browser");

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.start();

    recognition.onresult = async (event) => {
        const text = event.results[event.results.length - 1][0].transcript.toLowerCase();

        document.getElementById("voiceText").innerText = "You said: " + text;

        const res = await fetch(API_URL + "/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: text })
        });

        const data = await res.json();

        document.getElementById("actionText").innerText = data.action;

        // HAND ANIMATION
        const handImg = document.getElementById("handImage");

if(text.match(/open/)){
    handImg.src = "hand/open.png";
}
else if(text.match(/close/)){
    handImg.src = "hand/close.png";
}

        loadHistory();
    };
}

async function loadHistory() {
    const res = await fetch(API_URL + "/history");
    const history = await res.json();

    const list = document.getElementById("historyList");
    list.innerHTML = "";

    history.reverse().forEach(cmd => {
        const li = document.createElement("li");
        li.innerText = cmd;
        list.appendChild(li);
    });
}